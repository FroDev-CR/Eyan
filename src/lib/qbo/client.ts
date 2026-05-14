import dbConnect from "@/lib/db";
import { QBOConnection } from "@/models";
import { refreshAccessToken, getApiBaseUrl } from "./oauth";
import type { IQBOConnection } from "@/models/QBOConnection";

/**
 * Obtiene la conexión QBO singleton, refrescando el access_token si está
 * cerca de expirar. Lanza error si no hay conexión o si el refresh_token
 * está expirado (requiere reconexión manual).
 */
export async function getActiveConnection(): Promise<IQBOConnection> {
  await dbConnect();

  const conn = await QBOConnection.findOne();
  if (!conn) {
    throw new Error("QBO no conectado. Conecta primero en /contabilidad.");
  }

  // Refresh token expirado → reconexión manual
  if (conn.refreshExpiresAt && conn.refreshExpiresAt < new Date()) {
    throw new Error(
      "El refresh_token de QBO expiró (>100 días sin uso). Reconecta en /contabilidad."
    );
  }

  // Access token expirado o por expirar en 60s → refresh
  const nowPlusBuffer = new Date(Date.now() + 60_000);
  if (!conn.expiresAt || conn.expiresAt < nowPlusBuffer) {
    const tokens = await refreshAccessToken(conn.refreshToken);
    conn.accessToken = tokens.access_token;
    conn.refreshToken = tokens.refresh_token; // QBO rota el refresh token
    conn.expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    conn.refreshExpiresAt = new Date(
      Date.now() + tokens.x_refresh_token_expires_in * 1000
    );
    conn.lastRefreshedAt = new Date();
    await conn.save();
  }

  return conn;
}

interface QBORequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // ej: "/v3/company/{realmId}/customer"
  body?: unknown;
  query?: Record<string, string>;
}

/**
 * Hace un request autenticado a la API de QBO. Reemplaza {realmId} en path.
 */
export async function qboRequest<T = unknown>(opts: QBORequestOptions): Promise<T> {
  const conn = await getActiveConnection();
  const baseUrl = getApiBaseUrl();
  const path = opts.path.replace("{realmId}", conn.realmId);

  const url = new URL(baseUrl + path);
  url.searchParams.set("minorversion", "75");
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO ${opts.method || "GET"} ${path} → ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}
