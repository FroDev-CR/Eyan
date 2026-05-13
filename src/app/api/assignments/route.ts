import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Assignment from "@/models/Assignment";
import { assignmentSchema, validateData } from "@/lib/validations";

// GET /api/assignments
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const driverId = searchParams.get("driverId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (driverId) {
      filter.driverId = driverId;
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        (filter.date as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        (filter.date as Record<string, Date>).$lte = endDate;
      }
    }

    const assignments = await Assignment.find(filter)
      .populate("driverId", "firstName lastName email phone status")
      .populate("truckId", "name plateNumber status type")
      .populate("routeId", "name origin destination estimatedDuration distance")
      .populate("createdBy", "name email")
      .sort({ date: 1, startTime: 1 });

    return NextResponse.json({ success: true, data: assignments });
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener asignaciones" },
      { status: 500 }
    );
  }
}

// POST /api/assignments
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validation = validateData(assignmentSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Crear asignación con el ID del usuario que la creó
    const assignmentData = {
      ...validation.data,
      date: new Date(validation.data.date),
      createdBy: session.user.id,
    };

    const assignment = await Assignment.create(assignmentData);

    // Populate para devolver datos completos
    await assignment.populate([
      { path: "driverId", select: "firstName lastName email phone status" },
      { path: "truckId", select: "name plateNumber status type" },
      { path: "routeId", select: "name origin destination estimatedDuration distance" },
      { path: "createdBy", select: "name email" },
    ]);

    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (error) {
    console.error("Error al crear asignación:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear asignación" },
      { status: 500 }
    );
  }
}
