import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { DosPinosCase, DosPinosDailyRoute } from "@/models";

// POST /api/dos-pinos/reset - Borra todos los casos + rutas finalizadas (admin only)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    await dbConnect();

    const [casesResult, routesResult] = await Promise.all([
      DosPinosCase.deleteMany({}),
      DosPinosDailyRoute.deleteMany({}),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        casesDeleted: casesResult.deletedCount,
        routesDeleted: routesResult.deletedCount,
      },
    });
  } catch (error) {
    console.error("Error al resetear Dos Pinos:", error);
    return NextResponse.json(
      { success: false, error: "Error al resetear datos" },
      { status: 500 }
    );
  }
}
