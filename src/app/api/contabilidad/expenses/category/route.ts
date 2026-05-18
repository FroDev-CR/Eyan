import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice } from "@/models";
import { listExpenseAccounts } from "@/lib/qbo/accounts";

export const dynamic = "force-dynamic";

interface PatchBody {
  expenseId: string;
  qboCategoryAccountId: string | null;
}

/** PATCH — Asignar categoría QBO a un gasto */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body inválido" }, { status: 400 });
  }

  if (!body.expenseId) {
    return NextResponse.json({ success: false, error: "expenseId requerido" }, { status: 400 });
  }

  await dbConnect();

  const expense = await ExpenseInvoice.findById(body.expenseId);
  if (!expense) {
    return NextResponse.json({ success: false, error: "Gasto no encontrado" }, { status: 404 });
  }

  if (!body.qboCategoryAccountId) {
    expense.qboCategoryAccountId = "";
    expense.qboCategoryAccountName = "";
    expense.categoryAutoRule = "";
    expense.categorySource = undefined;
    await expense.save();
    return NextResponse.json({ success: true, data: { expenseId: expense._id } });
  }

  const accounts = await listExpenseAccounts();
  const account = accounts.find((a) => a.id === body.qboCategoryAccountId);
  if (!account) {
    return NextResponse.json({ success: false, error: "Categoría no encontrada en QBO" }, { status: 400 });
  }

  expense.qboCategoryAccountId = account.id;
  expense.qboCategoryAccountName = account.name;
  expense.categoryAutoRule = "";
  expense.categorySource = "manual";
  await expense.save();

  return NextResponse.json({
    success: true,
    data: {
      expenseId: expense._id,
      qboCategoryAccountId: account.id,
      qboCategoryAccountName: account.name,
      categorySource: "manual",
    },
  });
}
