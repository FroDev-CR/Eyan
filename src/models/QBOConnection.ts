import mongoose, { Schema, Document, Model } from "mongoose";

// Singleton: una sola conexión activa por instalación
export interface IQBOConnection extends Document {
  _id: mongoose.Types.ObjectId;
  realmId: string;            // QBO Company ID
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;            // access token expiry
  refreshExpiresAt: Date;     // refresh token expiry (~100 días)
  environment: "sandbox" | "production";
  companyName?: string;
  connectedBy?: mongoose.Types.ObjectId;
  connectedAt: Date;
  lastRefreshedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QBOConnectionSchema = new Schema<IQBOConnection>(
  {
    realmId: { type: String, required: true, unique: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    refreshExpiresAt: { type: Date, required: true },
    environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
    companyName: String,
    connectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    connectedAt: { type: Date, default: Date.now },
    lastRefreshedAt: Date,
  },
  { timestamps: true }
);

const QBOConnection: Model<IQBOConnection> =
  mongoose.models.QBOConnection ||
  mongoose.model<IQBOConnection>("QBOConnection", QBOConnectionSchema);

export default QBOConnection;
