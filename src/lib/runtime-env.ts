/**
 * Detecta si estamos en un entorno serverless donde Playwright no funciona.
 * Vercel inyecta VERCEL=1 en runtime. AWS Lambda inyecta AWS_LAMBDA_FUNCTION_NAME.
 */
export function isServerlessEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Permite override explícito (ej. self-hosted con Chromium instalado).
 * Set ALLOW_SCRAPERS=true para forzar habilitación.
 */
export function scrapersEnabled(): boolean {
  if (process.env.ALLOW_SCRAPERS === "true") return true;
  return !isServerlessEnvironment();
}

export const SCRAPER_DISABLED_MESSAGE =
  "Scrapers deshabilitados en este entorno (serverless). Ejecuta el scrape localmente apuntando a la base de datos de producción.";
