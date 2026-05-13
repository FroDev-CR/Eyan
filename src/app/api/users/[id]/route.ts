import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { User, Driver } from "@/models";
import { emailSchema, validateData } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const userPatchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: emailSchema.optional(),
  role: z.enum(["admin", "dispatcher", "driver"]).optional(),
  driverId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/users/[id] - Get one user (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const user = await User.findById(id)
      .select("-password")
      .populate("driverId", "firstName lastName phone email")
      .lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id] - Update user (admin only)
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
    const validation = validateData(userPatchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const data = validation.data;
    const current = await User.findById(id);
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Email unique check
    if (data.email && data.email.toLowerCase() !== current.email) {
      const exists = await User.findOne({
        _id: { $ne: id },
        email: data.email.toLowerCase(),
      });
      if (exists) {
        return NextResponse.json(
          { success: false, error: "Ya existe un usuario con ese email" },
          { status: 400 }
        );
      }
    }

    const finalRole = data.role ?? current.role;
    let finalDriverId: string | null | undefined = data.driverId;
    if (finalDriverId === undefined) {
      finalDriverId = current.driverId ? String(current.driverId) : null;
    }

    if (finalRole === "driver") {
      if (!finalDriverId) {
        return NextResponse.json(
          { success: false, error: "El rol coordinador requiere un coordinador vinculado" },
          { status: 400 }
        );
      }
      const driver = await Driver.findById(finalDriverId);
      if (!driver) {
        return NextResponse.json(
          { success: false, error: "Coordinador vinculado no existe" },
          { status: 400 }
        );
      }
      const linked = await User.findOne({
        _id: { $ne: id },
        driverId: finalDriverId,
      });
      if (linked) {
        return NextResponse.json(
          { success: false, error: "Ese coordinador ya tiene un usuario vinculado" },
          { status: 400 }
        );
      }
    } else {
      // Non-driver roles cannot keep driverId
      finalDriverId = null;
    }

    // Prevent admin demoting/deactivating themselves accidentally
    if (String(current._id) === session.user.id) {
      if (data.role && data.role !== "admin") {
        return NextResponse.json(
          { success: false, error: "No puedes cambiar tu propio rol" },
          { status: 400 }
        );
      }
      if (data.isActive === false) {
        return NextResponse.json(
          { success: false, error: "No puedes desactivar tu propio usuario" },
          { status: 400 }
        );
      }
    }

    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email.toLowerCase();
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    update.driverId = finalDriverId || undefined;

    const updated = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .populate("driverId", "firstName lastName phone email")
      .lean();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar usuario" },
      { status: 500 }
    );
  }
}
