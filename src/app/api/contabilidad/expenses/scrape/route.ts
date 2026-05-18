import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";
import { loginAndFetchHome, downloadRecepcionesExcel } from "@/lib/scrapers/fen-receptions-http";
import parseReceptionsExcel from "@/lib/scrapers/parse-receptions";

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
      return NextResponse.json({ success: false, error: dl.error || 'No se pudo descargar' }, { status: 500 });
    }

    const { headers, rows } = parseReceptionsExcel(dl.filePath);

    let created = 0;
    let updated = 0;

    for (const r of rows) {
      // Map row fields to model
      const docType = String(r['Tipo de Documento'] || r['Tipo Documento'] || '').trim();
      if (!docType) continue;
      const providerIdentification = String(r['Identificación Proveedor'] || r['Identificacion Proveedor'] || r['Proveedor Identificación'] || '').trim();
      const providerName = String(r['Nombre Proveedor'] || r['Proveedor'] || '').trim();
      const consecutivo = String(r['Consecutivo Documento'] || r['Consecutivo'] || '').trim();
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

      const existing = await ExpenseInvoice.findOne({ consecutivo, providerIdentification });
      if (existing) {
        await ExpenseInvoice.findOneAndUpdate({ _id: existing._id }, { $set: baseSet });
        updated++;
      } else {
        const doc = await ExpenseInvoice.create(baseSet as any);
        created++;
        // Create pending sync for accepted documents (or all?) — create for non-credit notes
        if (!/nota de credito/i.test(docType)) {
          await ExpenseSync.create({ expenseInvoiceId: doc._id, status: 'pending', attempts: 0 });
        }
      }
    }

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
