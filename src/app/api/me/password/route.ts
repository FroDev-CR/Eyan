import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User } from "@/models";
import { validateData } from "@/lib/validations";

const changeSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(6, "Nueva contraseña debe tener al menos 6 caracteres"),
});

// PATCH /api/me/password - Self change own password
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const validation = validateData(changeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const ok = await bcrypt.compare(validation.data.currentPassword, user.password);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Contraseña actual incorrecta" },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(validation.data.newPassword, 10);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada",
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { success: false, error: "Error al cambiar contraseña" },
      { status: 500 }
    );
  }
}
