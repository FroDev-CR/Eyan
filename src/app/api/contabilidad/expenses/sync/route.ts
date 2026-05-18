import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync, QBOConnection } from "@/models";
import { findOrCreateCustomer } from "@/lib/qbo/customers";
import { createInvoice } from "@/lib/qbo/invoices";

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
    return NextResponse.json({ success: false, error: "Selecciona al menos una factura" }, { status: 400 });
  }

  await dbConnect();

  const conn = await QBOConnection.findOne();
  if (!conn) {
    return NextResponse.json({ success: false, error: "QBO no conectado. Conecta primero en /contabilidad." }, { status: 400 });
  }

  const results: any[] = [];

  for (const expenseId of body.expenseIds) {
    const expense = await ExpenseInvoice.findById(expenseId);
    if (!expense) {
      results.push({ expenseId, status: 'failed', error: 'ExpenseInvoice no encontrada' });
      continue;
    }

    // mark syncing
    await ExpenseSync.findOneAndUpdate({ expenseInvoiceId: expense._id }, { $set: { status: 'syncing' }, $inc: { attempts: 1 }, $setOnInsert: { expenseInvoiceId: expense._id } }, { upsert: true });

    try {
      const customerId = await findOrCreateCustomer({ cedula: expense.providerIdentification, displayName: expense.providerName });

      const created = await createInvoice({
        customerId,
        consecutivo: expense.consecutivo,
        fecha: expense.documentDate || new Date(),
        monto: expense.total || 0,
        moneda: expense.currency || 'CRC',
        descripcion: expense.docType || undefined,
        ordenCompra: undefined,
        observacionesText: undefined,
      });

      await ExpenseSync.findOneAndUpdate({ expenseInvoiceId: expense._id }, { $set: { status: 'synced', qboInvoiceId: created.Id, qboInvoiceNumber: created.DocNumber, syncedAt: new Date(), syncedBy: session.user.id }, $unset: { error: '' } });

      results.push({ expenseId, status: 'synced', qboInvoiceId: created.Id, qboInvoiceNumber: created.DocNumber });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      await ExpenseSync.findOneAndUpdate({ expenseInvoiceId: expense._id }, { $set: { status: 'failed', error: msg } });
      results.push({ expenseId, status: 'failed', error: msg });
    }
  }

  const synced = results.filter((r) => r.status === 'synced').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  return NextResponse.json({ success: true, data: { synced, failed, results } });
}
