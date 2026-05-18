import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DosPinosCase from "@/models/DosPinosCase";
import "@/models/Driver";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const zone = searchParams.get("zone");
    const batch = searchParams.get("batch");
    const search = searchParams.get("search");
    const week = searchParams.get("week");
    const year = searchParams.get("year");
    const driver = searchParams.get("driver");

    const filter: Record<string, unknown> = {};

    if (status && status !== "all") filter.eyanStatus = status;
    if (zone && zone !== "all") filter.equipmentZone = zone;
    if (batch) filter.importBatch = batch;
    if (week) filter.week = parseInt(week);
    if (year) filter.year = parseInt(year);
    if (driver) filter.assignedDriverId = driver;
    if (search) {
      filter.$or = [
        { commercialName: { $regex: search, $options: "i" } },
        { accountName: { $regex: search, $options: "i" } },
        { clientAddress: { $regex: search, $options: "i" } },
        { appointmentNumber: { $regex: search, $options: "i" } },
      ];
    }

    // When filtering by coordinator, sort by their custom routeOrder first
    const sortBy: Record<string, 1 | -1> = driver
      ? { routeOrder: 1, caseNumber: 1 }
      : { caseNumber: 1 };

    const cases = await DosPinosCase.find(filter)
      .populate("assignedDriverId", "firstName lastName")
      .sort(sortBy);

    // Get distinct batches for filter UI
    const batches = await DosPinosCase.distinct("importBatch");
    const zones = await DosPinosCase.distinct("equipmentZone");

    return NextResponse.json({
      success: true,
      data: cases,
      meta: { batches, zones },
    });
  } catch (error) {
    console.error("Error al obtener casos Dos Pinos:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener casos" },
      { status: 500 }
    );
  }
}
