import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDosPinosDailyRoute extends Document {
  _id: mongoose.Types.ObjectId;
  coordinatorId: mongoose.Types.ObjectId;
  date: Date;
  caseIds: mongoose.Types.ObjectId[];
  totalCases: number;
  completedCases: number;
  failedCases: number;
  finalizedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DosPinosDailyRouteSchema = new Schema<IDosPinosDailyRoute>(
  {
    coordinatorId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    caseIds: [{ type: Schema.Types.ObjectId, ref: "DosPinosCase" }],
    totalCases: { type: Number, default: 0 },
    completedCases: { type: Number, default: 0 },
    failedCases: { type: Number, default: 0 },
    finalizedAt: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One route per coordinator per day
DosPinosDailyRouteSchema.index({ coordinatorId: 1, date: 1 }, { unique: true });

const DosPinosDailyRoute: Model<IDosPinosDailyRoute> =
  mongoose.models.DosPinosDailyRoute ||
  mongoose.model<IDosPinosDailyRoute>("DosPinosDailyRoute", DosPinosDailyRouteSchema);

export default DosPinosDailyRoute;
