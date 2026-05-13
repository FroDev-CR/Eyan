import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const doc = await DosPinosCase.findById(params.id).populate(
      "assignedDriverId",
      "firstName lastName"
    );
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Caso no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error("Error al obtener caso:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener caso" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const body = await request.json();

    const allowed = [
      "eyanStatus",
      "assignedDriverId",
      "notes",
      "completedAt",
      "movementType",
      "tipoEquipo",
      "lugarDeCarga",
      "distanciaPDV",
      "comentarioAdicional",
      "routeOrder",
    ];
    const update: Record<string, unknown> = {};
    for (const field of allowed) {
      if (field in body) update[field] = body[field];
    }

    if (
      (body.eyanStatus === "completed" || body.eyanStatus === "failed") &&
      !update.completedAt
    ) {
      update.completedAt = new Date();
    }

    const updated = await DosPinosCase.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).populate("assignedDriverId", "firstName lastName");

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Caso no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error al actualizar caso:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar caso" },
      { status: 500 }
    );
  }
}
