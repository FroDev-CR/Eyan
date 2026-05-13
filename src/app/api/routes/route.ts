import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Route from "@/models/Route";
import { routeSchema, validateData } from "@/lib/validations";

// GET /api/routes
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {};
    if (isActive !== null && isActive !== "all") {
      filter.isActive = isActive === "true";
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { origin: { $regex: search, $options: "i" } },
        { destination: { $regex: search, $options: "i" } },
      ];
    }

    const routes = await Route.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: routes });
  } catch (error) {
    console.error("Error al obtener rutas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener rutas" },
      { status: 500 }
    );
  }
}

// POST /api/routes
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const validation = validateData(routeSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const route = await Route.create(validation.data);

    return NextResponse.json({ success: true, data: route }, { status: 201 });
  } catch (error) {
    console.error("Error al crear ruta:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear ruta" },
      { status: 500 }
    );
  }
}
