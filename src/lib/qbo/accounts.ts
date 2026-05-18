import { qboRequest } from "./client";
import type { QBOExpenseAccountOption } from "@/lib/contabilidad/expense-category-rules";

let cachedAccounts: QBOExpenseAccountOption[] | null = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

/**
 * Tipos de cuenta que QBO muestra en el selector de categoría de un Gasto.
 * Incluye Banco porque cuentas como COMBUSTIBLE / TELEFONOS suelen crearse ahí.
 */
const CATEGORY_ACCOUNT_TYPES = [
  "Expense",
  "Other Expense",
  "Bank",
  "Credit Card",
  "Cost of Goods Sold",
  "Other Current Asset",
  "Fixed Asset",
  "Other Current Liability",
];

const EXCLUDED_NAME_PATTERNS = [
  /^accounts receivable/i,
  /^accounts payable/i,
  /^cuentas por cobrar/i,
  /^cuentas por pagar/i,
  /^undeposited funds/i,
  /^fondos sin depositar/i,
];

function isUsableCategoryAccount(name: string, accountType: string): boolean {
  if (EXCLUDED_NAME_PATTERNS.some((p) => p.test(name))) return false;
  return CATEGORY_ACCOUNT_TYPES.includes(accountType);
}

export async function listExpenseAccounts(forceRefresh = false): Promise<QBOExpenseAccountOption[]> {
  if (!forceRefresh && cachedAccounts && Date.now() - cacheTime < CACHE_MS) {
    return cachedAccounts;
  }

  const typeList = CATEGORY_ACCOUNT_TYPES.map((t) => `'${t}'`).join(", ");
  const res = await qboRequest<{
    QueryResponse?: {
      Account?: Array<{ Id: string; Name: string; AccountType: string; Active?: boolean }>;
    };
  }>({
    path: "/v3/company/{realmId}/query",
    query: {
      query: `SELECT Id, Name, AccountType, Active FROM Account WHERE AccountType IN (${typeList}) AND Active = true MAXRESULTS 1000`,
    },
  });

  const accounts = (res.QueryResponse?.Account ?? [])
    .filter((a) => isUsableCategoryAccount(a.Name, a.AccountType))
    .map((a) => ({ id: a.Id, name: a.Name, accountType: a.AccountType }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  cachedAccounts = accounts;
  cacheTime = Date.now();
  return accounts;
}

export function clearExpenseAccountsCache(): void {
  cachedAccounts = null;
  cacheTime = 0;
}

/** Etiqueta corta del tipo de cuenta (como en QBO) */
export function accountTypeLabel(accountType?: string): string {
  if (!accountType) return "";
  const map: Record<string, string> = {
    Bank: "Banco",
    "Credit Card": "Tarjeta",
    Expense: "Gasto",
    "Other Expense": "Gasto",
    "Cost of Goods Sold": "Costos",
  };
  return map[accountType] || accountType;
}
