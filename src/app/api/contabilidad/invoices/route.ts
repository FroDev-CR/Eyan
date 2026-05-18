import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { FENInvoice, InvoiceSync } from "@/models";

export const dynamic = "force-dynamic";

// GET /api/contabilidad/invoices - Lista facturas FEN cacheadas con estado sync (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending | synced | failed | all
    const includeAnuladas = searchParams.get("includeAnuladas") === "true";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const area = searchParams.get("area"); // Amanco | Kimberly Clark | Otros | directo | all

    const filter: Record<string, unknown> = {};
    if (!includeAnuladas) filter.anulado = false;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      filter.fecha = range;
    }
    if (area && area !== "all") {
      if (area === "directo") {
        filter.identification = "3101354880";
        filter.subClienteArea = null;
      } else if (area === "Amanco" || area === "Kimberly Clark" || area === "Otros") {
        filter.subClienteArea = area;
      }
    }

    const invoices = await FENInvoice.find(filter)
      .sort({ fecha: -1, consecutivo: -1 })
      .lean();

    const syncs = await InvoiceSync.find({
      fenInvoiceId: { $in: invoices.map((i) => i._id) },
    }).lean();

    const syncMap = new Map(syncs.map((s) => [s.fenInvoiceId.toString(), s]));

    let combined = invoices.map((inv) => {
      const sync = syncMap.get(inv._id.toString());
      return {
        ...inv,
        sync: sync
          ? {
              status: sync.status,
              qboInvoiceId: sync.qboInvoiceId,
              qboInvoiceNumber: sync.qboInvoiceNumber,
              syncedAt: sync.syncedAt,
              // No mostrar error stale en filas ya sincronizadas
              error: sync.status === "synced" ? undefined : sync.error,
              attempts: sync.attempts,
            }
          : { status: "pending" as const, attempts: 0 },
      };
    });

    if (status && status !== "all") {
      combined = combined.filter((i) => i.sync.status === status);
    }

    return NextResponse.json({
      success: true,
      data: combined,
      count: combined.length,
    });
  } catch (error) {
    console.error("Error get invoices:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar facturas" },
      { status: 500 }
    );
  }
}
