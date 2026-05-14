import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { FENInvoice, InvoiceSync } from "@/models";
import { scrapeFENInvoices } from "@/lib/scrapers/fen-http";

export const maxDuration = 300;

// POST /api/contabilidad/scrape - Scrape facturas de FEN (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const monthsBackParam = searchParams.get("monthsBack");
    const monthsBack = monthsBackParam ? Math.max(1, Math.min(12, parseInt(monthsBackParam, 10))) : 1;

    const result = await scrapeFENInvoices({ monthsBack });

    if (!result.success || !result.invoices) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Error al scrapear FEN",
          debug: result.debug,
        },
        { status: 500 }
      );
    }

    await dbConnect();

    let created = 0;
    let updated = 0;
    let pendingSyncs = 0;
    const errors: string[] = [];

    for (const inv of result.invoices) {
      try {
        const existing = await FENInvoice.findOne({ fenId: inv.fenId });
        const doc = await FENInvoice.findOneAndUpdate(
          { fenId: inv.fenId },
          {
            $set: {
              consecutivo: inv.consecutivo,
              identification: inv.identification,
              clienteName: inv.clienteName,
              fecha: inv.fecha,
              plazo: inv.plazo,
              moneda: inv.moneda,
              medioPago: inv.medioPago,
              monto: inv.monto,
              saldo: inv.saldo,
              estadoHacienda: inv.estadoHacienda,
              correoEnviado: inv.correoEnviado,
              anulado: inv.anulado,
              scrapedAt: new Date(),
              raw: inv.raw,
            },
          },
          { upsert: true, new: true }
        );

        if (existing) {
          updated++;
        } else {
          created++;
          // Crear InvoiceSync pendiente para facturas nuevas no anuladas
          if (!inv.anulado) {
            await InvoiceSync.create({
              fenInvoiceId: doc._id,
              status: "pending",
              attempts: 0,
            });
            pendingSyncs++;
          }
        }
      } catch (e) {
        errors.push(`fenId=${inv.fenId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scraped: result.invoices.length,
        created,
        updated,
        pendingSyncs,
        errors,
        monthsBack,
      },
    });
  } catch (error) {
    console.error("Error scrape FEN:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al scrapear",
      },
      { status: 500 }
    );
  }
}
