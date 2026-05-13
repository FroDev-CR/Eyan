import mongoose, { Schema, Document, Model } from "mongoose";

export type DPCaseStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed";
export type DPMovementType =
  | "Implementación Exitosa"
  | "Implementación Infructuosa"
  | "Equipo Reemplazado"
  | "Retiro Único"
  | "Desligue Manual"
  | "Firma Digital"
  | "Firma Física";

export interface IDosPinosCase extends Document {
  _id: mongoose.Types.ObjectId;
  // Campos de Salesforce
  caseNumber: number;
  appointmentNumber: string;
  linkedAssetNumber: number;
  clientNumber: number;
  commercialName: string;
  sfStatus: string;
  branch: string;
  sfStatus2: string;
  clientAddress: string;
  equipmentZone: string;
  accountName: string;
  serviceResourceName: string;
  openingDate?: Date;
  // Campos internos EYAN
  eyanStatus: DPCaseStatus;
  assignedDriverId?: mongoose.Types.ObjectId;
  assignedZone?: string;
  movementType?: string;
  importBatch: string;
  importedAt: Date;
  week?: number;
  year?: number;
  notes?: string;
  completedAt?: Date;
  // Campos del reporte de campo (estilo Excel actual)
  tipoEquipo?: string;
  lugarDeCarga?: string;
  distanciaPDV?: string;
  comentarioAdicional?: string;
  routeOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DosPinosCaseSchema = new Schema<IDosPinosCase>(
  {
    caseNumber: { type: Number, required: true },
    appointmentNumber: { type: String, required: true, trim: true },
    linkedAssetNumber: { type: Number, required: true },
    clientNumber: { type: Number, required: true },
    commercialName: { type: String, required: true, trim: true },
    sfStatus: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, default: "" },
    sfStatus2: { type: String, trim: true, default: "" },
    clientAddress: { type: String, trim: true, default: "" },
    equipmentZone: { type: String, trim: true, default: "" },
    accountName: { type: String, trim: true, default: "" },
    serviceResourceName: { type: String, trim: true, default: "" },
    openingDate: { type: Date },
    eyanStatus: {
      type: String,
      enum: ["pending", "assigned", "in_progress", "completed", "failed"],
      default: "pending",
    },
    assignedDriverId: { type: Schema.Types.ObjectId, ref: "Driver" },
    assignedZone: { type: String, trim: true },
    movementType: { type: String, trim: true },
    importBatch: { type: String, required: true, trim: true },
    importedAt: { type: Date, required: true, default: Date.now },
    week: { type: Number },
    year: { type: Number },
    notes: { type: String, trim: true, maxlength: 500 },
    completedAt: { type: Date },
    tipoEquipo: { type: String, trim: true },
    lugarDeCarga: { type: String, trim: true },
    distanciaPDV: { type: String, trim: true },
    comentarioAdicional: { type: String, trim: true, maxlength: 1000 },
    routeOrder: { type: Number },
  },
  { timestamps: true }
);

DosPinosCaseSchema.index({ caseNumber: 1 });
DosPinosCaseSchema.index({ eyanStatus: 1 });
DosPinosCaseSchema.index({ equipmentZone: 1 });
DosPinosCaseSchema.index({ importBatch: 1 });
DosPinosCaseSchema.index({ assignedDriverId: 1 });
// Prevent duplicate case numbers per import batch
DosPinosCaseSchema.index({ caseNumber: 1, importBatch: 1 });

const DosPinosCase: Model<IDosPinosCase> =
  mongoose.models.DosPinosCase ||
  mongoose.model<IDosPinosCase>("DosPinosCase", DosPinosCaseSchema);

export default DosPinosCase;
