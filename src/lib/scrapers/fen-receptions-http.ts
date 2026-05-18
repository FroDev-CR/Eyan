import * as cheerio from "cheerio";

const FEN_BASE_URL = process.env.FEN_BASE_URL || "https://app.facturaenlanube.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

/**
 * Login y devuelve la página Home HTML y el CookieJar listo para navegar.
 */
export async function loginAndFetchHome(): Promise<{ html: string; jar: CookieJar; debug: string[] }> {
  const jar = new CookieJar();
  const debug: string[] = [];
  await login(jar, debug);
  // Home URL
  const homeUrl = `${FEN_BASE_URL}/index.php?r=inicio`;
  const res = await fenFetch(homeUrl, jar, { referer: `${FEN_BASE_URL}/` });
  const html = await res.text();
  debug.push(`Fetched home ${homeUrl} status=${res.status}`);
  return { html, jar, debug };
}

/**
 * Navega a la página de Reportes (buscarReportes) y devuelve HTML.
 * No toca exports ni descarga — solo trae el HTML para inspección.
 */
export async function fetchReportesPage(jar: CookieJar): Promise<{ html: string; url: string }> {
  const reportesUrl = `${FEN_BASE_URL}/index.php?r=reportes/buscarReportes`;
  const res = await fenFetch(reportesUrl, jar, { referer: `${FEN_BASE_URL}/index.php?r=inicio` });
  const html = await res.text();
  return { html, url: reportesUrl };
}

export type ReceptionRow = Record<string, string | number | Date>;

// Placeholder: later implement export click, modal set dates, and download Excel

function absUrl(href: string) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `${FEN_BASE_URL}${href}`;
  return `${FEN_BASE_URL}/${href}`;
}

