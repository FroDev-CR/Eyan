import { qboRequest } from "./client";

type PaymentType = "Cash" | "Check" | "CreditCard";

let cachedExpenseAccountId: string | null = null;
let cachedPaymentAccountId: string | null = null;

/**
 * Cuenta de gasto (CATEGORÍA en QBO). Env: QBO_EXPENSE_CATEGORY_ACCOUNT_ID
 * o primera cuenta Expense; si no, nombre que contenga "gastos varios".
 */
export async function getDefaultExpenseAccountId(): Promise<string> {
  const fromEnv = process.env.QBO_EXPENSE_CATEGORY_ACCOUNT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedExpenseAccountId) return cachedExpenseAccountId;

  const res = await qboRequest<{
    QueryResponse?: { Account?: Array<{ Id: string; Name: string; AccountType: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: {
      query:
        "SELECT Id, Name, AccountType FROM Account WHERE AccountType IN ('Expense', 'Other Expense') AND Active = true MAXRESULTS 100",
    },
  });

  const accounts = res.QueryResponse?.Account ?? [];
  const preferred = accounts.find((a) => /gastos?\s*varios/i.test(a.Name));
  const picked = preferred ?? accounts[0];
  if (!picked) {
    throw new Error(
      "No hay cuenta de gasto en QBO. Crea una (ej. gastos varios) o define QBO_EXPENSE_CATEGORY_ACCOUNT_ID."
    );
  }

  cachedExpenseAccountId = picked.Id;
  return picked.Id;
}

/**
 * Cuenta de pago (banco / tarjeta) para Purchase. Env: QBO_EXPENSE_PAYMENT_ACCOUNT_ID
 */
export async function getDefaultPaymentAccountId(): Promise<string> {
  const fromEnv = process.env.QBO_EXPENSE_PAYMENT_ACCOUNT_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedPaymentAccountId) return cachedPaymentAccountId;

  const res = await qboRequest<{
    QueryResponse?: { Account?: Array<{ Id: string; Name: string; AccountType: string }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: {
      query:
        "SELECT Id, Name, AccountType FROM Account WHERE AccountType IN ('Bank', 'Credit Card') AND Active = true MAXRESULTS 20",
    },
  });

  const accounts = res.QueryResponse?.Account ?? [];
  const picked = accounts[0];
  if (!picked) {
    throw new Error(
      "No hay cuenta bancaria/tarjeta en QBO. Crea una o define QBO_EXPENSE_PAYMENT_ACCOUNT_ID."
    );
  }

  cachedPaymentAccountId = picked.Id;
  return picked.Id;
}

export interface CreateVendorExpenseInput {
  vendorId: string;
  consecutivo: string;
  fecha: Date;
  monto: number;
  moneda: string;
  descripcion?: string;
  docType?: string;
  haciendaStatus?: string;
}

export interface CreatedVendorExpense {
  Id: string;
  DocNumber?: string;
  TotalAmt?: number;
  txnType: "purchase" | "bill";
}

/**
 * Crea un gasto en QBO (no Invoice de venta).
 * Por defecto: Purchase → aparece como "Gastos" en la UI de QBO.
 * QBO_EXPENSE_TXN_TYPE=bill → Bill (cuenta por pagar a proveedor).
 */
export async function createVendorExpense(
  input: CreateVendorExpenseInput
): Promise<CreatedVendorExpense> {
  const txnType = (process.env.QBO_EXPENSE_TXN_TYPE || "purchase").toLowerCase();
  const expenseAccountId = await getDefaultExpenseAccountId();
  const txnDate = input.fecha.toISOString().slice(0, 10);
  const docNumber = input.consecutivo.slice(0, 21);
  const description =
    input.descripcion ||
    [input.docType, input.haciendaStatus ? `Hacienda: ${input.haciendaStatus}` : ""]
      .filter(Boolean)
      .join(" · ") ||
    `Recepción FEN #${input.consecutivo}`;

  const line = {
    DetailType: "AccountBasedExpenseLineDetail",
    Amount: input.monto,
    Description: description.slice(0, 4000),
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: expenseAccountId },
    },
  };

  const currency =
    input.moneda && input.moneda !== "USD" ? { CurrencyRef: { value: input.moneda } } : {};

  if (txnType === "bill") {
    const body: Record<string, unknown> = {
      VendorRef: { value: input.vendorId },
      TxnDate: txnDate,
      DocNumber: docNumber,
      PrivateNote: `FEN recepción · ${input.consecutivo}`.slice(0, 4000),
      Line: [line],
      ...currency,
    };

    const res = await qboRequest<{ Bill: { Id: string; DocNumber?: string; TotalAmt?: number } }>({
      method: "POST",
      path: "/v3/company/{realmId}/bill",
      body,
    });

    return {
      Id: res.Bill.Id,
      DocNumber: res.Bill.DocNumber,
      TotalAmt: res.Bill.TotalAmt,
      txnType: "bill",
    };
  }

  const paymentType = (process.env.QBO_EXPENSE_PAYMENT_TYPE || "Cash") as PaymentType;
  const paymentAccountId = await getDefaultPaymentAccountId();

  const body: Record<string, unknown> = {
    PaymentType: paymentType,
    AccountRef: { value: paymentAccountId },
    EntityRef: { value: input.vendorId, type: "Vendor" },
    TxnDate: txnDate,
    DocNumber: docNumber,
    PrivateNote: `FEN recepción · ${input.consecutivo}`.slice(0, 4000),
    Line: [line],
    ...currency,
  };

  const res = await qboRequest<{
    Purchase: { Id: string; DocNumber?: string; TotalAmt?: number };
  }>({
    method: "POST",
    path: "/v3/company/{realmId}/purchase",
    body,
  });

  return {
    Id: res.Purchase.Id,
    DocNumber: res.Purchase.DocNumber,
    TotalAmt: res.Purchase.TotalAmt,
    txnType: "purchase",
  };
}
