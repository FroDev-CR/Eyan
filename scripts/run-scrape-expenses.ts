import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import dbConnect from "@/lib/db";
import { loginAndFetchHome, downloadRecepcionesExcel } from "@/lib/scrapers/fen-receptions-http";
import parseReceptionsExcel from "@/lib/scrapers/parse-receptions";
import { ExpenseInvoice, ExpenseSync } from "@/models";

async function main() {
  try {
    console.log("Conectando DB...");
    await dbConnect();

    console.log("Iniciando login en FEN...");
    const { jar, debug: loginDebug } = await loginAndFetchHome();
    console.log("Login debug:", loginDebug.join(" | "));
    console.log("Descargando Recepciones (7 días)...");
    const dl = await downloadRecepcionesExcel(jar, 7);
    if (!dl.success) {
      console.error("No se pudo descargar:", dl.error);
      process.exit(1);
    }

    console.log("Parseando excel:", dl.filePath);
    const { headers, rows } = parseReceptionsExcel(dl.filePath);
    console.log(`Parsed rows: ${rows.length} headers: ${headers.length}`);

    let created = 0;
    let updated = 0;

    for (const r of rows) {
      const docType = String(r['Tipo de Documento'] || r['Tipo Documento'] || '').trim();
      if (!docType) continue;
      const providerIdentification = String(r['Identificación Proveedor'] || r['Identificacion Proveedor'] || r['Proveedor Identificación'] || '').trim();
      const providerName = String(r['Nombre Proveedor'] || r['Proveedor'] || '').trim();
      const consecutivo = String(r['Consecutivo Documento'] || r['Consecutivo'] || '').trim();
      const haciendaStatus = String(r['Respuesta Hacienda'] || '').trim();
      const documentDate = undefined;
      const responseDate = undefined;
      const currency = String(r['Moneda'] || 'CRC').trim();
      const tax = Number(r['Impuesto'] || 0);
      const total = Number(r['Total'] || 0);

      const baseSet: any = {
        docType,
        providerIdentification,
        providerName,
        consecutivo,
        haciendaStatus,
        documentDate,
        responseDate,
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
        const doc = await ExpenseInvoice.create(baseSet);
        created++;
        if (!/nota de credito/i.test(docType)) {
          await ExpenseSync.create({ expenseInvoiceId: doc._id, status: 'pending', attempts: 0 });
        }
      }
    }

    console.log(`Hecho. Created: ${created} Updated: ${updated}`);
    process.exit(0);
  } catch (e) {
    console.error("Error en run-scrape-expenses:", e);
    process.exit(2);
  }
}

main();
