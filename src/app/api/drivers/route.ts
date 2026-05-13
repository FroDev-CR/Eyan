import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Driver from "@/models/Driver";
import { driverSchema, validateData } from "@/lib/validations";

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

// POST /api/drivers - Crear nuevo coordinador
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const validation = validateData(driverSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Verificar si ya existe un coordinador con el mismo email o licencia
    const existing = await Driver.findOne({
      $or: [
        { email: validation.data.email },
        { licenseNumber: validation.data.licenseNumber },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe un coordinador con ese email o número de licencia" },
        { status: 400 }
      );
    }

    const driver = await Driver.create(validation.data);

    return NextResponse.json(
      { success: true, data: driver },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear coordinador:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear coordinador" },
      { status: 500 }
    );
  }
}
