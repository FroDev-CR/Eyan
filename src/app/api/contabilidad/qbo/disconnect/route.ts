import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";
import { revokeToken } from "@/lib/qbo/oauth";

// POST /api/contabilidad/qbo/disconnect - Revoke + borra conexión (admin only)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 403 }
    );
  }

  await dbConnect();
  const conn = await QBOConnection.findOne();

  if (!conn) {
    return NextResponse.json({ success: true, message: "No había conexión activa" });
  }

  // Intentar revoke (no falla si error, solo log)
  try {
    await revokeToken(conn.refreshToken);
  } catch (e) {
    console.warn("QBO revoke falló (ignorado):", e instanceof Error ? e.message : e);
  }

  await QBOConnection.deleteMany({});

  return NextResponse.json({ success: true, message: "Desconectado de QBO" });
}
