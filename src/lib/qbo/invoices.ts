import { qboRequest } from "./client";

/**
 * Encuentra el primer item de servicio activo en QBO.
 * Si no existe, crea uno default "Servicios EYAN".
 */
let cachedItemId: string | null = null;

export async function getDefaultServiceItemId(): Promise<string> {
  if (cachedItemId) return cachedItemId;

  const found = await qboRequest<{
    QueryResponse?: { Item?: Array<{ Id: string; Name: string; Type: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: { query: "SELECT * FROM Item WHERE Type = 'Service' MAXRESULTS 1" },
  });

  const existing = found.QueryResponse?.Item?.[0];
  if (existing) {
    cachedItemId = existing.Id;
    return existing.Id;
  }

  // Crear item default. Necesita IncomeAccountRef → buscar primer Income Account
  const accounts = await qboRequest<{
    QueryResponse?: { Account?: Array<{ Id: string; AccountType: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: { query: "SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 1" },
  });
  const incomeAccount = accounts.QueryResponse?.Account?.[0];
  if (!incomeAccount) {
    throw new Error("No se encontró una cuenta Income en QBO. Crea una primero.");
  }

  const created = await qboRequest<{ Item: { Id: string } }>({
    method: "POST",
    path: "/v3/company/{realmId}/item",
    body: {
      Name: "Servicios EYAN",
      Type: "Service",
      IncomeAccountRef: { value: incomeAccount.Id },
    },
  });

  cachedItemId = created.Item.Id;
  return created.Item.Id;
}

/**
 * QBO tiene hasta 3 custom fields en formularios de venta. Buscamos el
 * DefinitionId del campo "ORDEN COMPRA" en Preferences para poder
 * setearlo en la factura. Cache: undefined=sin consultar, null=no
 * existe, string=DefinitionId.
 */
let cachedOcFieldId: string | null | undefined = undefined;

export async function getOrdenCompraFieldId(): Promise<string | null> {
  if (cachedOcFieldId !== undefined) return cachedOcFieldId;

  try {
    const prefs = await qboRequest<{
      Preferences?: {
        SalesFormsPrefs?: {
          CustomField?: Array<{
            CustomField?: Array<{
              Name?: string;
              StringValue?: string;
            }>;
          }>;
        };
      };
    }>({ path: "/v3/company/{realmId}/preferences" });

    const groups = prefs.Preferences?.SalesFormsPrefs?.CustomField ?? [];
    for (const g of groups) {
      for (const f of g.CustomField ?? []) {
        const m = f.Name?.match(/SalesCustomName(\d)/i);
        const val = (f.StringValue ?? "").trim().toUpperCase();
        if (m && val.includes("ORDEN") && val.includes("COMPRA")) {
          cachedOcFieldId = m[1];
          return cachedOcFieldId;
        }
      }
    }
  } catch {
    // Si Preferences falla, no bloquear la factura
  }

  cachedOcFieldId = null;
  return null;
}

export interface CreateInvoiceInput {
  customerId: string;
  consecutivo: string;       // # factura FEN, usado como DocNumber
  fecha: Date;
  monto: number;
  moneda: string;            // CRC, USD
  descripcion?: string;      // descripción de línea (servicio FEN)
  ordenCompra?: string;      // solo número, ej "KC-106" → campo QBO ORDEN COMPRA
  observacionesText?: string; // Observaciones FEN → va al PrivateNote
}

export interface CreatedInvoice {
  Id: string;
  DocNumber?: string;
  TotalAmt: number;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const itemId = await getDefaultServiceItemId();

  const txnDate = input.fecha.toISOString().slice(0, 10); // YYYY-MM-DD

  // PrivateNote = solo observación FEN (vacío si no hay). Máx 4000 chars.
  const privateNote = (input.observacionesText ?? "").slice(0, 4000);

  const body: Record<string, unknown> = {
    TxnDate: txnDate,
    // DocNumber = consecutivo FEN para que el # de factura QBO coincida
    // con FEN (máx 21 chars en QBO).
    DocNumber: input.consecutivo.slice(0, 21),
    CustomerRef: { value: input.customerId },
    PrivateNote: privateNote,
    Line: [
      {
        DetailType: "SalesItemLineDetail",
        Amount: input.monto,
        Description:
          input.descripcion || `Factura FEN #${input.consecutivo}`,
        SalesItemLineDetail: {
          ItemRef: { value: itemId },
          Qty: 1,
          UnitPrice: input.monto,
        },
      },
    ],
  };

  // Campo custom "ORDEN COMPRA" en QBO (solo el número, ej "KC-106")
  if (input.ordenCompra) {
    const ocFieldId = await getOrdenCompraFieldId();
    if (ocFieldId) {
      body.CustomField = [
        {
          DefinitionId: ocFieldId,
          Name: "ORDEN COMPRA",
          Type: "StringType",
          StringValue: input.ordenCompra.slice(0, 31), // límite QBO
        },
      ];
    }
  }

  // CurrencyRef solo si QBO está configurado multi-currency
  if (input.moneda && input.moneda !== "USD") {
    body.CurrencyRef = { value: input.moneda };
  }

  const res = await qboRequest<{ Invoice: CreatedInvoice }>({
    method: "POST",
    path: "/v3/company/{realmId}/invoice",
    body,
  });

  return res.Invoice;
}
