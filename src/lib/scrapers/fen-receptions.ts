import { chromium, BrowserContext, Page, Locator } from "playwright";
import path from "path";
import fs from "fs";

const PROFILE_DIR = path.join(process.cwd(), ".playwright-session", "fen-receptions-profile");
const FEN_BASE_URL = process.env.FEN_BASE_URL || "https://app.facturaenlanube.com";
const FEN_USERNAME = process.env.FEN_USERNAME!;
const FEN_PASSWORD = process.env.FEN_PASSWORD!;

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

  if (page.url().includes("r=inicio") && !page.url().includes("login")) {
    const userText = await page.locator("body").textContent({ timeout: 3000 }).catch(() => "");
    if (userText && userText.includes("Usuario")) {
      debug.push("Already logged in");
      return true;
    }
  }

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

  if (page.url().includes("login") || page.url().includes("site/login")) {
    debug.push("Login failed — still on login page");
    return false;
  }

  return true;
}

function formatDateInput(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function findReportRecepciones(page: Page, debug: string[]): Promise<Locator | null> {
  const candidates = [
    'text="Recepciones (Gastos recibidos)"',
    'text=Recepciones',
    '//a[contains(normalize-space(.), "Recepciones") and contains(normalize-space(.), "Gastos")]',
    '//div[contains(normalize-space(.), "Recepciones") and contains(normalize-space(.), "Gastos")]',
  ];

  for (const sel of candidates) {
    const loc = sel.startsWith("//") ? page.locator(sel) : page.locator(sel);
    const ok = await loc.first().isVisible().catch(() => false);
    debug.push(`Tried candidate ${sel} → visible=${ok}`);
    if (ok) return loc.first();
  }
  return null;
}

async function findExcelButtonWithin(reportLoc: Locator, page: Page, debug: string[]) {
  // Try anchors/buttons inside the report card
  const els = reportLoc.locator('a,button').all();
  const count = await els.then((l: any) => l.count()).catch(() => 0);
  for (let i = 0; i < count; i++) {
    const el = reportLoc.locator('a,button').nth(i);
    const text = (await el.innerText().catch(() => "")).toLowerCase();
    const href = (await el.getAttribute('href').catch(() => null)) || '';
    debug.push(`Anchor/button[${i}] text='${text}' href='${href}'`);
    if (href && href.toLowerCase().endsWith('.xlsx')) return el;
    if (text.includes('excel') || text.includes('xls') || text.includes('xlsx')) return el;
  }

  // Fallback: look for excel icon elements nearby
  const icon = reportLoc.locator('i[class*="excel"], i[class*="xls"], img[alt*="excel"]');
  if (await icon.first().isVisible().catch(() => false)) {
    // click parent link
    const parent = icon.first().locator('..');
    return parent.first();
  }

  return null;
}

export async function scrapeReceptionsExcel(opts: { daysBack?: number; saveToDocs?: boolean } = {}) {
  const daysBack = opts.daysBack ?? 7;
  const saveToDocs = opts.saveToDocs ?? true;
  const debug: string[] = [];

  if (!FEN_USERNAME || !FEN_PASSWORD) {
    return { success: false, error: "FEN_USERNAME/FEN_PASSWORD not set", debug };
  }

  let context: BrowserContext | null = null;
  try {
    context = await getContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    const loggedIn = await ensureLogin(page, debug);
    if (!loggedIn) return { success: false, error: "Login failed", debug };

    const reportesUrl = `${FEN_BASE_URL}/index.php?r=reportes/buscarReportes`;
    await page.goto(reportesUrl, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(() => {});
    debug.push(`Reportes URL: ${page.url()}`);

    const reportLoc = await findReportRecepciones(page, debug);
    if (!reportLoc) return { success: false, error: "Could not find Recepciones report link", debug };

    // Try to find the excel icon/button inside the report card
    let excelBtn = await findExcelButtonWithin(reportLoc, page, debug);

    // If not found, click the report card to reveal actions and try again
    if (!excelBtn) {
      debug.push("Excel button not found inside card; clicking card to reveal options");
      await reportLoc.click().catch(() => {});
      await page.waitForTimeout(500);
      excelBtn = await findExcelButtonWithin(reportLoc, page, debug);
    }

    if (!excelBtn) return { success: false, error: "Could not locate Excel export button", debug };

    // Click excel button — it should open a modal with date filters
    await excelBtn.scrollIntoViewIfNeeded().catch(() => {});
    await excelBtn.click().catch(() => {});
    debug.push('Clicked excel button');

    // Wait for modal
    const modal = page.locator('text=Filtros del reporte').first();
    await page.waitForTimeout(400);
    const modalVisible = await modal.isVisible().catch(() => false);
    debug.push(`Modal visible (Filtros del reporte): ${modalVisible}`);

    // Fallback: find first visible modal dialog
    let modalRoot = modalVisible ? modal.locator('..') : page.locator('.modal:visible').first();

    // Find date inputs inside modal
    const inputs = modalRoot.locator('input[type="text"]').all();
    const inputsCount = await inputs.then((l: any) => l.count()).catch(() => 0);
    debug.push(`Found ${inputsCount} text inputs inside modal/root`);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);
    const fromStr = formatDateInput(fromDate);
    const toStr = formatDateInput(new Date());

    // Try to fill two date inputs matching dd/mm/yyyy pattern
    if (inputsCount >= 2) {
      const fromInput = modalRoot.locator('input[type="text"]').nth(0);
      const toInput = modalRoot.locator('input[type="text"]').nth(1);
      await fromInput.fill(fromStr).catch(() => {});
      await toInput.fill(toStr).catch(() => {});
      debug.push(`Filled modal dates: ${fromStr} → ${toStr}`);
    } else {
      debug.push('Could not find two date inputs to fill');
    }

    // Click Aceptar and wait for download
    const acceptBtn = modalRoot.locator('button:has-text("Aceptar"), button:has-text("Aceptar")').first();
    if (!acceptBtn) return { success: false, error: "Could not find Aceptar button in modal", debug };

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }).catch(() => null),
      acceptBtn.click().catch(() => {}),
    ]);

    if (!download) return { success: false, error: "No download started after accepting modal", debug };

    const suggested = download.suggestedFilename ? download.suggestedFilename() : 'recepciones.xlsx';
    const docsDir = path.join(process.cwd(), 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const saveName = `recepciones_${stamp}_${suggested}`;
    const savePath = path.join(docsDir, saveName);
    await download.saveAs(savePath);
    debug.push(`Saved download to ${savePath}`);

    return { success: true, filePath: savePath, debug };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e), debug };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

export default scrapeReceptionsExcel;
