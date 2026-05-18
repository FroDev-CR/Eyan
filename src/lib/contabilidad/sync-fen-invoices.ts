import dbConnect from "@/lib/db";
import { FENInvoice, InvoiceSync } from "@/models";
import { scrapeFENInvoices } from "@/lib/scrapers/fen-http";

export interface FenInvoiceScrapeResult {
  scraped: number;
  created: number;
  updated: number;
  pendingSyncs: number;
  errors: string[];
  monthsBack: number;
}

export async function runFenInvoiceScrape(
  monthsBack: number,
  force = false
): Promise<{ success: true; data: FenInvoiceScrapeResult } | { success: false; error: string; debug?: unknown }> {
  await dbConnect();

  const months = Math.max(1, Math.min(12, monthsBack));

  const skipDetailFor = new Set<string>();
  if (!force) {
    const cached = await FENInvoice.find({ detalleScraped: true }, { fenId: 1 }).lean();
    for (const c of cached) skipDetailFor.add(c.fenId);
  }

  const result = await scrapeFENInvoices({ monthsBack: months, skipDetailFor });

  if (!result.success || !result.invoices) {
    return {
      success: false,
      error: result.error || "Error al scrapear FEN",
      debug: result.debug,
    };
  }

  let created = 0;
  let updated = 0;
  let pendingSyncs = 0;
  const errors: string[] = [];

  for (const inv of result.invoices) {
    try {
      const existing = await FENInvoice.findOne({ fenId: inv.fenId });

      const baseSet: Record<string, unknown> = {
        xmlCod: inv.xmlCod || "",
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
      };

      if (inv.detalleScraped) {
        baseSet.observaciones = inv.observaciones || "";
        baseSet.lineaDescripcion = inv.lineaDescripcion || "";
        baseSet.ordenCompraPrefix = inv.ordenCompraPrefix ?? null;
        baseSet.ordenCompraNumero = inv.ordenCompraNumero || "";
        baseSet.subClienteArea = inv.subClienteArea ?? null;
        baseSet.detalleScraped = true;
      }

      const doc = await FENInvoice.findOneAndUpdate(
        { fenId: inv.fenId },
        { $set: baseSet },
        { upsert: true, new: true }
      );

      if (existing) {
        updated++;
      } else {
        created++;
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

  return {
    success: true,
    data: {
      scraped: result.invoices.length,
      created,
      updated,
      pendingSyncs,
      errors,
      monthsBack: months,
    },
  };
}
