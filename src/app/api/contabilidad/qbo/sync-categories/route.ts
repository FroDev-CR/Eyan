import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";
import { clearExpenseAccountsCache, listExpenseAccounts } from "@/lib/qbo/accounts";
import { applyAutoCategoriesToPendingExpenses } from "@/lib/contabilidad/apply-expense-categories";

export const dynamic = "force-dynamic";

/** POST — Refresca cuentas de gasto desde QBO y reaplica reglas automáticas */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();
  const conn = await QBOConnection.findOne();
  if (!conn) {
    return NextResponse.json(
      { success: false, error: "QBO no conectado. Conecta primero en esta página." },
      { status: 400 }
    );
  }

  try {
    clearExpenseAccountsCache();
    const accounts = await listExpenseAccounts(true);
    const autoCategorized = await applyAutoCategoriesToPendingExpenses();

    return NextResponse.json({
      success: true,
      data: {
        accountsCount: accounts.length,
        autoCategorized,
        accounts: accounts.map((a) => ({ id: a.id, name: a.name, accountType: a.accountType })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
