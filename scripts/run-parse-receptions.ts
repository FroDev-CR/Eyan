import path from "path";
import parseReceptionsExcel from "../src/lib/scrapers/parse-receptions";

async function main() {
  try {
    const file = path.join(process.cwd(), "docs", "Listado de Recepciones.xlsx");
    console.log("Parsing file:", file);
    const { headers, rows } = parseReceptionsExcel(file);
    console.log(`Found headers (${headers.length}):`, headers.slice(0, 10));
    console.log(`Parsed rows: ${rows.length}`);
    console.log("First 3 rows:", rows.slice(0, 3));
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

main();
