import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Truck from "@/models/Truck";
import { truckSchema, validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/fleet/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const truck = await Truck.findById(id);

    if (!truck) {
      return NextResponse.json(
        { success: false, error: "Camión no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: truck });
  } catch (error) {
    console.error("Error al obtener camión:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener camión" },
      { status: 500 }
    );
  }
}

// PUT /api/fleet/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const validation = validateData(truckSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const existing = await Truck.findOne({
      _id: { $ne: id },
      plateNumber: validation.data.plateNumber,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe otro camión con esa placa" },
        { status: 400 }
      );
    }

    const truck = await Truck.findByIdAndUpdate(id, validation.data, {
      new: true,
      runValidators: true,
    });

    if (!truck) {
      return NextResponse.json(
        { success: false, error: "Camión no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: truck });
  } catch (error) {
    console.error("Error al actualizar camión:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar camión" },
      { status: 500 }
    );
  }
}

// DELETE /api/fleet/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const truck = await Truck.findByIdAndDelete(id);

    if (!truck) {
      return NextResponse.json(
        { success: false, error: "Camión no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Camión eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar camión:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar camión" },
      { status: 500 }
    );
  }
}
