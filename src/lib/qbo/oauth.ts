/**
 * QBO OAuth2 helpers — implementación directa contra Intuit endpoints.
 * Docs: https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0
 */

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";

export const QBO_SCOPES = "com.intuit.quickbooks.accounting";

export interface QBOTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;            // segundos (default 3600)
  x_refresh_token_expires_in: number; // segundos (default ~100 días)
  token_type: string;
}

function getEnv() {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  const environment = (process.env.QBO_ENVIRONMENT || "sandbox") as "sandbox" | "production";

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "QBO_CLIENT_ID, QBO_CLIENT_SECRET y QBO_REDIRECT_URI son requeridas. Configúralas en .env.local o Vercel Env Vars."
    );
  }

  return { clientId, clientSecret, redirectUri, environment };
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getEnv();
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QBO_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuthHeader(): string {
  const { clientId, clientSecret } = getEnv();
  return "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export async function exchangeCodeForTokens(code: string): Promise<QBOTokens> {
  const { redirectUri } = getEnv();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO token exchange falló (${res.status}): ${text}`);
  }

  return (await res.json()) as QBOTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<QBOTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO token refresh falló (${res.status}): ${text}`);
  }

  return (await res.json()) as QBOTokens;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
}

export function getApiBaseUrl(): string {
  const { environment } = getEnv();
  return environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function getEnvironment(): "sandbox" | "production" {
  return getEnv().environment;
}
