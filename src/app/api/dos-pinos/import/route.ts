import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";

// Columns in the full Salesforce export format
const FULL_FORMAT_HEADERS = [
  "Fecha/Hora de apertura",
  "Número del caso",
  "Número de cita",
  "Número de activo ligado",
  "Número de cliente",
  "Denominación comercial",
  "Estado",
  "SUCURSAL",
  "Estado2",
  "Dirección del cliente",
  "Zona del equipo",
  "Cuenta: Nombre de la cuenta",
  "Recurso de servicio: Nombre",
];

function parseOpeningDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") {
    // Excel serial date
    return xlsx.SSF.parse_date_code ? undefined : new Date((raw - 25569) * 86400 * 1000);
  }
  if (typeof raw === "string") {
    // Format: "5/3/2026, 17:55" or "26/1/2026, 18:25"
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hour, min] = match;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min)
      );
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

function isFullFormatSheet(headers: unknown[]): boolean {
  if (!Array.isArray(headers)) return false;
  return (
    headers.includes("Número del caso") &&
    headers.includes("Número de cita") &&
    headers.includes("Zona del equipo")
  );
}

function extractWeekYear(filename: string): { week?: number; year?: number } {
  const weekMatch = filename.match(/semana\s*(\d+)/i);
  const yearMatch = filename.match(/20(\d{2})/);
  return {
    week: weekMatch ? parseInt(weekMatch[1]) : undefined,
    year: yearMatch ? parseInt("20" + yearMatch[1]) : new Date().getFullYear(),
  };
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: "Solo se aceptan archivos Excel (.xlsx, .xls)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });

    const batchName = file.name.replace(/\.(xlsx|xls)$/i, "");
    const { week, year } = extractWeekYear(file.name);

    let totalImported = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    const importedCases: unknown[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

      if (rows.length < 2) continue;

      const headers = rows[0] as string[];
      if (!isFullFormatSheet(headers)) continue;

      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => { headerMap[h] = i; });

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as unknown[];
        if (!row || row.length === 0) continue;

        const caseNumber = Number(row[headerMap["Número del caso"]]);
        const appointmentNumber = String(row[headerMap["Número de cita"]] ?? "").trim();

        if (!caseNumber || !appointmentNumber) {
          totalErrors++;
          continue;
        }

        // Check duplicate
        const exists = await DosPinosCase.findOne({ caseNumber, importBatch: batchName });
        if (exists) {
          totalDuplicates++;
          continue;
        }

        try {
          const caseData = {
            caseNumber,
            appointmentNumber,
            linkedAssetNumber: Number(row[headerMap["Número de activo ligado"]] ?? 0),
            clientNumber: Number(row[headerMap["Número de cliente"]] ?? 0),
            commercialName: String(row[headerMap["Denominación comercial"]] ?? "").trim(),
            sfStatus: String(row[headerMap["Estado"]] ?? "").trim(),
            branch: String(row[headerMap["SUCURSAL"]] ?? "").trim(),
            sfStatus2: String(row[headerMap["Estado2"]] ?? "").trim(),
            clientAddress: String(row[headerMap["Dirección del cliente"]] ?? "").trim(),
            equipmentZone: String(row[headerMap["Zona del equipo"]] ?? "").trim(),
            accountName: String(row[headerMap["Cuenta: Nombre de la cuenta"]] ?? "").trim(),
            serviceResourceName: String(row[headerMap["Recurso de servicio: Nombre"]] ?? "").trim(),
            openingDate: parseOpeningDate(row[headerMap["Fecha/Hora de apertura"]]),
            eyanStatus: "pending" as const,
            importBatch: batchName,
            importedAt: new Date(),
            week,
            year,
          };

          const created = await DosPinosCase.create(caseData);
          importedCases.push(created);
          totalImported++;
        } catch {
          totalErrors++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: totalImported,
        duplicates: totalDuplicates,
        errors: totalErrors,
        batch: batchName,
        week,
        year,
        cases: importedCases,
      },
    });
  } catch (error) {
    console.error("Error al importar archivo Dos Pinos:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
