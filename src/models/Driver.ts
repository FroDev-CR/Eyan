import mongoose, { Schema, Document, Model } from "mongoose";
import type { DriverStatus } from "@/types";

export interface IDriver extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: DriverStatus;
  avatar?: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    firstName: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
    },
    lastName: {
      type: String,
      required: [true, "El apellido es requerido"],
      trim: true,
      maxlength: [50, "El apellido no puede exceder 50 caracteres"],
    },
    phone: {
      type: String,
      required: [true, "El teléfono es requerido"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El email es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Por favor ingresa un email válido"],
    },
    licenseNumber: {
      type: String,
      required: [true, "El número de licencia es requerido"],
      unique: true,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: [true, "La fecha de vencimiento de licencia es requerida"],
    },
    status: {
      type: String,
      enum: {
        values: ["available", "on_route", "off_duty", "inactive"],
        message: "Estado inválido",
      },
      default: "available",
    },
    avatar: {
      type: String,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual para nombre completo
DriverSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Índices
DriverSchema.index({ status: 1 });
DriverSchema.index({ email: 1 });
DriverSchema.index({ licenseNumber: 1 });

// Configurar virtuals en JSON
DriverSchema.set("toJSON", { virtuals: true });
DriverSchema.set("toObject", { virtuals: true });

const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>("Driver", DriverSchema);

export default Driver;
