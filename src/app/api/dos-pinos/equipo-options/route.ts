import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { DosPinosEquipoOption } from "@/models";
import { EQUIPO_TIPO_BASE } from "@/constants/dos-pinos-report";

// GET /api/dos-pinos/equipo-options
// Devuelve opciones base + personalizadas (DB), deduplicadas, en orden.
export async function GET() {
  try {
    await dbConnect();
    const custom = await DosPinosEquipoOption.find({}, { value: 1 })
      .sort({ value: 1 })
      .lean();

    const seen = new Set<string>();
    const options: string[] = [];
    for (const v of [...EQUIPO_TIPO_BASE, ...custom.map((c) => c.value)]) {
      const t = (v ?? "").trim();
      if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      options.push(t);
    }

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error("Error al listar opciones de equipo:", error);
    return NextResponse.json(
      { success: false, error: "Error al listar opciones" },
      { status: 500 }
    );
  }
}

// POST /api/dos-pinos/equipo-options  { value: string }
// Añade categoría personalizada (global). Idempotente: si existe, no duplica.
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => null);
    const value = String(body?.value ?? "").trim();

    if (!value) {
      return NextResponse.json(
        { success: false, error: "Valor requerido" },
        { status: 400 }
      );
    }
    if (value.length > 60) {
      return NextResponse.json(
        { success: false, error: "Máximo 60 caracteres" },
        { status: 400 }
      );
    }

    // No duplicar base ni personalizadas (case-insensitive)
    const isBase = (EQUIPO_TIPO_BASE as readonly string[]).some(
      (b) => b.toLowerCase() === value.toLowerCase()
    );
    if (!isBase) {
      const exists = await DosPinosEquipoOption.findOne({
        value: { $regex: `^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      });
      if (!exists) {
        await DosPinosEquipoOption.create({ value });
      }
    }

    const custom = await DosPinosEquipoOption.find({}, { value: 1 })
      .sort({ value: 1 })
      .lean();
    const seen = new Set<string>();
    const options: string[] = [];
    for (const v of [...EQUIPO_TIPO_BASE, ...custom.map((c) => c.value)]) {
      const t = (v ?? "").trim();
      if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      options.push(t);
    }

    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    console.error("Error al añadir opción de equipo:", error);
    return NextResponse.json(
      { success: false, error: "Error al añadir opción" },
      { status: 500 }
    );
  }
}
