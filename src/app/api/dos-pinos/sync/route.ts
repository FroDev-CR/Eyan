import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";
import { scrapeSalesforceDospinosReport } from "@/lib/scrapers/salesforce-dos-pinos";
import { scrapersEnabled, SCRAPER_DISABLED_MESSAGE } from "@/lib/runtime-env";

export const maxDuration = 300;

function parseOpeningDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hour, min] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min));
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["admin", "dispatcher"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    if (!scrapersEnabled()) {
      return NextResponse.json(
        { success: false, error: SCRAPER_DISABLED_MESSAGE },
        { status: 503 }
      );
    }

    const result = await scrapeSalesforceDospinosReport();

    if (!result.success) {
      if (result.requiresMFA) {
        return NextResponse.json(
          {
            success: false,
            requiresMFA: true,
            error: "Salesforce requiere verificación MFA. Ejecuta: npm run sf:setup",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "El reporte está vacío o no tiene datos" },
        { status: 400 }
      );
    }

    await dbConnect();

    const batchName = `SF-SYNC-${new Date().toISOString().slice(0, 10)}`;
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const row of result.rows) {
      const caseNumber = Number(row["Número del caso"]);
      const appointmentNumber = String(row["Número de cita"] ?? "").trim();

      if (!caseNumber || !appointmentNumber) {
        errors++;
        continue;
      }

      const exists = await DosPinosCase.findOne({ caseNumber, importBatch: batchName });
      if (exists) {
        duplicates++;
        continue;
      }

      try {
        await DosPinosCase.create({
          caseNumber,
          appointmentNumber,
          linkedAssetNumber: Number(row["Número de activo ligado"] ?? 0),
          clientNumber: Number(row["Número de cliente"] ?? 0),
          commercialName: String(row["Denominación comercial"] ?? "").trim(),
          sfStatus: String(row["Estado"] ?? "").trim(),
          branch: String(row["SUCURSAL"] ?? "").trim(),
          sfStatus2: String(row["Estado2"] ?? "").trim(),
          clientAddress: String(row["Dirección del cliente"] ?? "").trim(),
          equipmentZone: String(row["Zona del equipo"] ?? "").trim(),
          accountName: String(row["Cuenta: Nombre de la cuenta"] ?? "").trim(),
          serviceResourceName: String(row["Recurso de servicio: Nombre"] ?? "").trim(),
          openingDate: parseOpeningDate(row["Fecha/Hora de apertura"]),
          eyanStatus: "pending",
          importBatch: batchName,
          importedAt: new Date(),
        });
        imported++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, duplicates, errors, batch: batchName },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en sync Salesforce:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
