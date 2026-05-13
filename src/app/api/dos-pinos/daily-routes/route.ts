import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";
import DosPinosDailyRoute from "@/models/DosPinosDailyRoute";
import "@/models/Driver";

function dateOnly(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

// POST /api/dos-pinos/daily-routes — Coordinator finalizes their route for a date
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { coordinatorId, date, notes } = body as {
      coordinatorId: string;
      date?: string;
      notes?: string;
    };

    if (!coordinatorId) {
      return NextResponse.json(
        { success: false, error: "coordinatorId requerido" },
        { status: 400 }
      );
    }

    const targetDate = dateOnly(date ? new Date(date) : new Date());
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Find all reported cases for coordinator on that date
    const cases = await DosPinosCase.find({
      assignedDriverId: coordinatorId,
      eyanStatus: { $in: ["completed", "failed"] },
      completedAt: { $gte: targetDate, $lt: nextDay },
    }).sort({ routeOrder: 1, completedAt: 1 });

    if (cases.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay tareas reportadas para esta fecha" },
        { status: 400 }
      );
    }

    const completedCases = cases.filter((c) => c.eyanStatus === "completed").length;
    const failedCases = cases.filter((c) => c.eyanStatus === "failed").length;

    // Upsert: one route per coordinator per day
    const route = await DosPinosDailyRoute.findOneAndUpdate(
      { coordinatorId, date: targetDate },
      {
        $set: {
          caseIds: cases.map((c) => c._id),
          totalCases: cases.length,
          completedCases,
          failedCases,
          finalizedAt: new Date(),
          notes,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: route });
  } catch (error) {
    console.error("Error al finalizar ruta:", error);
    return NextResponse.json(
      { success: false, error: "Error al finalizar ruta" },
      { status: 500 }
    );
  }
}

// GET /api/dos-pinos/daily-routes — List finalized routes (admin view)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get("coordinatorId");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: Record<string, unknown> = {};
    if (coordinatorId) filter.coordinatorId = coordinatorId;
    if (date) {
      const d = dateOnly(new Date(date));
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    } else if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = dateOnly(new Date(from));
      if (to) {
        const t = dateOnly(new Date(to));
        t.setDate(t.getDate() + 1);
        range.$lt = t;
      }
      filter.date = range;
    }

    const routes = await DosPinosDailyRoute.find(filter)
      .populate("coordinatorId", "firstName lastName")
      .sort({ date: -1, finalizedAt: -1 });

    return NextResponse.json({ success: true, data: routes });
  } catch (error) {
    console.error("Error al listar rutas diarias:", error);
    return NextResponse.json(
      { success: false, error: "Error al listar rutas" },
      { status: 500 }
    );
  }
}
