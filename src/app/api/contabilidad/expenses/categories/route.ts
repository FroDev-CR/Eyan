import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";
import { listExpenseAccounts } from "@/lib/qbo/accounts";
import { EXPENSE_CATEGORY_RULES } from "@/lib/contabilidad/expense-category-rules";

export const dynamic = "force-dynamic";

/** GET — Cuentas de gasto en QBO + reglas automáticas */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();

  const conn = await QBOConnection.findOne();
  if (!conn) {
    return NextResponse.json({
      success: true,
      data: { connected: false, accounts: [], rules: EXPENSE_CATEGORY_RULES.map((r) => ({ id: r.id, label: r.label })) },
    });
  }

  try {
    const accounts = await listExpenseAccounts();
    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        accounts,
        rules: EXPENSE_CATEGORY_RULES.map((r) => ({ id: r.id, label: r.label, keywords: r.keywords.slice(0, 5) })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
