import { chromium, BrowserContext } from "playwright";
import * as xlsx from "xlsx";
import path from "path";
import fs from "fs";

const PROFILE_DIR = path.join(process.cwd(), ".playwright-session", "dos-pinos-profile");
const SF_ORG_URL = process.env.SF_ORG_URL!;
const SF_REPORT_URL = process.env.SF_REPORT_URL!;

export interface ScrapeResult {
  success: boolean;
  rows?: Record<string, unknown>[];
  headers?: string[];
  error?: string;
  requiresMFA?: boolean;
}

function hasProfile(): boolean {
  return fs.existsSync(PROFILE_DIR) && fs.readdirSync(PROFILE_DIR).length > 0;
}

async function getContext(): Promise<BrowserContext> {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function isLoggedIn(context: BrowserContext): Promise<boolean> {
  const page = await context.newPage();
  try {
    await page.goto(SF_REPORT_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    const url = page.url();
    return !url.includes("login") && !url.includes("secur/login");
  } catch {
    return false;
  } finally {
    await page.close();
  }
}

async function exportReport(context: BrowserContext): Promise<Buffer | null> {
  const page = await context.newPage();
  try {
    await page.goto(SF_REPORT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});

    // Wait for report to render — "Modificar" confirms full load
    await page.waitForSelector(
      'button:has-text("Modificar"), button:has-text("Edit")',
      { timeout: 20000 }
    );
    await page.waitForTimeout(500);

    // Click the ▼ dropdown trigger next to "Modificar"
    // SF Lightning split button: last button in the group containing "Modificar"
    const modifyBtn = page.locator('button:has-text("Modificar"), button:has-text("Edit")').first();
    const dropdownTrigger = modifyBtn.locator("xpath=following-sibling::button").first();

    if (await dropdownTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dropdownTrigger.click();
    } else {
      // Fallback: any aria-haspopup button near top of page
      const popupBtns = page.locator('button[aria-haspopup="true"]');
      const count = await popupBtns.count();
      for (let i = count - 1; i >= 0; i--) {
        const btn = popupBtns.nth(i);
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click();
          break;
        }
      }
    }

    await page.waitForTimeout(600);

    // Click "Exportar" menu item
    const exportItem = page
      .locator('a:has-text("Exportar"), span:has-text("Exportar"), li:has-text("Exportar")')
      .first();
    await exportItem.waitFor({ state: "visible", timeout: 5000 });
    await exportItem.click();
    await page.waitForTimeout(800);

    // Handle export format modal if it appears
    const modal = page.locator('[role="dialog"]').first();
    if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Prefer Excel format
      const excelOpt = modal.locator('input[value*="xlsx"], input[value*="xls"], label:has-text("Excel format") input').first();
      if (await excelOpt.isVisible({ timeout: 1500 }).catch(() => false)) {
        await excelOpt.click();
      }
      // Confirm export
      const confirmBtn = modal.locator('button:has-text("Exportar"), button:has-text("Export")').first();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30000 }),
        confirmBtn.click(),
      ]);
      return await readDownload(download);
    }

    // No modal — direct download
    const download = await page.waitForEvent("download", { timeout: 20000 });
    return await readDownload(download);
  } catch (err) {
    await page.close();
    throw err;
  } finally {
    await page.close().catch(() => {});
  }
}

async function readDownload(download: { createReadStream(): Promise<NodeJS.ReadableStream> }): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function parseExportBuffer(buffer: Buffer): { rows: Record<string, unknown>[]; headers: string[] } {
  try {
    const wb = xlsx.read(buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    if (rows.length < 2) return { rows: [], headers: [] };
    const headers = rows[0] as string[];
    const data = rows.slice(1).map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = (row as unknown[])[i]; });
      return obj;
    });
    return { rows: data, headers };
  } catch {
    const text = buffer.toString("utf-8");
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { rows: [], headers: [] };
    const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = values[i]; });
      return obj;
    });
    return { rows: data, headers };
  }
}

export async function scrapeSalesforceDospinosReport(): Promise<ScrapeResult> {
  if (!hasProfile()) {
    return {
      success: false,
      requiresMFA: true,
      error: "No hay sesión guardada. Ejecuta: npm run sf:setup",
    };
  }

  let context: BrowserContext | null = null;
  try {
    context = await getContext();

    const loggedIn = await isLoggedIn(context);
    if (!loggedIn) {
      await context.close();
      return {
        success: false,
        requiresMFA: true,
        error: "Sesión expirada. Ejecuta: npm run sf:setup",
      };
    }

    const fileBuffer = await exportReport(context);
    await context.close();

    if (!fileBuffer) {
      return { success: false, error: "No se encontró el botón de exportar en el reporte" };
    }

    const { rows, headers } = parseExportBuffer(fileBuffer);
    return { success: true, rows, headers };
  } catch (err) {
    if (context) await context.close().catch(() => {});
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}
