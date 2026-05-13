import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomerSync extends Document {
  _id: mongoose.Types.ObjectId;
  cedula: string;
  qboCustomerId: string;
  qboDisplayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSyncSchema = new Schema<ICustomerSync>(
  {
    cedula: { type: String, required: true, unique: true, index: true },
    qboCustomerId: { type: String, required: true },
    qboDisplayName: String,
  },
  { timestamps: true }
);

const CustomerSync: Model<ICustomerSync> =
  mongoose.models.CustomerSync ||
  mongoose.model<ICustomerSync>("CustomerSync", CustomerSyncSchema);

export default CustomerSync;
