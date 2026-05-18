import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runFenInvoiceScrape } from "@/lib/contabilidad/sync-fen-invoices";

export const maxDuration = 300;

/** POST — Actualiza facturas de clientes desde FEN */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  let monthsBack = 1;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.monthsBack) {
      monthsBack = parseInt(String(body.monthsBack), 10);
    }
  } catch {
    /* default */
  }

  try {
    const result = await runFenInvoiceScrape(monthsBack);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, debug: result.debug },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("[sync-invoices]", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error al sincronizar" },
      { status: 500 }
    );
  }
}
