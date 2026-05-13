import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User, Driver } from "@/models";
import { userSchema, validateData } from "@/lib/validations";

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = {};
    if (role && role !== "all") filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .populate("driverId", "firstName lastName phone email")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validation = validateData(userSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Email unique check
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    // Driver-role rules
    if (data.role === "driver") {
      if (!data.driverId) {
        return NextResponse.json(
          { success: false, error: "El rol coordinador requiere un coordinador vinculado" },
          { status: 400 }
        );
      }
      const driver = await Driver.findById(data.driverId);
      if (!driver) {
        return NextResponse.json(
          { success: false, error: "Coordinador vinculado no existe" },
          { status: 400 }
        );
      }
      const linked = await User.findOne({ driverId: data.driverId });
      if (linked) {
        return NextResponse.json(
          { success: false, error: "Ese coordinador ya tiene un usuario vinculado" },
          { status: 400 }
        );
      }
    } else if (data.driverId) {
      // Non-driver roles cannot have driverId
      return NextResponse.json(
        { success: false, error: "Solo el rol coordinador puede vincularse a un coordinador" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashed,
      role: data.role,
      driverId: data.role === "driver" ? data.driverId : undefined,
      isActive: true,
    });

    const safe = await User.findById(user._id)
      .select("-password")
      .populate("driverId", "firstName lastName phone email")
      .lean();

    return NextResponse.json({ success: true, data: safe }, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
