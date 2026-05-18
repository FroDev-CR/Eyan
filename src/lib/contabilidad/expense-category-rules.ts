/** Cuenta de gasto en QBO (categoría del Purchase) */
export interface QBOExpenseAccountOption {
  id: string;
  name: string;
}

export interface ExpenseCategoryRule {
  id: string;
  label: string;
  /** Palabras en nombre de proveedor (sin importar mayúsculas/acentos) */
  keywords: string[];
  /** Patrones para encontrar la cuenta en el plan contable de QBO */
  accountPatterns: RegExp[];
}

/**
 * Reglas de categorización automática.
 * Orden importa: la primera coincidencia gana.
 * Lo que no coincida → selección manual en la UI.
 */
export const EXPENSE_CATEGORY_RULES: ExpenseCategoryRule[] = [
  {
    id: "combustible",
    label: "Combustible",
    keywords: [
      "servicentro",
      "servicio centro",
      "gasolineria",
      "gasolinera",
      "estacion de servicio",
      "estación de servicio",
      "delta",
      "terpel",
      "recope",
      "combustible",
      "fuel",
    ],
    accountPatterns: [/combustible/i, /gasolina/i, /fuel/i],
  },
  {
    id: "telefonos",
    label: "Teléfonos",
    keywords: [
      "claro",
      "telecomunicaciones",
      "telecom",
      "movistar",
      "kolbi",
      "liberty",
      "ice telecom",
    ],
    accountPatterns: [/telefono/i, /teléfono/i, /telecom/i, /comunicacion/i, /comunicación/i],
  },
];

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCategoryRule(providerName: string): ExpenseCategoryRule | null {
  const normalized = normalizeForMatch(providerName);
  if (!normalized) return null;

  for (const rule of EXPENSE_CATEGORY_RULES) {
    if (rule.keywords.some((kw) => normalized.includes(normalizeForMatch(kw)))) {
      return rule;
    }
  }
  return null;
}

export function resolveRuleToAccount(
  rule: ExpenseCategoryRule,
  accounts: QBOExpenseAccountOption[]
): QBOExpenseAccountOption | null {
  for (const pattern of rule.accountPatterns) {
    const found = accounts.find((a) => pattern.test(a.name));
    if (found) return found;
  }
  return null;
}

export function findAccountByPatterns(
  accounts: QBOExpenseAccountOption[],
  patterns: RegExp[]
): QBOExpenseAccountOption | null {
  for (const pattern of patterns) {
    const found = accounts.find((a) => pattern.test(a.name));
    if (found) return found;
  }
  return null;
}

export function suggestCategoryFromProvider(
  providerName: string,
  accounts: QBOExpenseAccountOption[]
): {
  accountId: string;
  accountName: string;
  ruleId: string;
  ruleLabel: string;
} | null {
  const rule = matchCategoryRule(providerName);
  if (!rule) return null;

  const account = resolveRuleToAccount(rule, accounts);
  if (!account) return null;

  return {
    accountId: account.id,
    accountName: account.name,
    ruleId: rule.id,
    ruleLabel: rule.label,
  };
}

/** Cuenta por defecto cuando el usuario no eligió (gastos varios) */
export function getDefaultMiscAccount(
  accounts: QBOExpenseAccountOption[]
): QBOExpenseAccountOption | null {
  return (
    findAccountByPatterns(accounts, [/gastos?\s*varios/i, /miscellaneous/i, /general/i]) ??
    accounts[0] ??
    null
  );
}
