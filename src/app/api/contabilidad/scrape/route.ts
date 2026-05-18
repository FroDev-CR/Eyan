import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runFenInvoiceScrape } from "@/lib/contabilidad/sync-fen-invoices";

export const maxDuration = 300;

// POST /api/contabilidad/scrape - Scrape facturas de FEN (admin only)
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
    const monthsBackParam = searchParams.get("monthsBack");
    const monthsBack = monthsBackParam ? parseInt(monthsBackParam, 10) : 1;
    const force = searchParams.get("force") === "true";

    const result = await runFenInvoiceScrape(monthsBack, force);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          debug: result.debug,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error scrape FEN:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al scrapear",
      },
      { status: 500 }
    );
  }
}
