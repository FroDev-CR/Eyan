import * as fs from "fs";
import * as path from "path";
import * as xlsx from "xlsx";

export interface ReceptionRow {
  [key: string]: unknown;
}

export function parseReceptionsExcel(filePath: string): { headers: string[]; rows: ReceptionRow[] } {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);
  const buffer = fs.readFileSync(abs);
  const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });

  // Prefer sheet named "Listado de Recepciones" or second sheet
  let sheetName = wb.SheetNames.find((n) => /Listado de Recepciones/i.test(n));
  if (!sheetName && wb.SheetNames.length >= 2) sheetName = wb.SheetNames[1];
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
  if (!raw || raw.length === 0) return { headers: [], rows: [] };

  // Find header row: look for row that contains 'Tipo de Documento' or 'Identificación'
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i] as unknown[];
    const joined = row.map((c) => String(c || "").toLowerCase()).join("|");
    if (joined.includes("tipo de documento") || joined.includes("identificación") || joined.includes("consecutivo")) {
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
        obj[key] = (r as unknown[])[i];
      }
      return obj;
    })
    .filter((x): x is ReceptionRow => x !== null);

  return { headers, rows };
}

export default parseReceptionsExcel;
