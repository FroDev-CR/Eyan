import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const raw = await import("../src/lib/scrapers/fen-receptions-http");
  const mod = raw.default || raw;
  console.log('scraper module loaded:', Object.keys(mod));
  const { jar, debug } = await mod.loginAndFetchHome();
  console.log("login debug", debug.join(" | "));

  const result = await mod.downloadRecepcionesExcel(jar, 7);
  console.log("download result", result);
  if (result.success) {
    console.log("saved file:", result.filePath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
