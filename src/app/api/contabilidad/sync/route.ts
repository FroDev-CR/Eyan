import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { FENInvoice, InvoiceSync, QBOConnection } from "@/models";
import { findOrCreateCustomer } from "@/lib/qbo/customers";
import { createInvoice } from "@/lib/qbo/invoices";

export const maxDuration = 300;

interface SyncBody {
  invoiceIds: string[]; // ids de FENInvoice
}

interface SyncResult {
  fenInvoiceId: string;
  consecutivo: string;
  status: "synced" | "failed";
  qboInvoiceId?: string;
  qboInvoiceNumber?: string;
  error?: string;
}

// POST /api/contabilidad/sync - Pushea facturas seleccionadas a QBO (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 403 }
    );
  }

  let body: SyncBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body inválido" },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.invoiceIds) || body.invoiceIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "Selecciona al menos una factura" },
      { status: 400 }
    );
  }

  await dbConnect();

  // Verificar conexión QBO existe antes de iterar
  const conn = await QBOConnection.findOne();
  if (!conn) {
    return NextResponse.json(
      { success: false, error: "QBO no conectado. Conecta primero en /contabilidad." },
      { status: 400 }
    );
  }

  const results: SyncResult[] = [];

  for (const fenInvoiceId of body.invoiceIds) {
    const invoice = await FENInvoice.findById(fenInvoiceId);
    if (!invoice) {
      results.push({
        fenInvoiceId,
        consecutivo: "?",
        status: "failed",
        error: "FENInvoice no encontrada",
      });
      continue;
    }

    if (invoice.anulado) {
      results.push({
        fenInvoiceId,
        consecutivo: invoice.consecutivo,
        status: "failed",
        error: "Factura anulada, no se sincroniza",
      });
      continue;
    }

    // Marcar syncing
    await InvoiceSync.findOneAndUpdate(
      { fenInvoiceId: invoice._id },
      {
        $set: { status: "syncing" },
        $inc: { attempts: 1 },
        $setOnInsert: { fenInvoiceId: invoice._id },
      },
      { upsert: true }
    );

    try {
      const customerId = await findOrCreateCustomer({
        cedula: invoice.identification,
        displayName: invoice.clienteName,
        subClienteArea: invoice.subClienteArea ?? null,
        parentDisplayName: invoice.subClienteArea ? invoice.clienteName : undefined,
      });

      // Código OC completo para el campo QBO "ORDEN COMPRA"
      // ("KC-106", "4500921112", etc)
      const ordenCompra = invoice.ordenCompraNumero || undefined;

      const created = await createInvoice({
        customerId,
        consecutivo: invoice.consecutivo,
        fecha: invoice.fecha,
        monto: invoice.monto,
        moneda: invoice.moneda,
        // Descripción de línea = servicio facturado en FEN
        descripcion: invoice.lineaDescripcion || undefined,
        ordenCompra,
        // Observaciones FEN → PrivateNote (Nota sobre extracto). Solo el
        // texto de observación, sin metadata.
        observacionesText: invoice.observaciones || undefined,
      });

      await InvoiceSync.findOneAndUpdate(
        { fenInvoiceId: invoice._id },
        {
          $set: {
            status: "synced",
            qboInvoiceId: created.Id,
            qboInvoiceNumber: created.DocNumber,
            syncedAt: new Date(),
            syncedBy: session.user.id,
          },
          $unset: { error: "" },
        }
      );

      results.push({
        fenInvoiceId,
        consecutivo: invoice.consecutivo,
        status: "synced",
        qboInvoiceId: created.Id,
        qboInvoiceNumber: created.DocNumber,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";

      await InvoiceSync.findOneAndUpdate(
        { fenInvoiceId: invoice._id },
        {
          $set: {
            status: "failed",
            error: msg.slice(0, 500),
          },
        }
      );

      results.push({
        fenInvoiceId,
        consecutivo: invoice.consecutivo,
        status: "failed",
        error: msg,
      });
    }
  }

  const synced = results.filter((r) => r.status === "synced").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    success: true,
    data: { synced, failed, results },
  });
}
