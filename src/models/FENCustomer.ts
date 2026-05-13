import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFENCustomer extends Document {
  _id: mongoose.Types.ObjectId;
  cedula: string;
  name: string;
  actividadEconomica?: string;
  telefono?: string;
  email?: string;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FENCustomerSchema = new Schema<IFENCustomer>(
  {
    cedula: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    actividadEconomica: String,
    telefono: String,
    email: String,
    scrapedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const FENCustomer: Model<IFENCustomer> =
  mongoose.models.FENCustomer ||
  mongoose.model<IFENCustomer>("FENCustomer", FENCustomerSchema);

export default FENCustomer;
