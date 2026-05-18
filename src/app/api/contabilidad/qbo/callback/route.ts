import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";
import { exchangeCodeForTokens, getEnvironment } from "@/lib/qbo/oauth";

// GET /api/contabilidad/qbo/callback?code=...&state=...&realmId=...
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return redirectToContabilidad(request, "auth-required");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return redirectToContabilidad(request, `qbo-error-${errorParam}`);
  }

  if (!code || !state || !realmId) {
    return redirectToContabilidad(request, "missing-params");
  }

  // Verificar state contra cookie (CSRF)
  const cookieState = request.cookies.get("qbo_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return redirectToContabilidad(request, "state-mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    await dbConnect();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expires_in * 1000);
    const refreshExpiresAt = new Date(
      now.getTime() + tokens.x_refresh_token_expires_in * 1000
    );

    // Singleton: replace cualquier conexión existente
    await QBOConnection.deleteMany({});
    await QBOConnection.create({
      realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      refreshExpiresAt,
      environment: getEnvironment(),
      connectedBy: session.user.id,
      connectedAt: now,
      lastRefreshedAt: now,
    });

    const response = redirectToContabilidad(request, "connected");
    response.cookies.delete("qbo_oauth_state");
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("QBO callback error:", msg);
    return redirectToContabilidad(request, `exchange-failed-${encodeURIComponent(msg.slice(0, 100))}`);
  }
}

function redirectToContabilidad(request: NextRequest, status: string): NextResponse {
  const url = new URL("/settings", request.url);
  url.searchParams.set("qbo", status);
  return NextResponse.redirect(url);
}
