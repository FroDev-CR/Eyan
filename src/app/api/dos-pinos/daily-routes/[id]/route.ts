import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DosPinosDailyRoute from "@/models/DosPinosDailyRoute";
import "@/models/Driver";
import "@/models/DosPinosCase";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const route = await DosPinosDailyRoute.findById(params.id)
      .populate("coordinatorId", "firstName lastName phone email")
      .populate({
        path: "caseIds",
        options: { sort: { routeOrder: 1, completedAt: 1 } },
      });

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
