import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendorSync extends Document {
  cedula: string;
  qboVendorId: string;
  qboDisplayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSyncSchema = new Schema<IVendorSync>(
  {
    cedula: { type: String, required: true, unique: true, index: true },
    qboVendorId: { type: String, required: true },
    qboDisplayName: String,
  },
  { timestamps: true }
);

const VendorSync: Model<IVendorSync> =
  mongoose.models.VendorSync || mongoose.model<IVendorSync>("VendorSync", VendorSyncSchema);

export default VendorSync;
