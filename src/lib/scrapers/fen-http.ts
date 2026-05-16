import * as cheerio from "cheerio";

const FEN_BASE_URL = process.env.FEN_BASE_URL || "https://app.facturaenlanube.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type OCPrefix = "ME" | "KC" | "WHL";
export type SubClienteArea = "Amanco" | "Kimberly Clark" | "Otros";

export interface FENScrapedInvoice {
  fenId: string;
  xmlCod?: string;
  consecutivo: string;
  identification: string;
  clienteName: string;
  fecha: Date;
  plazo: number;
  moneda: string;
  medioPago: string;
  monto: number;
  saldo: number;
  estadoHacienda: string;
  correoEnviado: boolean;
  anulado: boolean;
  observaciones?: string;
  lineaDescripcion?: string;
  ordenCompraPrefix?: OCPrefix | null;
  ordenCompraNumero?: string;
  subClienteArea?: SubClienteArea | null;
  detalleScraped: boolean;
  raw: Record<string, unknown>;
}

export interface FENScrapeResult {
  success: boolean;
  invoices?: FENScrapedInvoice[];
  error?: string;
  debug?: string[];
}

class CookieJar {
  private jar = new Map<string, string>();

  ingest(setCookieHeaders: string[] | null) {
    if (!setCookieHeaders) return;
    for (const raw of setCookieHeaders) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) this.jar.set(name, value);
    }
  }

  header(): string {
    return Array.from(this.jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

function getSetCookies(res: Response): string[] {
  const headers = res.headers as unknown as {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  if (typeof headers.raw === "function") return headers.raw()["set-cookie"] || [];
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

async function fenFetch(
  url: string,
  jar: CookieJar,
  init: { method?: string; body?: URLSearchParams; referer?: string; redirect?: RequestRedirect } = {}
): Promise<Response> {
  const res = await fetch(url, {
    method: init.method || "GET",
    redirect: init.redirect || "manual",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-CR,es;q=0.9,en;q=0.8",
      "Content-Type": init.body ? "application/x-www-form-urlencoded" : "",
      ...(init.referer ? { Referer: init.referer } : {}),
      ...(jar.header() ? { Cookie: jar.header() } : {}),
    },
    body: init.body ? init.body.toString() : undefined,
  });
  jar.ingest(getSetCookies(res));
  return res;
}

async function followRedirects(
  startUrl: string,
  jar: CookieJar,
  maxHops = 10,
  referer?: string
): Promise<{ url: string; html: string }> {
  let url = startUrl;
  let lastReferer = referer;
  for (let i = 0; i < maxHops; i++) {
    const res = await fenFetch(url, jar, { referer: lastReferer });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      lastReferer = url;
      url = loc.startsWith("http") ? loc : `${FEN_BASE_URL}${loc.startsWith("/") ? "" : "/"}${loc}`;
      continue;
    }
    return { url, html: await res.text() };
  }
  throw new Error("Demasiados redirects");
}

async function login(jar: CookieJar, debug: string[]): Promise<void> {
  const username = process.env.FEN_USERNAME;
  const password = process.env.FEN_PASSWORD;
  if (!username || !password) {
    throw new Error("FEN_USERNAME/FEN_PASSWORD no configurados");
  }

  const loginUrl = `${FEN_BASE_URL}/index.php?r=login/login`;
  await fenFetch(loginUrl, jar);
  debug.push(`Got PHPSESSID cookie`);

  const submit = async (cerrarSesion: boolean) => {
    const body = new URLSearchParams();
    body.append("LoginForm[username]", username);
    body.append("LoginForm[password]", password);
    if (cerrarSesion) body.append("LoginForm[cerrarSesion]", "1");
    body.append("yt0", "Entrar");
    return fenFetch(loginUrl, jar, {
      method: "POST",
      body,
      referer: loginUrl,
    });
  };

  let res = await submit(false);

  if (res.status === 200) {
    const html = await res.text();
    if (html.includes("SESIÓN ACTIVA") || html.includes("cerrarSesion")) {
      debug.push("Sesión activa detectada, reintentando con cerrarSesion=1");
      res = await submit(true);
    } else if (html.includes("LoginForm_username") || html.includes("login/login")) {
      throw new Error("Login falló — credenciales inválidas o respuesta inesperada");
    }
  }

  if (res.status !== 302) {
    throw new Error(`Login no retornó 302 (status=${res.status})`);
  }

  const loc = res.headers.get("location");
  if (!loc || loc.includes("login")) {
    throw new Error(`Login redirige a login (${loc})`);
  }

  await followRedirects(loc.startsWith("http") ? loc : `${FEN_BASE_URL}${loc}`, jar);
  debug.push("Login OK");
}

function parseSpanishNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}

function parseSpanishDate(s: string): Date {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return new Date(NaN);
  const [, day, month, year] = m;
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function parseInvoicesPage(html: string): FENScrapedInvoice[] {
  const $ = cheerio.load(html);
  const invoices: FENScrapedInvoice[] = [];

  $("table tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr
      .find("td")
      .map((__, td) => $(td).text().trim())
      .get();
    if (cells.length < 13) return;

    const fenId = cells[0];
    if (!fenId || isNaN(Number(fenId))) return;

    const xmlCod = $tr.find("a[data-cod]").first().attr("data-cod") || "";

    invoices.push({
      fenId,
      xmlCod,
      consecutivo: cells[1] || "",
      identification: cells[2] || "",
      clienteName: cells[3] || "",
      fecha: parseSpanishDate(cells[4]),
      plazo: parseInt(cells[5]) || 0,
      moneda: cells[6] || "CRC",
      medioPago: cells[7] || "",
      monto: parseSpanishNumber(cells[8]),
      saldo: parseSpanishNumber(cells[9]),
      estadoHacienda: cells[10] || "",
      correoEnviado: /enviado|sí|si|yes/i.test(cells[11] || ""),
      anulado: /^si$|^sí$|^yes$/i.test(cells[12] || ""),
      detalleScraped: false,
      raw: {
        fechaStr: cells[4],
        montoStr: cells[8],
        saldoStr: cells[9],
        correoStr: cells[11],
        anuladoStr: cells[12],
      },
    });
  });

  return invoices;
}

/**
 * Descripción de las líneas del XML (Hacienda CR v4.4: <Detalle> dentro
 * de <LineaDetalle>). Une las distintas, dedupe, recorta.
 */
function parseLineaDescripcion(xml: string): string {
  const re = /<Detalle>([\s\S]*?)<\/Detalle>/g;
  const seen = new Set<string>();
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const txt = m[1]
      .replace(/&#xD;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (!txt || seen.has(txt.toLowerCase())) continue;
    seen.add(txt.toLowerCase());
    parts.push(txt);
  }
  return parts.join("; ").slice(0, 300);
}

// Label "ORDEN DE COMPRA" seguido del código (KC-106, 4500921112, etc).
// El código puede o no traer prefijo alfabético.
const OC_LABEL_REGEX = /ORDEN\s+DE\s+COMPRA\s*[:#-]?\s*([^\n\r]+)/i;

function parseObservaciones(xml: string): {
  observaciones: string;
  prefix: OCPrefix | null;
  numero: string;
} {
  const m = xml.match(/<OtroTexto>([\s\S]*?)<\/OtroTexto>/);
  if (!m) return { observaciones: "", prefix: null, numero: "" };

  const observaciones = m[1].replace(/&#xD;/g, "\n").trim();
  const oc = observaciones.match(OC_LABEL_REGEX);
  if (!oc) return { observaciones, prefix: null, numero: "" };

  // Primer token tras el label = código OC completo (KC-106 / 4500921112)
  const codeMatch = oc[1].match(/[A-Za-z0-9][A-Za-z0-9._/-]*/);
  const numero = (codeMatch?.[0] ?? "").trim().slice(0, 31);

  // Prefijo solo para mapear área Yobel (ME/KC/WHL); numérico → null
  const pm = numero.toUpperCase().match(/\b(ME|KC|WHL)\b/);
  const prefix: OCPrefix | null = pm ? (pm[1] as OCPrefix) : null;

  return { observaciones, prefix, numero };
}

const YOBEL_CEDULA = "3101354880";

export function resolveSubClienteArea(
  identification: string,
  prefix: OCPrefix | null
): SubClienteArea | null {
  if (identification !== YOBEL_CEDULA) return null;
  if (prefix === "ME") return "Amanco";
  if (prefix === "KC") return "Kimberly Clark";
  if (prefix === "WHL") return "Otros";
  return null;
}

export async function scrapeInvoiceDetail(
  jar: CookieJar,
  fenId: string,
  xmlCod: string
): Promise<{
  observaciones: string;
  lineaDescripcion: string;
  ordenCompraPrefix: OCPrefix | null;
  ordenCompraNumero: string;
} | null> {
  if (!xmlCod) return null;
  const url = `${FEN_BASE_URL}/index.php?r=facturasVenta/FacturaXML&id=${fenId}&cod=${xmlCod}`;
  const res = await fenFetch(url, jar);
  if (res.status !== 200) return null;
  const xml = await res.text();
  if (!xml.includes("<FacturaElectronica")) return null;
  const { observaciones, prefix, numero } = parseObservaciones(xml);
  return {
    observaciones,
    lineaDescripcion: parseLineaDescripcion(xml),
    ordenCompraPrefix: prefix,
    ordenCompraNumero: numero,
  };
}

function hasNextPage(html: string, currentPage: number): boolean {
  const $ = cheerio.load(html);
  const nextLink = $(`.pagination a[href*="FacturaVenta_page=${currentPage + 1}"]`).first();
  return nextLink.length > 0;
}

export async function scrapeFENInvoices(
  opts: {
    monthsBack?: number;
    enrichDetail?: boolean;
    skipDetailFor?: Set<string>;
  } = {}
): Promise<FENScrapeResult> {
  const debug: string[] = [];
  const monthsBack = opts.monthsBack ?? 1;
  const enrichDetail = opts.enrichDetail ?? true;
  const skipDetailFor = opts.skipDetailFor ?? new Set<string>();
  const maxPages = 200;

  try {
    const jar = new CookieJar();
    await login(jar, debug);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    debug.push(`Cutoff date: ${cutoff.toISOString()}`);

    const all: FENScrapedInvoice[] = [];
    const seen = new Set<string>();
    let pageNum = 1;
    let cutoffReached = false;

    while (pageNum <= maxPages && !cutoffReached) {
      const url =
        pageNum === 1
          ? `${FEN_BASE_URL}/index.php?r=facturasVenta/buscarFacturasVenta`
          : `${FEN_BASE_URL}/index.php?r=facturasVenta/buscarFacturasVenta&FacturaVenta_page=${pageNum}`;

      const { html } = await followRedirects(url, jar, 5);
      const pageInvoices = parseInvoicesPage(html);

      let newCount = 0;
      for (const inv of pageInvoices) {
        if (seen.has(inv.fenId)) continue;
        seen.add(inv.fenId);
        if (!isNaN(inv.fecha.getTime()) && inv.fecha < cutoff) {
          cutoffReached = true;
          continue;
        }
        all.push(inv);
        newCount++;
      }

      debug.push(`Page ${pageNum}: ${pageInvoices.length} rows (${newCount} kept)`);

      if (pageInvoices.length === 0) break;
      if (cutoffReached) break;
      if (!hasNextPage(html, pageNum)) break;
      pageNum++;
    }

    debug.push(`Listed: ${all.length}`);

    if (enrichDetail) {
      let enriched = 0;
      let skipped = 0;
      for (const inv of all) {
        if (inv.anulado || !inv.xmlCod) continue;
        if (skipDetailFor.has(inv.fenId)) {
          skipped++;
          continue;
        }
        try {
          const detail = await scrapeInvoiceDetail(jar, inv.fenId, inv.xmlCod);
          if (detail) {
            inv.observaciones = detail.observaciones;
            inv.lineaDescripcion = detail.lineaDescripcion;
            inv.ordenCompraPrefix = detail.ordenCompraPrefix;
            inv.ordenCompraNumero = detail.ordenCompraNumero;
            inv.subClienteArea = resolveSubClienteArea(
              inv.identification,
              detail.ordenCompraPrefix
            );
            inv.detalleScraped = true;
            enriched++;
          }
        } catch (e) {
          debug.push(`Detail fail ${inv.fenId}: ${e instanceof Error ? e.message : e}`);
        }
      }
      debug.push(`Enriched: ${enriched}, skipped (cached): ${skipped}, total: ${all.length}`);
    }

    return { success: true, invoices: all, debug };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      debug,
    };
  }
}
