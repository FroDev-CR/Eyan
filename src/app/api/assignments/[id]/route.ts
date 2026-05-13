import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Assignment from "@/models/Assignment";
import { assignmentSchema, validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/assignments/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const assignment = await Assignment.findById(id)
      .populate("driverId", "firstName lastName email phone status")
      .populate("truckId", "name plateNumber status type")
      .populate("routeId", "name origin destination estimatedDuration distance")
      .populate("createdBy", "name email");

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error("Error al obtener asignación:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener asignación" },
      { status: 500 }
    );
  }
}

// PUT /api/assignments/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();

    // Si solo se está actualizando el estado, permitir sin validación completa
    if (body.status && Object.keys(body).length === 1) {
      const assignment = await Assignment.findByIdAndUpdate(
        id,
        { status: body.status },
        { new: true, runValidators: true }
      ).populate([
        { path: "driverId", select: "firstName lastName email phone status" },
        { path: "truckId", select: "name plateNumber status type" },
        { path: "routeId", select: "name origin destination estimatedDuration distance" },
        { path: "createdBy", select: "name email" },
      ]);

      if (!assignment) {
        return NextResponse.json(
          { success: false, error: "Asignación no encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: assignment });
    }

    // Validación completa para otras actualizaciones
    const validation = validateData(assignmentSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const updateData = {
      ...validation.data,
      date: new Date(validation.data.date),
    };

    const assignment = await Assignment.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "driverId", select: "firstName lastName email phone status" },
      { path: "truckId", select: "name plateNumber status type" },
      { path: "routeId", select: "name origin destination estimatedDuration distance" },
      { path: "createdBy", select: "name email" },
    ]);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error("Error al actualizar asignación:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar asignación" },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const assignment = await Assignment.findByIdAndDelete(id);

    if (!assignment) {
      return NextResponse.json(
        { success: false, error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Asignación eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar asignación:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar asignación" },
      { status: 500 }
    );
  }
}
