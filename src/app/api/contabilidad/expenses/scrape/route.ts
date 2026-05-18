import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";
import { loginAndFetchHome, downloadRecepcionesExcel } from "@/lib/scrapers/fen-receptions-http";
import parseReceptionsExcel from "@/lib/scrapers/parse-receptions";

export const runtime = 'nodejs';

// POST /api/contabilidad/expenses/scrape - Scrapea reportes de Recepciones y guarda en DB
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { daysBack } = await request.json().catch(() => ({ daysBack: 7 }));

    // Login and get cookie jar
    const { jar } = await loginAndFetchHome();

    const dl = await downloadRecepcionesExcel(jar, daysBack ?? 7);
    if (!dl.success || !dl.filePath) {
      return NextResponse.json({ success: false, error: dl.error || 'No se pudo descargar', debug: dl.debug }, { status: 500 });
    }

    const { headers, rows } = parseReceptionsExcel(dl.filePath);

    const processedRows: Array<{ key: string; baseSet: Record<string, unknown>; syncNeeded: boolean }> = [];
    const seenKeys = new Set<string>();

    for (const r of rows) {
      const docType = String(r['Tipo de Documento'] || r['Tipo Documento'] || '').trim();
      if (!docType) continue;
      const providerIdentification = String(r['Identificación Proveedor'] || r['Identificacion Proveedor'] || r['Proveedor Identificación'] || '').trim();
      const providerName = String(r['Nombre Proveedor'] || r['Proveedor'] || '').trim();
      const consecutivo = String(r['Consecutivo Documento'] || r['Consecutivo'] || '').trim();
      if (!consecutivo || !providerIdentification) continue;

      const key = `${consecutivo}|${providerIdentification}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const haciendaStatus = String(r['Respuesta Hacienda'] || '').trim();
      const documentDate = parseExcelDate(String(r['Fecha Documento'] || r['Fecha'] || ''));
      const responseDate = parseExcelDate(String(r['Fecha Respuesta'] || r['Fecha Respuesta'] || ''));
      const clientResponse = String(r['Respuesta Cliente'] || '').trim();
      const currency = String(r['Moneda'] || 'CRC').trim();
      const tax = parseNumber(r['Impuesto']);
      const total = parseNumber(r['Total']);

      const baseSet: Record<string, unknown> = {
        docType,
        providerIdentification,
        providerName,
        consecutivo,
        haciendaStatus,
        documentDate,
        responseDate,
        clientResponse,
        currency,
        tax,
        total,
        raw: r,
        scrapedAt: new Date(),
      };

      const syncNeeded = !/nota de credito/i.test(docType);
      processedRows.push({ key, baseSet, syncNeeded });
    }

    const filters = processedRows.map((item) => {
      const [consecutivo, providerIdentification] = item.key.split("|");
      return { consecutivo, providerIdentification };
    });

    const existingInvoices = filters.length
      ? await ExpenseInvoice.find({ $or: filters })
      : [];
    const existingMap = new Map(existingInvoices.map((invoice) => [`${invoice.consecutivo}|${invoice.providerIdentification}`, invoice]));

    const updateOps: any[] = [];
    const insertItems: Array<{ key: string; baseSet: Record<string, unknown>; syncNeeded: boolean }> = [];
    let created = 0;
    let updated = 0;

    for (const row of processedRows) {
      const existing = existingMap.get(row.key);
      if (existing) {
        updateOps.push({ updateOne: { filter: { _id: existing._id }, update: { $set: row.baseSet } } });
        updated++;
      } else {
        insertItems.push(row);
        created++;
      }
    }

    if (updateOps.length) {
      await ExpenseInvoice.bulkWrite(updateOps, { ordered: false });
    }

    const insertedInvoices = insertItems.length
      ? await ExpenseInvoice.insertMany(insertItems.map((item) => item.baseSet as any), { ordered: false })
      : [];

    const syncPromises: Promise<unknown>[] = [];
    for (const invoice of insertedInvoices) {
      const matching = insertItems.find((item) => {
        const key = `${invoice.consecutivo}|${invoice.providerIdentification}`;
        return key === item.key && item.syncNeeded;
      });
      if (matching) {
        syncPromises.push(
          ExpenseSync.updateOne(
            { expenseInvoiceId: invoice._id },
            { $setOnInsert: { expenseInvoiceId: invoice._id, status: 'pending', attempts: 0 } },
            { upsert: true }
          )
        );
      }
    }

    for (const invoice of existingInvoices) {
      const key = `${invoice.consecutivo}|${invoice.providerIdentification}`;
      const row = processedRows.find((item) => item.key === key && item.syncNeeded);
      if (row) {
        syncPromises.push(
          ExpenseSync.updateOne(
            { expenseInvoiceId: invoice._id },
            { $setOnInsert: { expenseInvoiceId: invoice._id, status: 'pending', attempts: 0 } },
            { upsert: true }
          )
        );
      }
    }

    await Promise.all(syncPromises);

    return NextResponse.json({ success: true, data: { created, updated, file: dl.filePath } });
  } catch (e) {
    console.error('Error scrape expenses:', e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

function parseExcelDate(s: string): Date | undefined {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return new Date(`${m2[1]}-${m2[2]}-${m2[3]}T00:00:00`);
  return undefined;
}

function parseNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[^0-9\-.,]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
