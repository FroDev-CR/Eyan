import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Route from "@/models/Route";
import { routeSchema, validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/routes/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const route = await Route.findById(id);

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Ruta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: route });
  } catch (error) {
    console.error("Error al obtener ruta:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener ruta" },
      { status: 500 }
    );
  }
}

// PUT /api/routes/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const validation = validateData(routeSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const route = await Route.findByIdAndUpdate(id, validation.data, {
      new: true,
      runValidators: true,
    });

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Ruta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: route });
  } catch (error) {
    console.error("Error al actualizar ruta:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar ruta" },
      { status: 500 }
    );
  }
}

// DELETE /api/routes/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const route = await Route.findByIdAndDelete(id);

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Ruta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ruta eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar ruta" },
      { status: 500 }
    );
  }
}
