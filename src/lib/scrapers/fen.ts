import { chromium, BrowserContext, Page } from "playwright";
import path from "path";
import fs from "fs";

const PROFILE_DIR = path.join(process.cwd(), ".playwright-session", "fen-profile");

const FEN_BASE_URL = process.env.FEN_BASE_URL || "https://app.facturaenlanube.com";
const FEN_USERNAME = process.env.FEN_USERNAME!;
const FEN_PASSWORD = process.env.FEN_PASSWORD!;

export interface FENScrapedInvoice {
  fenId: string;
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
  raw: Record<string, unknown>;
}

export interface FENScrapeResult {
  success: boolean;
  invoices?: FENScrapedInvoice[];
  error?: string;
  debug?: string[];
}

async function getContext(): Promise<BrowserContext> {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: { width: 1400, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function ensureLogin(page: Page, debug: string[]): Promise<boolean> {
  await page.goto(`${FEN_BASE_URL}/index.php?r=inicio`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  debug.push(`After inicio nav: ${page.url()}`);

  // Si ya está logueado, la URL queda en inicio
  if (page.url().includes("r=inicio") && !page.url().includes("login")) {
    const userText = await page.locator("body").textContent({ timeout: 3000 }).catch(() => "");
    if (userText && userText.includes("Usuario")) {
      debug.push("Already logged in");
      return true;
    }
  }

  // Login form (Yii2 convention)
  debug.push("Need to login");
  const userInput = page
    .locator(
      'input[name="LoginForm[username]"], input[name="LoginForm[email]"], input[type="email"], input[name="username"], input[name="email"]'
    )
    .first();
  const passInput = page
    .locator('input[name="LoginForm[password]"], input[name="password"], input[type="password"]')
    .first();

  await userInput.waitFor({ state: "visible", timeout: 15000 });
  await userInput.fill(FEN_USERNAME);
  await passInput.fill(FEN_PASSWORD);

  const submitBtn = page
    .locator(
      'button[type="submit"], input[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar"), button:has-text("Entrar")'
    )
    .first();

  await Promise.all([
    page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {}),
    submitBtn.click(),
  ]);

  debug.push(`After login attempt: ${page.url()}`);

  // Verify login worked
  if (page.url().includes("login") || page.url().includes("site/login")) {
    debug.push("Login failed — still on login page");
    return false;
  }

  return true;
}

function parseSpanishNumber(s: string): number {
  if (!s) return 0;
  // FEN format: "1,927,638.75" — comma thousands, period decimal
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}

function parseSpanishDate(s: string): Date {
  // FEN format: dd/mm/yyyy
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return new Date(NaN);
  const [, day, month, year] = m;
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

async function scrapeInvoicesPage(
  page: Page,
  debug: string[]
): Promise<FENScrapedInvoice[]> {
  // Wait for table rows
  await page.waitForSelector("table tbody tr", { timeout: 20000 });
  await page.waitForTimeout(800);

  const rows = await page.locator("table tbody tr").all();
  debug.push(`Found ${rows.length} rows in current page`);

  const invoices: FENScrapedInvoice[] = [];

  for (const row of rows) {
    const cells = await row.locator("td").allTextContents();
    if (cells.length < 10) continue;

    // Based on screenshots, column order:
    // 0: Id, 1: Número, 2: Identificación, 3: Cliente, 4: Fecha,
    // 5: Plazo, 6: Moneda, 7: Medio Pago, 8: Monto, 9: Saldo,
    // 10: Estado Hacienda, 11: Correo, 12: Anulado, 13: gear icon

    const fenId = (cells[0] || "").trim();
    const consecutivo = (cells[1] || "").trim();
    const identification = (cells[2] || "").trim();
    const clienteName = (cells[3] || "").trim();
    const fechaStr = (cells[4] || "").trim();
    const plazoStr = (cells[5] || "").trim();
    const moneda = (cells[6] || "").trim();
    const medioPago = (cells[7] || "").trim();
    const montoStr = (cells[8] || "").trim();
    const saldoStr = (cells[9] || "").trim();
    const estadoHacienda = (cells[10] || "").trim();
    const correoStr = (cells[11] || "").trim();
    const anuladoStr = (cells[12] || "").trim();

    if (!fenId || isNaN(Number(fenId))) continue; // skip header/empty

    invoices.push({
      fenId,
      consecutivo,
      identification,
      clienteName,
      fecha: parseSpanishDate(fechaStr),
      plazo: parseInt(plazoStr) || 0,
      moneda: moneda || "CRC",
      medioPago,
      monto: parseSpanishNumber(montoStr),
      saldo: parseSpanishNumber(saldoStr),
      estadoHacienda,
      correoEnviado: /enviado|sí|si|yes/i.test(correoStr),
      anulado: /^si$|^sí$|^yes$/i.test(anuladoStr),
      raw: {
        fechaStr,
        montoStr,
        saldoStr,
        correoStr,
        anuladoStr,
      },
    });
  }

  return invoices;
}

async function navigateToInvoicesList(page: Page, debug: string[]): Promise<boolean> {
  // Probar rutas comunes Yii2 para listado facturas
  const candidates = [
    `${FEN_BASE_URL}/index.php?r=facturaventa/index`,
    `${FEN_BASE_URL}/index.php?r=facturas/index`,
    `${FEN_BASE_URL}/index.php?r=ventas/factura`,
    `${FEN_BASE_URL}/index.php?r=ventas/index`,
    `${FEN_BASE_URL}/index.php?r=factura/index`,
  ];

  for (const url of candidates) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    debug.push(`Tried URL: ${url} → ${page.url()}`);
    if (!page.url().includes("login")) {
      const hasTable = await page
        .locator("table tbody tr")
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (hasTable) {
        debug.push(`Invoice list found at ${page.url()}`);
        return true;
      }
    }
  }

  // Fallback: click "Ventas" menu, find facturas
  await page.goto(`${FEN_BASE_URL}/index.php?r=inicio`, { waitUntil: "domcontentloaded" });
  const ventasLink = page.locator('a:has-text("VENTAS"), a:has-text("Ventas")').first();
  if (await ventasLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ventasLink.hover();
    await page.waitForTimeout(500);
    const facturaLink = page
      .locator('a:has-text("Factura"), a:has-text("Facturas"), a:has-text("Ver Facturas")')
      .first();
    if (await facturaLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await facturaLink.click();
      await page.waitForLoadState("domcontentloaded");
      debug.push(`Reached via menu nav: ${page.url()}`);
      const hasTable = await page
        .locator("table tbody tr")
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      return hasTable;
    }
  }

  return false;
}

async function setDateRange(page: Page, debug: string[], fromDate: Date) {
  // FEN screenshot mostraba 2 date inputs + buscar/refrescar buttons
  const dateInputs = await page.locator('input[type="text"]').all();
  let fromInput = null;
  let toInput = null;

  for (const inp of dateInputs) {
    const val = await inp.inputValue().catch(() => "");
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      if (!fromInput) fromInput = inp;
      else if (!toInput) toInput = inp;
    }
  }

  if (fromInput && toInput) {
    const fmt = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const today = new Date();
    await fromInput.fill(fmt(fromDate));
    await toInput.fill(fmt(today));

    const refreshBtn = page
      .locator(
        'button:has-text("Refrescar"), button:has-text("Buscar"), input[value*="Refrescar"], input[value*="Buscar"]'
      )
      .first();
    if (await refreshBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      debug.push(`Date range applied: ${fmt(fromDate)} → ${fmt(today)}`);
    }
  } else {
    debug.push(`Could not find date inputs (found ${dateInputs.length} text inputs)`);
  }
}

async function paginateAll(page: Page, debug: string[]): Promise<FENScrapedInvoice[]> {
  const all: FENScrapedInvoice[] = [];
  const seenFenIds = new Set<string>();
  let pageNum = 1;
  const maxPages = 50;

  while (pageNum <= maxPages) {
    const pageInvoices = await scrapeInvoicesPage(page, debug);
    let newCount = 0;
    for (const inv of pageInvoices) {
      if (!seenFenIds.has(inv.fenId)) {
        seenFenIds.add(inv.fenId);
        all.push(inv);
        newCount++;
      }
    }
    debug.push(`Page ${pageNum}: ${pageInvoices.length} rows (${newCount} new)`);
    if (newCount === 0) break;

    // Try to click next page
    const nextBtn = page
      .locator(
        '.pagination a:has-text("Siguiente"), .pagination a:has-text("›"), li.next:not(.disabled) a, a[rel="next"]'
      )
      .first();

    const nextVisible = await nextBtn.isVisible({ timeout: 1500 }).catch(() => false);
    if (!nextVisible) {
      debug.push("No next page button");
      break;
    }

    const isDisabled = await nextBtn
      .evaluate((el) => el.closest("li")?.classList.contains("disabled"))
      .catch(() => false);
    if (isDisabled) {
      debug.push("Next page disabled");
      break;
    }

    await nextBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    pageNum++;
  }

  return all;
}

export async function scrapeFENInvoices(opts: {
  monthsBack?: number;
} = {}): Promise<FENScrapeResult> {
  const debug: string[] = [];
  const monthsBack = opts.monthsBack ?? 1;

  if (!FEN_USERNAME || !FEN_PASSWORD) {
    return { success: false, error: "FEN_USERNAME/FEN_PASSWORD no configurados", debug };
  }

  let context: BrowserContext | null = null;

  try {
    context = await getContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    debug.push(`FEN_BASE_URL=${FEN_BASE_URL}`);

    const loggedIn = await ensureLogin(page, debug);
    if (!loggedIn) {
      return { success: false, error: "No se pudo iniciar sesión en FEN", debug };
    }

    const reached = await navigateToInvoicesList(page, debug);
    if (!reached) {
      return {
        success: false,
        error: "No se encontró la lista de facturas. Revisa los logs.",
        debug,
      };
    }

    const from = new Date();
    from.setMonth(from.getMonth() - monthsBack);
    await setDateRange(page, debug, from);

    const invoices = await paginateAll(page, debug);
    debug.push(`Total invoices scraped: ${invoices.length}`);

    return { success: true, invoices, debug };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      debug,
    };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}
