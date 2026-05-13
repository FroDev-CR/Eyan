import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/models";
import { validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const resetSchema = z.object({
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

// PATCH /api/users/[id]/password - Admin reset of any user password
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 403 }
      );
    }

    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const validation = validateData(resetSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(validation.data.password, 10);
    const user = await User.findByIdAndUpdate(
      id,
      { password: hashed },
      { new: true }
    ).select("_id email");

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada",
    });
  } catch (error) {
    console.error("Error al resetear contraseña:", error);
    return NextResponse.json(
      { success: false, error: "Error al resetear contraseña" },
      { status: 500 }
    );
  }
}