function formatDDMMYYYY(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function formatYYYYMMDD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function tryDownloadUrl(url: string, jar: CookieJar) {
  const res = await fenFetch(url, jar, { referer: `${FEN_BASE_URL}/index.php?r=reportes/buscarReportes`, redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  // Quick magic check for XLSX (zip PK)
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) {
    return buf;
  }
  // maybe it's HTML (error) — return null
  return null;
}

async function tryPostForExcel(url: string, jar: CookieJar, body: Record<string, string>) {
  const params = new URLSearchParams();
  for (const k of Object.keys(body)) params.set(k, body[k]);
  const res = await fenFetch(url, jar, { method: "POST", body: params, referer: `${FEN_BASE_URL}/index.php?r=reportes/buscarReportes`, redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b) return buf;
  return null;
}

/**
 * Busca la tarjeta/entrada del reporte "Recepciones" dentro del HTML de reportes.
 * Devuelve el HTML del nodo y cualquier enlace candidato a exportar.
 */
export function findRecepcionesCandidates(reportesHtml: string) {
  const $ = cheerio.load(reportesHtml);
  const candidates: { text: string; href?: string; onclick?: string; elementHtml: string }[] = [];

  // Buscar nodos que contengan "Recepciones" y opcionalmente "Gastos"
  $("body *").each((i, el) => {
    const txt = $(el).text().trim();
    if (!txt) return;
    if (/Recepciones/i.test(txt) && /Gastos|Gastos recibidos|Recepciones/i.test(txt)) {
      // buscar anchors dentro
      const anchors: string[] = [];
      $(el)
        .find("a")
        .each((_, a) => {
          const href = $(a).attr("href") || "";
          const onclick = $(a).attr("onclick") || "";
          anchors.push(href || onclick || "");
        });
      // also look for nearby anchors (siblings)
      $(el)
        .parent()
        .find("a")
        .each((_, a) => {
          const href = $(a).attr("href") || "";
          const onclick = $(a).attr("onclick") || "";
          anchors.push(href || onclick || "");
        });

      const uniq = Array.from(new Set(anchors)).filter((x) => x && x.trim());
      if (uniq.length === 0) {
        candidates.push({ text: txt, elementHtml: $(el).html() || "" });
      } else {
        for (const h of uniq) candidates.push({ text: txt, href: h, onclick: $(el).attr("onclick") || undefined, elementHtml: $(el).html() || "" });
      }
    }
  });

  return candidates;
}

/**
 * Intentar descargar el Excel probando varios candidatos y formatos de fecha.
 */
export async function downloadRecepcionesExcel(jar: CookieJar, daysBack = 7): Promise<{ success: boolean; filePath?: string; debug: string[]; error?: string }> {
  const debug: string[] = [];
  const { html } = await fetchReportesPage(jar);
  debug.push("Fetched reportes page");

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - daysBack);
  const body: Record<string, string> = {
    "ReporteForm[fechainicio]": formatDDMMYYYY(from),
    "ReporteForm[fechafin]": formatDDMMYYYY(to),
    "ReporteForm[tipo]": "2",
    "ReporteForm[cantidadRegistro]": "10000",
  };

  const directUrl = `${FEN_BASE_URL}/index.php?r=reportes/listadoRecepcionesRpt`;
  debug.push(`Trying direct POST ${directUrl}`);
  try {
    const buf = await tryPostForExcel(directUrl, jar, body);
    if (buf) {
      const savePath = saveBufferAsExcel(buf, "recepciones");
      return { success: true, filePath: savePath, debug };
    }
    debug.push("Direct POST did not return an XLSX");
  } catch (e) {
    debug.push(`Direct POST failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const cands = findRecepcionesCandidates(html);
  debug.push(`Found ${cands.length} candidates`);

  // Prepare date formats
  const formats = [formatDDMMYYYY(from), formatYYYYMMDD(from)];
  const formatsTo = [formatDDMMYYYY(to), formatYYYYMMDD(to)];

  // Try each candidate
  for (const cand of cands) {
    debug.push(`Candidate text: ${cand.text} href=${cand.href}`);
    if (!cand.href) continue;
    // try to extract URL from onclick if needed
    let href = cand.href;
    // If onclick like window.open('/path?report=4') or location.href='/...'
    const m = href.match(/(['"])(\/[^'"\)]+)\1/);
    if (m) href = m[2];
    const abs = absUrl(href as string);
    if (!abs) continue;
    debug.push(`Trying absolute URL: ${abs}`);
    // First try GET without params
    try {
      const buf = await tryDownloadUrl(abs, jar);
      if (buf) {
        const savePath = saveBufferAsExcel(buf, 'recepciones');
        return { success: true, filePath: savePath, debug };
      }
    } catch (e) {
      debug.push(`GET attempt failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Try adding common query param names
    const paramNames = ['from', 'to', 'desde', 'hasta', 'fecha_desde', 'fecha_hasta', 'date_from', 'date_to'];
    for (const nameFrom of paramNames) {
      for (const nameTo of paramNames) {
        if (nameFrom === nameTo) continue;
        for (const fromFmt of formats) {
          for (const toFmt of formatsTo) {
            const u = new URL(abs);
            u.searchParams.set(nameFrom, fromFmt);
            u.searchParams.set(nameTo, toFmt);
            debug.push(`Trying GET with params ${nameFrom}/${nameTo} = ${fromFmt}/${toFmt}`);
            try {
              const buf = await tryDownloadUrl(u.toString(), jar);
              if (buf) {
                const savePath = saveBufferAsExcel(buf, 'recepciones');
                return { success: true, filePath: savePath, debug };
              }
            } catch (e) {
              debug.push(`GET+params attempt failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        }
      }
    }

    // Try POST with body param combos
    const bodyKeys = ['from', 'to', 'desde', 'hasta', 'fecha_desde', 'fecha_hasta', 'date_from', 'date_to'];
    for (const k1 of bodyKeys) {
      for (const k2 of bodyKeys) {
        if (k1 === k2) continue;
        for (const fromFmt of formats) {
          for (const toFmt of formatsTo) {
            const body: Record<string, string> = {};
            body[k1] = fromFmt;
            body[k2] = toFmt;
            debug.push(`Trying POST to ${abs} body ${k1}=${fromFmt} ${k2}=${toFmt}`);
            try {
              const buf = await tryPostForExcel(abs, jar, body);
              if (buf) {
                const savePath = saveBufferAsExcel(buf, 'recepciones');
                return { success: true, filePath: savePath, debug };
              }
            } catch (e) {
              debug.push(`POST attempt failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        }
      }
    }
  }

  return { success: false, error: 'No candidate produced an XLSX', debug };
}

function saveBufferAsExcel(buf: Buffer, prefix: string) {
  const pathMod = require('path');
  const fsMod = require('fs');
  const docsDir = pathMod.join(process.cwd(), 'docs');
  fsMod.mkdirSync(docsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `${prefix}_${stamp}.xlsx`;
  const savePath = pathMod.join(docsDir, name);
  fsMod.writeFileSync(savePath, buf);
  return savePath;
}
