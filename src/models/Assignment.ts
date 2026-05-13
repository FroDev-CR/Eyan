import mongoose, { Schema, Document, Model } from "mongoose";
import type { AssignmentStatus } from "@/types";

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  startTime?: string;
  endTime?: string;
  driverId: mongoose.Types.ObjectId;
  truckId: mongoose.Types.ObjectId;
  routeId: mongoose.Types.ObjectId;
  status: AssignmentStatus;
  notes?: string;
  orderId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    date: {
      type: Date,
      required: [true, "La fecha es requerida"],
    },
    startTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"],
    },
    endTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"],
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: [true, "El coordinador es requerido"],
    },
    truckId: {
      type: Schema.Types.ObjectId,
      ref: "Truck",
      required: [true, "El camión es requerido"],
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: [true, "La ruta es requerida"],
    },
    status: {
      type: String,
      enum: {
        values: ["scheduled", "in_progress", "completed", "cancelled"],
        message: "Estado inválido",
      },
      default: "scheduled",
    },
    notes: {
      type: String,
      maxlength: [500, "Las notas no pueden exceder 500 caracteres"],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El creador es requerido"],
    },
  },
  {
    timestamps: true,
  }
);

// Índices para consultas frecuentes
AssignmentSchema.index({ date: 1, driverId: 1 });
AssignmentSchema.index({ date: 1, truckId: 1 });
AssignmentSchema.index({ status: 1 });
AssignmentSchema.index({ driverId: 1, status: 1 });
AssignmentSchema.index({ date: 1 });

// Método para verificar conflictos de horario
AssignmentSchema.statics.checkConflicts = async function (
  date: Date,
  driverId: string,
  truckId: string,
  startTime?: string,
  endTime?: string,
  excludeId?: string
) {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const query: Record<string, unknown> = {
    date: { $gte: dateStart, $lte: dateEnd },
    status: { $nin: ["cancelled"] },
    $or: [{ driverId }, { truckId }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const conflicts = await this.find(query)
    .populate("driverId", "firstName lastName")
    .populate("truckId", "name plateNumber");

  return conflicts;
};

const Assignment: Model<IAssignment> =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;
