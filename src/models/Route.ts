import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoute extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  origin: string;
  destination: string;
  estimatedDuration: number;
  distance?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RouteSchema = new Schema<IRoute>(
  {
    name: {
      type: String,
      required: [true, "El nombre de la ruta es requerido"],
      trim: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
    },
    origin: {
      type: String,
      required: [true, "El origen es requerido"],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, "El destino es requerido"],
      trim: true,
    },
    estimatedDuration: {
      type: Number,
      required: [true, "La duración estimada es requerida"],
      min: [1, "La duración debe ser al menos 1 minuto"],
    },
    distance: {
      type: Number,
      min: [0, "La distancia no puede ser negativa"],
    },
    description: {
      type: String,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
RouteSchema.index({ isActive: 1 });
RouteSchema.index({ name: "text", origin: "text", destination: "text" });

const Route: Model<IRoute> =
  mongoose.models.Route || mongoose.model<IRoute>("Route", RouteSchema);

export default Route;
