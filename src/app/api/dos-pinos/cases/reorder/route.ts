import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";

export async function PATCH(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { orders } = body as { orders: { caseId: string; routeOrder: number }[] };

    if (!Array.isArray(orders)) {
      return NextResponse.json(
        { success: false, error: "Formato inválido: se requiere 'orders' array" },
        { status: 400 }
      );
    }

    const ops = orders.map((o) => ({
      updateOne: {
        filter: { _id: o.caseId },
        update: { $set: { routeOrder: o.routeOrder } },
      },
    }));

    if (ops.length === 0) {
      return NextResponse.json({ success: true, data: { updated: 0 } });
    }

    const result = await DosPinosCase.bulkWrite(ops);

    return NextResponse.json({
      success: true,
      data: { updated: result.modifiedCount },
    });
  } catch (error) {
    console.error("Error al reordenar casos:", error);
    return NextResponse.json(
      { success: false, error: "Error al reordenar" },
      { status: 500 }
    );
  }
}
