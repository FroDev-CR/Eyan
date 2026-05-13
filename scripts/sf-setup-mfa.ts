/**
 * Run once to login and save Salesforce session.
 * Usage: npm run sf:setup
 */
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

const SF_ORG_URL = process.env.SF_ORG_URL!;
const SF_USERNAME = process.env.SF_USERNAME!;
const SF_PASSWORD = process.env.SF_PASSWORD!;
const PROFILE_DIR = path.join(process.cwd(), ".playwright-session", "dos-pinos-profile");

async function main() {
  if (!SF_ORG_URL || !SF_USERNAME || !SF_PASSWORD) {
    console.error("Faltan variables SF_ORG_URL, SF_USERNAME o SF_PASSWORD en .env.local");
    process.exit(1);
  }

  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  // launchPersistentContext preserves full browser profile (cookies + fingerprint)
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await context.newPage();

  const loginUrl = `https://login.salesforce.com/?startURL=${encodeURIComponent(
    `${SF_ORG_URL}/lightning/o/Report/home`
  )}`;

  await page.goto(loginUrl);

  // Pre-fill credentials
  try {
    await page.waitForSelector("#username", { timeout: 8000 });
    await page.fill("#username", SF_USERNAME);
    await page.fill("#password", SF_PASSWORD);

    const rememberMe = page.locator("#rememberUn");
    if (await rememberMe.isVisible({ timeout: 1000 }).catch(() => false)) {
      await rememberMe.check();
    }

    await page.click("#Login");
    console.log("Credenciales enviadas.");
  } catch {
    console.log("Completa el login manualmente en el browser.");
  }

  // Auto-check "trust/remember device" on MFA pages
  const checkTrust = async () => {
    const selectors = [
      "#rememberUsBrowser",
      "input[name='rememberDevice']",
      "input[id*='rememberDevice']",
      "input[id*='trustDevice']",
      "input[type='checkbox'][name*='remember']",
      "input[type='checkbox'][name*='trust']",
    ];
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 300 }).catch(() => false)) {
        await el.check().catch(() => {});
        console.log(`"Recordar dispositivo" marcado.`);
        break;
      }
    }
  };

  page.on("load", checkTrust);

  const SF_REPORT_URL = process.env.SF_REPORT_URL;

  // Wait until inside the org
  console.log("Esperando login completo...");
  try {
    await page.waitForURL(/lightning\.force\.com/, { timeout: 120000 });
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    console.log("Login OK. Navegando al reporte para establecer sesión completa...");

    // Navigate to the actual report so all org cookies get set
    if (SF_REPORT_URL) {
      await page.goto(SF_REPORT_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    }

    // Give Chrome enough time to flush cookies to disk
    console.log("Guardando sesión (espera 8 segundos)...");
    await page.waitForTimeout(8000);

    console.log("✓ Sesión guardada en:", PROFILE_DIR);
    console.log("✓ Cerrando browser...");
    await context.close();
    console.log("✓ Listo. Usa el botón 'Sync Salesforce' en la app.");
  } catch (err) {
    console.error("Error:", (err as Error).message);
    await context.close().catch(() => {});
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
