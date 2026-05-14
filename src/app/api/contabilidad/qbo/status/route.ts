import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";

// GET /api/contabilidad/qbo/status - Estado de conexión QBO (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 403 }
    );
  }

  await dbConnect();
  const conn = await QBOConnection.findOne().lean();

  if (!conn) {
    return NextResponse.json({
      success: true,
      data: { connected: false },
    });
  }

  const now = new Date();
  const refreshExpired = conn.refreshExpiresAt < now;

  return NextResponse.json({
    success: true,
    data: {
      connected: !refreshExpired,
      realmId: conn.realmId,
      environment: conn.environment,
      connectedAt: conn.connectedAt,
      lastRefreshedAt: conn.lastRefreshedAt,
      expiresAt: conn.expiresAt,
      refreshExpiresAt: conn.refreshExpiresAt,
      refreshExpired,
    },
  });
}
