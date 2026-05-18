import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpenseInvoice extends Document {
  fenId?: string; // optional, if available
  docType: string;
  providerIdentification: string;
  providerName: string;
  consecutivo: string;
  haciendaStatus?: string;
  documentDate?: Date;
  responseDate?: Date;
  clientResponse?: string;
  currency?: string;
  tax?: number;
  total?: number;
  /** Cuenta de gasto en QBO (categoría) */
  qboCategoryAccountId?: string;
  qboCategoryAccountName?: string;
  categoryAutoRule?: string;
  categorySource?: "auto" | "manual";
  extras?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  scrapedAt: Date;
}

const ExpenseInvoiceSchema = new Schema<IExpenseInvoice>(
  {
    fenId: { type: String, default: "" },
    docType: { type: String, default: "" },
    providerIdentification: { type: String, default: "", index: true },
    providerName: { type: String, default: "" },
    consecutivo: { type: String, default: "", index: true },
    haciendaStatus: { type: String, default: "" },
    documentDate: { type: Date },
    responseDate: { type: Date },
    clientResponse: { type: String, default: "" },
    currency: { type: String, default: "CRC" },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    qboCategoryAccountId: { type: String, default: "" },
    qboCategoryAccountName: { type: String, default: "" },
    categoryAutoRule: { type: String, default: "" },
    categorySource: { type: String, enum: ["auto", "manual"] },
    extras: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ExpenseInvoiceSchema.index({ consecutivo: 1, providerIdentification: 1 }, { unique: true, sparse: true });

const ExpenseInvoice: Model<IExpenseInvoice> =
  mongoose.models.ExpenseInvoice || mongoose.model<IExpenseInvoice>("ExpenseInvoice", ExpenseInvoiceSchema);

export default ExpenseInvoice;
