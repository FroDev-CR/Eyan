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

export interface CreateInvoiceInput {
  customerId: string;
  consecutivo: string;       // # factura FEN, usado como DocNumber
  fecha: Date;
  monto: number;
  moneda: string;            // CRC, USD
  descripcion?: string;
  privateNoteExtra?: string;
}

export interface CreatedInvoice {
  Id: string;
  DocNumber?: string;
  TotalAmt: number;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const itemId = await getDefaultServiceItemId();

  const txnDate = input.fecha.toISOString().slice(0, 10); // YYYY-MM-DD

  const privateNote = [
    `Sincronizado desde FEN #${input.consecutivo}`,
    input.privateNoteExtra,
  ]
    .filter(Boolean)
    .join(" | ");

  const body: Record<string, unknown> = {
    TxnDate: txnDate,
    CustomerRef: { value: input.customerId },
    PrivateNote: privateNote,
    Line: [
      {
        DetailType: "SalesItemLineDetail",
        Amount: input.monto,
        Description: input.descripcion || `Factura FEN #${input.consecutivo}`,
        SalesItemLineDetail: {
          ItemRef: { value: itemId },
          Qty: 1,
          UnitPrice: input.monto,
        },
      },
    ],
  };

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
