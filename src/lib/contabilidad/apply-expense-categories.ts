import { ExpenseInvoice, QBOConnection } from "@/models";
import { listExpenseAccounts } from "@/lib/qbo/accounts";
import { suggestCategoryFromProvider } from "@/lib/contabilidad/expense-category-rules";
import type { IExpenseInvoice } from "@/models/ExpenseInvoice";

/**
 * Aplica reglas automáticas a gastos sin categoría manual.
 * No sobrescribe categorySource === 'manual'.
 */
export async function applyAutoCategoriesToPendingExpenses(): Promise<number> {
  const conn = await QBOConnection.findOne();
  if (!conn) return 0;

  const accounts = await listExpenseAccounts();
  if (!accounts.length) return 0;

  // Re-evaluar reglas en todos los no-manuales (incluye los que no tenían cuenta porque faltaba COMBUSTIBLE/TELEFONOS en el sync)
  const candidates = await ExpenseInvoice.find({
    categorySource: { $ne: "manual" },
  }).limit(500);

  let updated = 0;
  for (const expense of candidates) {
    const suggestion = suggestCategoryFromProvider(expense.providerName, accounts);
    if (!suggestion) continue;

    if (
      expense.qboCategoryAccountId === suggestion.accountId &&
      expense.categoryAutoRule === suggestion.ruleId
    ) {
      continue;
    }

    expense.qboCategoryAccountId = suggestion.accountId;
    expense.qboCategoryAccountName = suggestion.accountName;
    expense.categoryAutoRule = suggestion.ruleId;
    expense.categorySource = "auto";
    await expense.save();
    updated++;
  }

  return updated;
}

export function expenseCategoryFields(inv: IExpenseInvoice) {
  return {
    qboCategoryAccountId: inv.qboCategoryAccountId || undefined,
    qboCategoryAccountName: inv.qboCategoryAccountName || undefined,
    categoryAutoRule: inv.categoryAutoRule || undefined,
    categorySource: inv.categorySource || undefined,
  };
}
