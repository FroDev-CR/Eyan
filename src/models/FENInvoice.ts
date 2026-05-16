import mongoose, { Schema, Document, Model } from "mongoose";

export type SubClienteArea = "Amanco" | "Kimberly Clark" | "Otros";

export interface IFENInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  fenId: string;              // Id interno FEN (1755094, etc)
  xmlCod?: string;            // hash para fetch XML (data-cod)
  consecutivo: string;        // # consecutivo (3643, etc)
  identification: string;     // cédula cliente
  clienteName: string;
  fecha: Date;
  plazo: number;              // días crédito (0, 30, etc)
  moneda: string;             // CRC, USD
  medioPago: string;          // Crédito, Otros, Efectivo, etc
  monto: number;
  saldo: number;
  estadoHacienda: string;     // Aceptado, Rechazado, Pendiente, Sin enviar
  correoEnviado: boolean;
  anulado: boolean;
  observaciones?: string;     // OtroTexto crudo del XML
  lineaDescripcion?: string;  // Detalle de líneas del XML (servicio facturado)
  ordenCompraPrefix?: "ME" | "KC" | "WHL" | null;
  ordenCompraNumero?: string;
  subClienteArea?: SubClienteArea | null;  // null = directo al cliente principal
  detalleScraped: boolean;    // ya bajamos el XML?
  scrapedAt: Date;
  raw?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FENInvoiceSchema = new Schema<IFENInvoice>(
  {
    fenId: { type: String, required: true, unique: true, index: true },
    xmlCod: { type: String, default: "" },
    consecutivo: { type: String, required: true, index: true },
    identification: { type: String, required: true, index: true },
    clienteName: { type: String, required: true },
    fecha: { type: Date, required: true, index: true },
    plazo: { type: Number, default: 0 },
    moneda: { type: String, default: "CRC" },
    medioPago: { type: String, default: "" },
    monto: { type: Number, required: true },
    saldo: { type: Number, default: 0 },
    estadoHacienda: { type: String, default: "" },
    correoEnviado: { type: Boolean, default: false },
    anulado: { type: Boolean, default: false, index: true },
    observaciones: { type: String, default: "" },
    lineaDescripcion: { type: String, default: "" },
    ordenCompraPrefix: { type: String, enum: ["ME", "KC", "WHL", null], default: null, index: true },
    ordenCompraNumero: { type: String, default: "" },
    subClienteArea: { type: String, enum: ["Amanco", "Kimberly Clark", "Otros", null], default: null, index: true },
    detalleScraped: { type: Boolean, default: false, index: true },
    scrapedAt: { type: Date, default: Date.now },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

FENInvoiceSchema.index({ fecha: -1, anulado: 1 });

const FENInvoice: Model<IFENInvoice> =
  mongoose.models.FENInvoice ||
  mongoose.model<IFENInvoice>("FENInvoice", FENInvoiceSchema);

export default FENInvoice;
