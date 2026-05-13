import mongoose, { Schema, Model } from "mongoose";
import type { TruckStatus, TruckType } from "@/types";

export interface ITruck {
  _id: mongoose.Types.ObjectId;
  plateNumber: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  capacity: string;
  type: TruckType;
  status: TruckStatus;
  currentMileage?: number;
  lastMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TruckSchema = new Schema<ITruck>(
  {
    plateNumber: {
      type: String,
      required: [true, "La placa es requerida"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
    },
    brand: {
      type: String,
      required: [true, "La marca es requerida"],
      trim: true,
    },
    model: {
      type: String,
      required: [true, "El modelo es requerido"],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, "El año es requerido"],
      min: [1990, "El año debe ser mayor a 1990"],
      max: [new Date().getFullYear() + 1, "El año no puede ser futuro"],
    },
    capacity: {
      type: String,
      required: [true, "La capacidad es requerida"],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["flatbed", "refrigerated", "cargo", "tanker", "other"],
        message: "Tipo inválido",
      },
      default: "cargo",
    },
    status: {
      type: String,
      enum: {
        values: ["available", "in_use", "maintenance", "inactive"],
        message: "Estado inválido",
      },
      default: "available",
    },
    currentMileage: {
      type: Number,
      min: [0, "El kilometraje no puede ser negativo"],
    },
    lastMaintenanceDate: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [500, "Las notas no pueden exceder 500 caracteres"],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual para descripción completa
TruckSchema.virtual("fullDescription").get(function () {
  return `${this.name} - ${this.brand} ${this.model} (${this.year})`;
});

// Índices
TruckSchema.index({ status: 1 });
TruckSchema.index({ type: 1 });
TruckSchema.index({ plateNumber: 1 });

// Configurar virtuals en JSON
TruckSchema.set("toJSON", { virtuals: true });
TruckSchema.set("toObject", { virtuals: true });

const Truck: Model<ITruck> =
  mongoose.models.Truck || mongoose.model<ITruck>("Truck", TruckSchema);

export default Truck;
