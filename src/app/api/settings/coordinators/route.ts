import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User, Driver } from "@/models";
import { coordinatorCreateSchema, validateData } from "@/lib/validations";
import {
  buildEyanEmail,
  defaultLicenseForCoordinator,
  parseEyanEmail,
} from "@/lib/coordinators/eyan-email";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return null;
  }
  return session;
}

/** GET — Coordinadores con usuario de acceso vinculado */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();

  const drivers = await Driver.find().sort({ firstName: 1, lastName: 1 }).lean();
  const users = await User.find({ role: "driver" }).select("-password").lean();
  const userByDriver = new Map(
    users.filter((u) => u.driverId).map((u) => [String(u.driverId), u])
  );

  const data = drivers.map((d) => {
    const user = userByDriver.get(String(d._id));
    const parsed = user ? parseEyanEmail(user.email) : null;
    return {
      driver: {
        _id: d._id,
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        status: d.status,
      },
      user: user
        ? {
            _id: user._id,
            email: user.email,
            emailLocal: parsed?.localPart ?? "",
            isActive: user.isActive,
          }
        : null,
    };
  });

  return NextResponse.json({ success: true, data });
}

/** POST — Crear coordinador + usuario @eyan.com */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "No autorizado" }, { status: 403 });
  }

  await dbConnect();

  const body = await request.json();
  const validation = validateData(coordinatorCreateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const { firstName, lastName, phone, emailLocal, password } = validation.data;
  const email = buildEyanEmail(emailLocal);
  const license = defaultLicenseForCoordinator(emailLocal);

  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    return NextResponse.json(
      { success: false, error: "Ya existe un usuario con ese correo" },
      { status: 400 }
    );
  }

  const existingDriver = await Driver.findOne({
    $or: [{ email }, { licenseNumber: license.licenseNumber }],
  });
  if (existingDriver) {
    return NextResponse.json(
      { success: false, error: "Ya existe un coordinador con ese correo" },
      { status: 400 }
    );
  }

  const driver = await Driver.create({
    firstName,
    lastName,
    phone,
    email,
    licenseNumber: license.licenseNumber,
    licenseExpiry: new Date(license.licenseExpiry),
    status: "available",
  });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: `${firstName} ${lastName}`,
    email,
    password: hashed,
    role: "driver",
    driverId: driver._id,
    isActive: true,
  });

  await Driver.findByIdAndUpdate(driver._id, { userId: user._id });

  return NextResponse.json(
    {
      success: true,
      data: {
        driver: {
          _id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phone: driver.phone,
          status: driver.status,
        },
        user: {
          _id: user._id,
          email: user.email,
          emailLocal,
          isActive: user.isActive,
        },
      },
    },
    { status: 201 }
  );
}
