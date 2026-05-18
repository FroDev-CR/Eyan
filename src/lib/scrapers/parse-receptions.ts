import * as fs from "fs";
import * as path from "path";
import * as xlsx from "xlsx";
import {
  EXPENSE_EXCEL_HEADERS,
  normalizeConsecutivo,
  parseExcelDateValue,
} from "@/lib/contabilidad/expense-excel";

export interface ReceptionRow {
  [key: string]: unknown;
}

function pickHistorialSheet(sheetNames: string[]): string {
  return (
    sheetNames.find((n) => /^historial$/i.test(n.trim())) ||
    sheetNames.find((n) => /listado de recepciones/i.test(n)) ||
    sheetNames.find((n) => /historial/i.test(n)) ||
    (sheetNames.length >= 2 ? sheetNames[1] : sheetNames[0])
  );
}

function normalizeCell(header: string, value: unknown): unknown {
  if (value === null || value === undefined || value === "") return value;

  if (header === "Consecutivo Documento" || header === "Identificación Proveedor") {
    return header === "Consecutivo Documento"
      ? normalizeConsecutivo(value)
      : String(value).trim();
  }

  if (header === "Fecha Documento" || header === "Fecha Respuesta") {
    const d = parseExcelDateValue(value);
    return d ? d.toISOString() : value;
  }

  if (header === "Impuesto" || header === "Total") {
    const s = String(value).replace(/[^0-9\-.,]/g, "").replace(/,/g, "");
    const n = parseFloat(s);
    return isNaN(n) ? value : n;
  }

  return value;
}

export function parseReceptionsExcel(filePath: string): { headers: string[]; rows: ReceptionRow[] } {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const buffer = fs.readFileSync(abs);
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });

  const sheetName = pickHistorialSheet(wb.SheetNames);
  const ws = wb.Sheets[sheetName];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as unknown[][];
  if (!raw || raw.length === 0) return { headers: [], rows: [] };

  // Find header row: look for row that contains 'Tipo de Documento' or 'Identificación'
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(12, raw.length); i++) {
    const row = raw[i] as unknown[];
    const joined = row.map((c) => String(c || "").toLowerCase()).join("|");
    if (
      joined.includes("tipo de documento") ||
      joined.includes("identificación proveedor") ||
      joined.includes("identificacion proveedor") ||
      joined.includes("consecutivo documento")
    ) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = (raw[headerRowIndex] || []).map((h) => String(h || "").trim());
  const dataRows = raw.slice(headerRowIndex + 1);

  const rows: ReceptionRow[] = dataRows
    .map((r) => {
      if (!r || (r as unknown[]).every((c) => c === null || c === undefined || String(c).trim() === "")) return null;
      const obj: ReceptionRow = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i] || `col_${i}`;
        obj[key] = normalizeCell(key, (r as unknown[])[i]);
      }
      return obj;
    })
    .filter((x): x is ReceptionRow => x !== null);

  const orderedHeaders = [
    ...EXPENSE_EXCEL_HEADERS.filter((h) => headers.includes(h)),
    ...headers.filter((h) => !EXPENSE_EXCEL_HEADERS.includes(h as (typeof EXPENSE_EXCEL_HEADERS)[number])),
  ];

  return { headers: orderedHeaders.length ? orderedHeaders : headers, rows };
}

export default parseReceptionsExcel;
