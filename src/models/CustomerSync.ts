import mongoose, { Schema, Document, Model } from "mongoose";

export type SubClienteArea = "Amanco" | "Kimberly Clark" | "Otros";

export interface ICustomerSync extends Document {
  _id: mongoose.Types.ObjectId;
  cedula: string;
  subClienteArea: SubClienteArea | null;
  qboCustomerId: string;
  qboDisplayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSyncSchema = new Schema<ICustomerSync>(
  {
    cedula: { type: String, required: true, index: true },
    subClienteArea: {
      type: String,
      enum: ["Amanco", "Kimberly Clark", "Otros", null],
      default: null,
    },
    qboCustomerId: { type: String, required: true },
    qboDisplayName: String,
  },
  { timestamps: true }
);

CustomerSyncSchema.index({ cedula: 1, subClienteArea: 1 }, { unique: true });

const CustomerSync: Model<ICustomerSync> =
  mongoose.models.CustomerSync ||
  mongoose.model<ICustomerSync>("CustomerSync", CustomerSyncSchema);

export default CustomerSync;
