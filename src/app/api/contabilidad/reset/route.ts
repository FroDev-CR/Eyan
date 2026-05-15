import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { CustomerSync, InvoiceSync } from "@/models";

/**
 * POST /api/contabilidad/reset (admin only)
 *
 * Limpia caché/estado para re-sincronizar desde cero. NO toca FENInvoice
 * (las facturas scrapeadas se conservan) ni QBO.
 *
 * Query params:
 *  - customers=true   → borra CustomerSync (caché de clientes QBO).
 *                       Próximo sync re-busca por DisplayName en QBO.
 *  - syncs=failed|all → borra InvoiceSync fallidos (failed) o todos (all).
 *                       Las facturas vuelven a estado "pending".
 *
 * Default sin params: customers + syncs=failed.
 */
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
    const hasParams =
      searchParams.has("customers") || searchParams.has("syncs");

    const clearCustomers = hasParams
      ? searchParams.get("customers") === "true"
      : true;
    const syncsScope = hasParams
      ? searchParams.get("syncs") // "failed" | "all" | null
      : "failed";

    await dbConnect();

    let customerSyncDeleted = 0;
    let invoiceSyncDeleted = 0;

    if (clearCustomers) {
      const r = await CustomerSync.deleteMany({});
      customerSyncDeleted = r.deletedCount ?? 0;
    }

    if (syncsScope === "all") {
      const r = await InvoiceSync.deleteMany({});
      invoiceSyncDeleted = r.deletedCount ?? 0;
    } else if (syncsScope === "failed") {
      const r = await InvoiceSync.deleteMany({ status: "failed" });
      invoiceSyncDeleted = r.deletedCount ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        customerSyncDeleted,
        invoiceSyncDeleted,
        syncsScope: syncsScope ?? "none",
      },
    });
  } catch (error) {
    console.error("Error reset contabilidad:", error);
    return NextResponse.json(
      { success: false, error: "Error al resetear contabilidad" },
      { status: 500 }
    );
  }
}
