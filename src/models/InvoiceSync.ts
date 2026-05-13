import mongoose, { Schema, Document, Model } from "mongoose";

export type InvoiceSyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface IInvoiceSync extends Document {
  _id: mongoose.Types.ObjectId;
  fenInvoiceId: mongoose.Types.ObjectId;
  qboInvoiceId?: string;
  qboInvoiceNumber?: string;
  status: InvoiceSyncStatus;
  syncedAt?: Date;
  error?: string;
  attempts: number;
  syncedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSyncSchema = new Schema<IInvoiceSync>(
  {
    fenInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: "FENInvoice",
      required: true,
      unique: true,
      index: true,
    },
    qboInvoiceId: String,
    qboInvoiceNumber: String,
    status: {
      type: String,
      enum: ["pending", "syncing", "synced", "failed"],
      default: "pending",
      index: true,
    },
    syncedAt: Date,
    error: String,
    attempts: { type: Number, default: 0 },
    syncedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const InvoiceSync: Model<IInvoiceSync> =
  mongoose.models.InvoiceSync ||
  mongoose.model<IInvoiceSync>("InvoiceSync", InvoiceSyncSchema);

export default InvoiceSync;
