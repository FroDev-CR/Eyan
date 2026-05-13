import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Truck from "@/models/Truck";
import { truckSchema, validateData } from "@/lib/validations";

// GET /api/fleet - Listar todos los camiones
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (type && type !== "all") {
      filter.type = type;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { plateNumber: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    const trucks = await Truck.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: trucks });
  } catch (error) {
    console.error("Error al obtener camiones:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener camiones" },
      { status: 500 }
    );
  }
}

// POST /api/fleet - Crear nuevo camión
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const validation = validateData(truckSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const existing = await Truck.findOne({ plateNumber: validation.data.plateNumber });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe un camión con esa placa" },
        { status: 400 }
      );
    }

    const truck = await Truck.create(validation.data);

    return NextResponse.json({ success: true, data: truck }, { status: 201 });
  } catch (error) {
    console.error("Error al crear camión:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear camión" },
      { status: 500 }
    );
  }
}
