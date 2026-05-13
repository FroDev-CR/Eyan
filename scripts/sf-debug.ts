import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

const SF_REPORT_URL = process.env.SF_REPORT_URL!;
const PROFILE_DIR = path.join(process.cwd(), ".playwright-session", "dos-pinos-profile");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
  });

  const page = await context.newPage();
  await page.goto(SF_REPORT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Screenshot 1 — reporte cargado
  await page.screenshot({ path: path.join(process.cwd(), "scripts", "debug-1-report.png") });
  console.log("Screenshot 1 guardado (reporte cargado)");

  // Dump todos los botones
  const buttons = await page.locator("button").all();
  console.log(`\nBotones en página (${buttons.length}):`);
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => "");
    const title = await btn.getAttribute("title").catch(() => "");
    const ariaLabel = await btn.getAttribute("aria-label").catch(() => "");
    const visible = await btn.isVisible().catch(() => false);
    if (visible) {
      console.log(`  text:"${text?.trim()}" title:"${title}" aria:"${ariaLabel}"`);
    }
  }

  await context.close();
}

main().catch(console.error);
