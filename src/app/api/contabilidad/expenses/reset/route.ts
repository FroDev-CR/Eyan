import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const [invoicesResult, syncsResult] = await Promise.all([
      ExpenseInvoice.deleteMany({}),
      ExpenseSync.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        deletedInvoices: invoicesResult.deletedCount,
        deletedSyncs: syncsResult.deletedCount,
      },
    });
  } catch (e) {
    console.error("[expenses/reset]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
