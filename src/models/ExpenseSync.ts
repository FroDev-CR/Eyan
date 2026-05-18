import mongoose, { Schema, Document, Model } from "mongoose";

export type ExpenseSyncStatus = "pending" | "syncing" | "synced" | "failed";

export type QBOExpenseTxnType = "purchase" | "bill";

export interface IExpenseSync extends Document {
  expenseInvoiceId: mongoose.Types.ObjectId;
  status: ExpenseSyncStatus;
  /** ID en QBO (Purchase o Bill) */
  qboInvoiceId?: string;
  qboInvoiceNumber?: string;
  qboTxnType?: QBOExpenseTxnType;
  syncedAt?: Date;
  syncedBy?: string;
  error?: string;
  attempts: number;
}

const ExpenseSyncSchema = new Schema<IExpenseSync>(
  {
    expenseInvoiceId: { type: Schema.Types.ObjectId, ref: "ExpenseInvoice", required: true, index: true },
    status: { type: String, enum: ["pending", "syncing", "synced", "failed"], default: "pending", index: true },
    qboInvoiceId: { type: String },
    qboInvoiceNumber: { type: String },
    qboTxnType: { type: String, enum: ["purchase", "bill"] },
    syncedAt: { type: Date },
    syncedBy: { type: String },
    error: { type: String },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ExpenseSync: Model<IExpenseSync> = mongoose.models.ExpenseSync || mongoose.model<IExpenseSync>("ExpenseSync", ExpenseSyncSchema);

export default ExpenseSync;
