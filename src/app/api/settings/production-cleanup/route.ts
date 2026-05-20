import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { DosPinosCase, DosPinosDailyRoute, Driver, User } from "@/models";

/** POST — Limpieza para pasar a producción (solo admin) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  let body: { dosPinos?: boolean; coordinators?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* defaults below */
  }

  const cleanDosPinos = body.dosPinos === true;
  const cleanCoordinators = body.coordinators === true;

  if (!cleanDosPinos && !cleanCoordinators) {
    return NextResponse.json(
      { success: false, error: "Indica qué limpiar: dosPinos y/o coordinators" },
      { status: 400 }
    );
  }

  await dbConnect();

  const result: Record<string, number> = {};

  if (cleanDosPinos) {
    const [casesResult, routesResult] = await Promise.all([
      DosPinosCase.deleteMany({}),
      DosPinosDailyRoute.deleteMany({}),
    ]);
    result.casesDeleted = casesResult.deletedCount;
    result.routesDeleted = routesResult.deletedCount;
  }

  if (cleanCoordinators) {
    const usersResult = await User.deleteMany({ role: "driver" });
    const driversResult = await Driver.deleteMany({});
    const unassigned = await DosPinosCase.updateMany(
      { assignedDriverId: { $exists: true, $ne: null } },
      { $set: { assignedDriverId: null } }
    );

    result.coordinatorUsersDeleted = usersResult.deletedCount;
    result.coordinatorsDeleted = driversResult.deletedCount;
    result.casesUnassigned = unassigned.modifiedCount;
  }

  return NextResponse.json({ success: true, data: result });
}
