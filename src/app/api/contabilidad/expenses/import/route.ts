import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";
import { normalizeConsecutivo, parseExcelDateValue } from "@/lib/contabilidad/expense-excel";
import { matchCategoryRule } from "@/lib/contabilidad/expense-category-rules";

export const dynamic = "force-dynamic";

// POST /api/contabilidad/expenses/import - Importar gastos desde datos parseados
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { rows, mapping } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No hay datos para importar" }, { status: 400 });
    }

    const processedRows: Array<{ key: string; baseSet: Record<string, unknown>; syncNeeded: boolean }> = [];
    const seenKeys = new Set<string>();

    for (const r of rows) {
      // Usar el mapeo proporcionado o detectar automáticamente
      const docType = String(mapping?.docType ? r[mapping.docType] : r["Tipo de Documento"] || r["Tipo Documento"] || "").trim();
      if (!docType) continue;

      const providerIdentification = String(
        mapping?.providerIdentification
          ? r[mapping.providerIdentification]
          : r["Identificación Proveedor"] || r["Identificacion Proveedor"] || r["Proveedor Identificación"] || ""
      ).trim();

      const consecutivo = normalizeConsecutivo(
        mapping?.consecutivo ? r[mapping.consecutivo] : r["Consecutivo Documento"] || r["Consecutivo"] || ""
      );

      if (!consecutivo || !providerIdentification) continue;

      const key = `${consecutivo}|${providerIdentification}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const providerName = String(
        mapping?.providerName ? r[mapping.providerName] : r["Nombre Proveedor"] || r["Proveedor"] || ""
      ).trim();
      const haciendaStatus = String(mapping?.haciendaStatus ? r[mapping.haciendaStatus] : r["Respuesta Hacienda"] || "").trim();
      const documentDate = parseExcelDateValue(
        mapping?.documentDate ? r[mapping.documentDate] : r["Fecha Documento"] || r["Fecha"]
      );
      const responseDate = parseExcelDateValue(
        mapping?.responseDate ? r[mapping.responseDate] : r["Fecha Respuesta"]
      );
      const clientResponse = String(mapping?.clientResponse ? r[mapping.clientResponse] : r["Respuesta Cliente"] || "").trim();
      const currency = String(mapping?.currency ? r[mapping.currency] : r["Moneda"] || "CRC").trim();
      const tax = parseNumber(mapping?.tax ? r[mapping.tax] : r["Impuesto"]);
      const total = parseNumber(mapping?.total ? r[mapping.total] : r["Total"]);

      const matchedRule = matchCategoryRule(providerName);

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
        ...(matchedRule ? { categoryAutoRule: matchedRule.id } : {}),
      };

      const syncNeeded = !/nota de credito/i.test(docType);
      processedRows.push({ key, baseSet, syncNeeded });
    }

    if (processedRows.length === 0) {
      return NextResponse.json({ success: false, error: "No se pudo procesar ningún gasto" }, { status: 400 });
    }

    const filters = processedRows.map((item) => {
      const [consecutivo, providerIdentification] = item.key.split("|");
      return { consecutivo, providerIdentification };
    });

    const existingInvoices = filters.length ? await ExpenseInvoice.find({ $or: filters }) : [];
    const existingMap = new Map(
      existingInvoices.map((invoice) => [`${invoice.consecutivo}|${invoice.providerIdentification}`, invoice])
    );

    const updateOps: any[] = [];
    const insertItems: Array<{ key: string; baseSet: Record<string, unknown>; syncNeeded: boolean }> = [];
    let created = 0;
    let updated = 0;

    for (const row of processedRows) {
      const existing = existingMap.get(row.key);
      if (existing) {
        const set = { ...row.baseSet };
        if (existing.categorySource === "manual") {
          delete set.qboCategoryAccountId;
          delete set.qboCategoryAccountName;
          delete set.categoryAutoRule;
          delete set.categorySource;
        } else {
          set.qboCategoryAccountId = "";
          set.qboCategoryAccountName = "";
          set.categorySource = undefined;
        }
        updateOps.push({ updateOne: { filter: { _id: existing._id }, update: { $set: set } } });
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
      ? await ExpenseInvoice.insertMany(
          insertItems.map((item) => item.baseSet as any),
          { ordered: false }
        )
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
            { $setOnInsert: { expenseInvoiceId: invoice._id, status: "pending", attempts: 0 } },
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
            { $setOnInsert: { expenseInvoiceId: invoice._id, status: "pending", attempts: 0 } },
            { upsert: true }
          )
        );
      }
    }

    await Promise.all(syncPromises);

    return NextResponse.json({
      success: true,
      data: { created, updated },
    });
  } catch (e) {
    console.error("Error importing expenses:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

function parseNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/[^0-9\-.,]/g, "").replace(/,/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
