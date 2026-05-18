"use client";

import { AlertCircle } from "lucide-react";
import {
  EXPENSE_EXCEL_HEADERS,
  formatExpenseCell,
  type ExpenseExcelHeader,
  type ExpenseRowLike,
} from "@/lib/contabilidad/expense-excel";

type SyncStatus = "pending" | "syncing" | "synced" | "failed";

interface ExpenseWithSync extends ExpenseRowLike {
  _id: string;
  sync: {
    status: SyncStatus;
    qboInvoiceNumber?: string;
    error?: string;
  };
}

const STATUS_META: Record<
  SyncStatus,
  { label: string; dot: string; text: string }
> = {
  pending: { label: "Pendiente", dot: "bg-yellow-400", text: "text-yellow-400" },
  syncing: { label: "Sincronizando", dot: "bg-blue-400", text: "text-blue-400" },
  synced: { label: "Enviado a QBO", dot: "bg-emerald-400", text: "text-emerald-400" },
  failed: { label: "Falló", dot: "bg-red-400", text: "text-red-400" },
};

const COL_MIN_WIDTH: Partial<Record<ExpenseExcelHeader | "Estado QBO", string>> = {
  "Tipo de Documento": "min-w-[140px]",
  "Identificación Proveedor": "min-w-[115px]",
  "Nombre Proveedor": "min-w-[200px]",
  "Consecutivo Documento": "min-w-[175px]",
  "Respuesta Hacienda": "min-w-[110px]",
  "Fecha Documento": "min-w-[95px]",
  "Fecha Respuesta": "min-w-[95px]",
  "Respuesta Cliente": "min-w-[110px]",
  Moneda: "min-w-[65px]",
  Impuesto: "min-w-[90px]",
  Total: "min-w-[100px]",
  "Estado QBO": "min-w-[120px]",
};

interface ExpensesTableProps {
  rows: ExpenseWithSync[];
  selected: Set<string>;
  selectableIds: string[];
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}

export function ExpensesTable({
  rows,
  selected,
  selectableIds,
  onToggleAll,
  onToggleOne,
}: ExpensesTableProps) {
  const allSelected =
    selectableIds.length > 0 && selected.size === selectableIds.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-border bg-black/[0.12]">
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--color-surface)] px-3 py-2.5 w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                disabled={selectableIds.length === 0}
                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
              />
            </th>
            {EXPENSE_EXCEL_HEADERS.map((h) => (
              <th
                key={h}
                className={`px-3 py-2.5 text-[10px] font-heading font-600 text-muted-foreground whitespace-nowrap ${COL_MIN_WIDTH[h] ?? ""}`}
              >
                {h}
              </th>
            ))}
            <th
              className={`px-3 py-2.5 text-[10px] font-heading font-600 text-muted-foreground whitespace-nowrap ${COL_MIN_WIDTH["Estado QBO"]}`}
            >
              Estado QBO
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const status = row.sync?.status ?? "pending";
            const meta = STATUS_META[status];
            const isSelectable = status === "pending" || status === "failed";
            const isSelected = selected.has(row._id);

            return (
              <tr
                key={row._id}
                className={`hover:bg-accent/50 transition-colors ${i % 2 === 1 ? "bg-black/[0.06]" : ""}`}
              >
                <td className="sticky left-0 z-10 bg-[var(--color-surface)] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleOne(row._id)}
                    disabled={!isSelectable}
                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  />
                </td>
                {EXPENSE_EXCEL_HEADERS.map((h) => {
                  const display = formatExpenseCell(row, h);
                  const isConsecutivo = h === "Consecutivo Documento";
                  const isProveedor = h === "Nombre Proveedor";

                  return (
                    <td
                      key={h}
                      className={`px-3 py-2.5 text-[12px] text-foreground ${COL_MIN_WIDTH[h] ?? ""} ${
                        isProveedor ? "max-w-[240px]" : ""
                      }`}
                      title={display}
                    >
                      <span
                        className={`block ${
                          isConsecutivo
                            ? "font-mono text-[11px] tracking-tight whitespace-nowrap"
                            : isProveedor
                              ? "truncate max-w-[240px]"
                              : "whitespace-nowrap"
                        }`}
                      >
                        {display}
                      </span>
                    </td>
                  );
                })}
                <td className={`px-3 py-2.5 ${COL_MIN_WIDTH["Estado QBO"]}`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`status-dot ${meta.dot}`} />
                    <span className={`text-[12px] font-medium whitespace-nowrap ${meta.text}`}>
                      {meta.label}
                    </span>
                  </div>
                  {row.sync?.qboInvoiceNumber && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      QBO #{row.sync.qboInvoiceNumber}
                    </div>
                  )}
                  {row.sync?.error && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                      <span className="text-[10px] text-red-400 truncate max-w-[140px]" title={row.sync.error}>
                        {row.sync.error}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
