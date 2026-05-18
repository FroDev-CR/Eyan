import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { ExpenseInvoice, ExpenseSync } from "@/models";
import parseReceptionsExcel from "@/lib/scrapers/parse-receptions";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export const dynamic = "force-dynamic";

// POST /api/contabilidad/expenses/scrape - Procesa un Excel subido con gastos
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: "Solo se aceptan archivos Excel (.xlsx, .xls)" },
        { status: 400 }
      );
    }

    // Guardar archivo temporalmente
    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpFile = join(tmpdir(), `expenses_${Date.now()}.xlsx`);
    writeFileSync(tmpFile, buffer);

    // Parsear
    const { headers, rows } = parseReceptionsExcel(tmpFile);

    // Retornar preview de datos parseados
    return NextResponse.json({
      success: true,
      data: {
        headers,
        rows: rows.slice(0, 100), // Preview de primeras 100 filas
        totalRows: rows.length,
      },
    });
  } catch (e) {
    console.error("Error parsing expenses file:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

