import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Driver from "@/models/Driver";
import { driverSchema, validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/drivers/[id] - Obtener un coordinador
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const driver = await Driver.findById(id);

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Coordinador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: driver });
  } catch (error) {
    console.error("Error al obtener coordinador:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener coordinador" },
      { status: 500 }
    );
  }
}

// PUT /api/drivers/[id] - Actualizar un coordinador
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const validation = validateData(driverSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Verificar duplicados (excluyendo el coordinador actual)
    const existing = await Driver.findOne({
      _id: { $ne: id },
      $or: [
        { email: validation.data.email },
        { licenseNumber: validation.data.licenseNumber },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe otro coordinador con ese email o número de licencia" },
        { status: 400 }
      );
    }

    const driver = await Driver.findByIdAndUpdate(
      id,
      validation.data,
      { new: true, runValidators: true }
    );

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Coordinador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: driver });
  } catch (error) {
    console.error("Error al actualizar coordinador:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar coordinador" },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] - Eliminar un coordinador
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const driver = await Driver.findByIdAndDelete(id);

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Coordinador no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coordinador eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar coordinador:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar coordinador" },
      { status: 500 }
    );
  }
}
