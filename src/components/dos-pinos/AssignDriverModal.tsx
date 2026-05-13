"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Driver } from "@/types";

const STATUS_DOT: Record<string, string> = {
  available: "bg-emerald-400",
  on_route:  "bg-orange-400",
  off_duty:  "bg-yellow-400",
  inactive:  "bg-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  available: "Disponible",
  on_route:  "En ruta",
  off_duty:  "Libre",
  inactive:  "Inactivo",
};

interface Props {
  caseId: string;
  caseNumber: number;
  currentDriverId?: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignDriverModal({
  caseId,
  caseNumber,
  currentDriverId,
  open,
  onClose,
  onAssigned,
}: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(currentDriverId ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(currentDriverId ?? "");
    setIsLoading(true);
    fetch("/api/drivers")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setDrivers(j.data.filter((d: Driver) => d.status !== "inactive"));
      })
      .finally(() => setIsLoading(false));
  }, [open, currentDriverId]);

  const handleAssign = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/dos-pinos/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedDriverId: selectedId, eyanStatus: "assigned" }),
      });
      if ((await res.json()).success) {
        onAssigned();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-heading font-600 text-[15px] tracking-tight">
            Asignar coordinador
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Caso <span className="font-mono text-foreground">#{caseNumber}</span>
          </p>
        </DialogHeader>

        <div className="px-3 py-2 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : drivers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-6">
              No hay coordinadores activos
            </p>
          ) : (
            <div className="space-y-0.5">
              {drivers.map((d) => {
                const isSelected = selectedId === d._id;
                return (
                  <button
                    key={d._id}
                    onClick={() => setSelectedId(d._id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-md transition-colors ${
                      isSelected
                        ? "bg-primary/[0.14] text-foreground"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Selection indicator */}
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? "border-primary"
                            : "border-border"
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-[13px] font-medium">
                        {d.firstName} {d.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`status-dot ${STATUS_DOT[d.status] ?? "bg-muted-foreground"}`} />
                      <span className="text-[11px] text-muted-foreground">
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!selectedId || isSaving}
            className="flex-1"
          >
            {isSaving ? "Guardando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
