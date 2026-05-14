import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAuthorizeUrl } from "@/lib/qbo/oauth";
import crypto from "crypto";

// GET /api/contabilidad/qbo/connect - Inicia OAuth flow (admin only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "No autorizado" },
      { status: 403 }
    );
  }

  // CSRF state token, guardado en cookie httpOnly
  const state = crypto.randomBytes(32).toString("hex");

  try {
    const authUrl = buildAuthorizeUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("qbo_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 min
      path: "/",
    });
    return response;
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
