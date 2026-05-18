import { qboRequest } from "./client";
import type { QBOExpenseAccountOption } from "@/lib/contabilidad/expense-category-rules";

let cachedAccounts: QBOExpenseAccountOption[] | null = null;
let cacheTime = 0;
const CACHE_MS = 5 * 60 * 1000;

export async function listExpenseAccounts(forceRefresh = false): Promise<QBOExpenseAccountOption[]> {
  if (!forceRefresh && cachedAccounts && Date.now() - cacheTime < CACHE_MS) {
    return cachedAccounts;
  }

  const res = await qboRequest<{
    QueryResponse?: { Account?: Array<{ Id: string; Name: string; AccountType: string; Active?: boolean }> };
  }>({
    path: "/v3/company/{realmId}/query",
    query: {
      query:
        "SELECT Id, Name, AccountType, Active FROM Account WHERE AccountType IN ('Expense', 'Other Expense') AND Active = true MAXRESULTS 500",
    },
  });

  const accounts = (res.QueryResponse?.Account ?? [])
    .map((a) => ({ id: a.Id, name: a.Name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  cachedAccounts = accounts;
  cacheTime = Date.now();
  return accounts;
}

export function clearExpenseAccountsCache(): void {
  cachedAccounts = null;
  cacheTime = 0;
}
