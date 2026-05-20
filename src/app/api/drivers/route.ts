import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Driver from "@/models/Driver";

// GET /api/drivers - Listar todos los coordinadores
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Construir filtro
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    const drivers = await Driver.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: drivers });
  } catch (error) {
    console.error("Error al obtener coordinadores:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener coordinadores" },
      { status: 500 }
    );
  }
}

// POST /api/drivers — deshabilitado; usar /api/settings/coordinators
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(
    {
      success: false,
      error: "Usa Configuración → Coordinadores para dar de alta coordinadores con acceso @eyan.com",
    },
    { status: 400 }
  );
}
