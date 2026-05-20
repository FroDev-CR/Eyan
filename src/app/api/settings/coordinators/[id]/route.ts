import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User, Driver, DosPinosCase } from "@/models";
import { coordinatorUpdateSchema, validateData } from "@/lib/validations";
import { buildEyanEmail } from "@/lib/coordinators/eyan-email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

/** PATCH — Actualizar coordinador y acceso al app */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;

  const driver = await Driver.findById(id);
  if (!driver) {
    return NextResponse.json({ success: false, error: "Coordinador no encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const validation = validateData(coordinatorUpdateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const data = validation.data;
  const user = await User.findOne({ driverId: id, role: "driver" });

  if (data.firstName) driver.firstName = data.firstName;
  if (data.lastName) driver.lastName = data.lastName;
  if (data.phone) driver.phone = data.phone;

  if (data.emailLocal) {
    const email = buildEyanEmail(data.emailLocal);
    const emailTaken = await User.findOne({ email, _id: user ? { $ne: user._id } : undefined });
    const driverEmailTaken = await Driver.findOne({ email, _id: { $ne: id } });
    if (emailTaken || driverEmailTaken) {
      return NextResponse.json(
        { success: false, error: "Ese correo @eyan.com ya está en uso" },
        { status: 400 }
      );
    }
    driver.email = email;
    if (user) {
      user.email = email;
      user.name = `${driver.firstName} ${driver.lastName}`;
    }
  } else if (data.firstName || data.lastName) {
    if (user) user.name = `${driver.firstName} ${driver.lastName}`;
  }

  await driver.save();

  if (user) {
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.password) user.password = await bcrypt.hash(data.password, 10);
    await user.save();
  }

  return NextResponse.json({ success: true, message: "Coordinador actualizado" });
}

/** DELETE — Eliminar coordinador y su usuario */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();
  const { id } = await params;

  const driver = await Driver.findById(id);
  if (!driver) {
    return NextResponse.json({ success: false, error: "Coordinador no encontrado" }, { status: 404 });
  }

  await User.deleteMany({ driverId: id, role: "driver" });
  await DosPinosCase.updateMany({ assignedDriverId: id }, { $set: { assignedDriverId: null } });
  await Driver.findByIdAndDelete(id);

  return NextResponse.json({ success: true, message: "Coordinador eliminado" });
}
