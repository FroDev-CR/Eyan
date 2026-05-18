/** Encabezados de la hoja Listado / Historial de Recepciones (FEN) */
export const EXPENSE_EXCEL_HEADERS = [
  "Tipo de Documento",
  "Identificación Proveedor",
  "Nombre Proveedor",
  "Consecutivo Documento",
  "Respuesta Hacienda",
  "Fecha Documento",
  "Fecha Respuesta",
  "Respuesta Cliente",
  "Moneda",
  "Impuesto",
  "Total",
] as const;

export type ExpenseExcelHeader = (typeof EXPENSE_EXCEL_HEADERS)[number];

export interface ExpenseRowLike {
  docType?: string;
  providerIdentification?: string;
  providerName?: string;
  consecutivo?: string;
  haciendaStatus?: string;
  documentDate?: string | Date;
  responseDate?: string | Date;
  clientResponse?: string;
  currency?: string;
  tax?: number;
  total?: number;
  raw?: Record<string, unknown>;
}

const FIELD_BY_HEADER: Record<ExpenseExcelHeader, keyof ExpenseRowLike> = {
  "Tipo de Documento": "docType",
  "Identificación Proveedor": "providerIdentification",
  "Nombre Proveedor": "providerName",
  "Consecutivo Documento": "consecutivo",
  "Respuesta Hacienda": "haciendaStatus",
  "Fecha Documento": "documentDate",
  "Fecha Respuesta": "responseDate",
  "Respuesta Cliente": "clientResponse",
  Moneda: "currency",
  Impuesto: "tax",
  Total: "total",
};

export function parseExcelDateValue(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  if (typeof value === "number" && value > 0) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(d.getTime()) ? undefined : d;
  }

  const s = String(value).trim();
  if (!s) return undefined;

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(`${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}T12:00:00`);

  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}T12:00:00`);

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatExpenseDate(value: unknown): string {
  const d = parseExcelDateValue(value);
  if (!d) return "—";
  return d.toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Conserva ceros a la izquierda; evita notación científica de Excel */
export function normalizeConsecutivo(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(Math.trunc(value)).padStart(20, "0").slice(-20);
  }
  const s = String(value).trim();
  if (/e\+?/i.test(s)) return "";
  return s.replace(/\s/g, "");
}

export function formatConsecutivoDisplay(value: unknown): string {
  const s = normalizeConsecutivo(value);
  if (!s) return "—";
  return s;
}

export function getExpenseCellValue(row: ExpenseRowLike, header: ExpenseExcelHeader): unknown {
  const field = FIELD_BY_HEADER[header];
  const fromModel = row[field];
  if (fromModel !== undefined && fromModel !== null && fromModel !== "") {
    return fromModel;
  }
  const raw = row.raw?.[header];
  if (raw !== undefined && raw !== null && raw !== "") return raw;
  return undefined;
}

export function formatExpenseCell(row: ExpenseRowLike, header: ExpenseExcelHeader): string {
  const value = getExpenseCellValue(row, header);

  if (header === "Consecutivo Documento") {
    return formatConsecutivoDisplay(value);
  }
  if (header === "Fecha Documento" || header === "Fecha Respuesta") {
    return formatExpenseDate(value);
  }
  if (header === "Impuesto" || header === "Total") {
    const n = typeof value === "number" ? value : parseFloat(String(value || "0").replace(/,/g, ""));
    if (isNaN(n)) return "—";
    const moneda = String(getExpenseCellValue(row, "Moneda") || "CRC");
    const code = moneda === "USD" ? "USD" : "CRC";
    try {
      return new Intl.NumberFormat("es-CR", {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return String(n);
    }
  }

  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
