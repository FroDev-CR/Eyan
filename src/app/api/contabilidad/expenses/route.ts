import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";
import { applyAutoCategoriesToPendingExpenses } from "@/lib/contabilidad/apply-expense-categories";

// GET /api/contabilidad/expenses - Lista facturas de gastos cacheadas con estado sync (admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const skipAuto = searchParams.get("skipAuto") === "1";
    if (!skipAuto) {
      try {
        await applyAutoCategoriesToPendingExpenses();
      } catch (e) {
        console.warn("[expenses] auto-categorize:", e);
      }
    }

    const filter: Record<string, unknown> = {};
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = new Date(from);
      if (to) range.$lte = new Date(to);
      filter.documentDate = range;
    }

    const invoices = await ExpenseInvoice.find(filter).sort({ documentDate: -1 }).lean();
    const syncs = await ExpenseSync.find({ expenseInvoiceId: { $in: invoices.map((i) => i._id) } }).lean();
    const syncMap = new Map(syncs.map((s) => [s.expenseInvoiceId.toString(), s]));

    const combined = invoices.map((inv) => {
      const sync = syncMap.get(inv._id.toString());
      return {
        ...inv,
        sync: sync
          ? {
              status: sync.status,
              qboInvoiceId: sync.qboInvoiceId,
              qboInvoiceNumber: sync.qboInvoiceNumber,
              qboTxnType: sync.qboTxnType,
              syncedAt: sync.syncedAt,
              error: sync.status === "synced" ? undefined : sync.error,
              attempts: sync.attempts,
            }
          : { status: "pending", attempts: 0 },
      };
    });

    return NextResponse.json({ success: true, data: combined, count: combined.length });
  } catch (error) {
    console.error("Error get expenses:", error);
    return NextResponse.json({ success: false, error: "Error al cargar gastos" }, { status: 500 });
  }
}
