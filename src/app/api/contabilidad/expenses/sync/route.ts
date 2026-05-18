import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync, QBOConnection } from "@/models";
import { findOrCreateVendor } from "@/lib/qbo/vendors";
import { createVendorExpense } from "@/lib/qbo/expenses";

interface SyncBody {
  expenseIds: string[];
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  let body: SyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.expenseIds) || body.expenseIds.length === 0) {
    return NextResponse.json({ success: false, error: "Selecciona al menos un gasto" }, { status: 400 });
  }

  await dbConnect();

  const conn = await QBOConnection.findOne();
  if (!conn) {
    return NextResponse.json({ success: false, error: "QBO no conectado. Conecta primero en /contabilidad." }, { status: 400 });
  }

  const results: Array<{
    expenseId: string;
    status: string;
    qboTxnId?: string;
    qboDocNumber?: string;
    qboTxnType?: string;
    error?: string;
  }> = [];

  for (const expenseId of body.expenseIds) {
    const expense = await ExpenseInvoice.findById(expenseId);
    if (!expense) {
      results.push({ expenseId, status: "failed", error: "Gasto no encontrado" });
      continue;
    }

    if (/nota de credito/i.test(expense.docType || "")) {
      results.push({
        expenseId,
        status: "failed",
        error: "Las notas de crédito no se envían como gasto (revísalas manualmente en QBO)",
      });
      continue;
    }

    await ExpenseSync.findOneAndUpdate(
      { expenseInvoiceId: expense._id },
      { $set: { status: "syncing" }, $inc: { attempts: 1 }, $setOnInsert: { expenseInvoiceId: expense._id } },
      { upsert: true }
    );

    try {
      const vendorId = await findOrCreateVendor({
        cedula: expense.providerIdentification,
        displayName: expense.providerName || expense.providerIdentification,
      });

      if (!expense.qboCategoryAccountId) {
        throw new Error(
          "Asigna una categoría QBO antes de enviar (columna Categoría en la tabla)"
        );
      }

      const created = await createVendorExpense({
        vendorId,
        consecutivo: expense.consecutivo,
        fecha: expense.documentDate || new Date(),
        monto: expense.total || 0,
        moneda: expense.currency || "CRC",
        descripcion: expense.docType,
        docType: expense.docType,
        haciendaStatus: expense.haciendaStatus,
        expenseAccountId: expense.qboCategoryAccountId,
      });

      const docNumber = created.DocNumber || expense.consecutivo;

      await ExpenseSync.findOneAndUpdate(
        { expenseInvoiceId: expense._id },
        {
          $set: {
            status: "synced",
            qboInvoiceId: created.Id,
            qboInvoiceNumber: docNumber,
            qboTxnType: created.txnType,
            syncedAt: new Date(),
            syncedBy: session.user.id,
          },
          $unset: { error: "" },
        }
      );

      results.push({
        expenseId,
        status: "synced",
        qboTxnId: created.Id,
        qboDocNumber: docNumber,
        qboTxnType: created.txnType,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      await ExpenseSync.findOneAndUpdate(
        { expenseInvoiceId: expense._id },
        { $set: { status: "failed", error: msg } }
      );
      results.push({ expenseId, status: "failed", error: msg });
    }
  }

  const synced = results.filter((r) => r.status === "synced").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({ success: true, data: { synced, failed, results } });
}
