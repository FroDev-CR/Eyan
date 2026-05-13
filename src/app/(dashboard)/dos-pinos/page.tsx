"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  ClipboardList,
  RefreshCw,
  UserPlus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { AssignDriverModal } from "@/components/dos-pinos/AssignDriverModal";
import type { DosPinosCasePopulated, DPCaseStatus } from "@/types";

/* ── Status meta ─────────────────────────────────────────── */
const STATUS_META: Record<
  DPCaseStatus,
  { label: string; dot: string; text: string }
> = {
  pending:     { label: "Pendiente",  dot: "bg-yellow-400",   text: "text-yellow-400"   },
  assigned:    { label: "Asignado",   dot: "bg-blue-400",     text: "text-blue-400"     },
  in_progress: { label: "En ruta",    dot: "bg-orange-400",   text: "text-orange-400"   },
  completed:   { label: "Completado", dot: "bg-emerald-400",  text: "text-emerald-400"  },
  failed:      { label: "Fallido",    dot: "bg-red-400",      text: "text-red-400"      },
};

const SF_STATUS_STYLE: Record<string, string> = {
  "Para entrega":   "bg-blue-500/15 text-blue-300",
  "Para Reemplazo": "bg-violet-500/15 text-violet-300",
  "Para reemplazo": "bg-violet-500/15 text-violet-300",
  "En ruta":        "bg-orange-500/15 text-orange-300",
  "Completado":     "bg-emerald-500/15 text-emerald-300",
};

/* ── Helpers ─────────────────────────────────────────────── */
function getDriverName(
  field: DosPinosCasePopulated["assignedDriverId"]
): string {
  if (!field) return "";
  if (typeof field === "object") return `${field.firstName} ${field.lastName}`;
  return "";
}

function getDriverId(
  field: DosPinosCasePopulated["assignedDriverId"]
): string | undefined {
  if (!field) return undefined;
  if (typeof field === "object") return field._id;
  return field;
}

/* ── Stat pill ───────────────────────────────────────────── */
function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`status-dot ${color}`} />
      <span className="text-[13px] text-muted-foreground">
        <span className="font-heading font-600 text-foreground tabular-nums">{count}</span>
        {" "}{label}
      </span>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function DosPinosCasesPage() {
  const [cases, setCases] = useState<DosPinosCasePopulated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");
  const [batch, setBatch] = useState("all");
  const [batches, setBatches] = useState<string[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    caseId: string;
    caseNumber: number;
    currentDriverId?: string;
  } | null>(null);
  const { toast } = useToast();

  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (zone !== "all") params.set("zone", zone);
      if (batch !== "all") params.set("batch", batch);
      const res = await fetch(`/api/dos-pinos/cases?${params}`);
      const json = await res.json();
      if (json.success) {
        setCases(json.data);
        if (json.meta?.batches) setBatches(json.meta.batches);
        if (json.meta?.zones) setZones(json.meta.zones.filter(Boolean));
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, status, zone, batch]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleReset = async () => {
    if (
      !confirm(
        "⚠️ Esto eliminará TODOS los casos y rutas finalizadas de Dos Pinos. ¿Continuar?"
      )
    )
      return;
    if (!confirm("Confirmación final: ¿estás 100% seguro? Esta acción no se puede deshacer.")) return;

    setIsResetting(true);
    try {
      const res = await fetch("/api/dos-pinos/reset", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Datos eliminados",
          description: `${json.data.casesDeleted} casos · ${json.data.routesDeleted} rutas`,
        });
        fetchCases();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/dos-pinos/sync", { method: "POST" });
      const json = await res.json();
      if (json.requiresMFA) {
        toast({ title: "MFA requerido", description: "Ejecuta 'npm run sf:setup' en terminal.", variant: "destructive" });
        return;
      }
      if (!json.success) {
        toast({ title: "Error al sincronizar", description: json.error, variant: "destructive" });
        return;
      }
      toast({ title: "Sincronización completa", description: `${json.data.imported} nuevos · ${json.data.duplicates} duplicados` });
      fetchCases();
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) return <LoadingPage />;

  /* Stats */
  const pending     = cases.filter((c) => c.eyanStatus === "pending").length;
  const assigned    = cases.filter((c) => c.eyanStatus === "assigned").length;
  const inProgress  = cases.filter((c) => c.eyanStatus === "in_progress").length;
  const completed   = cases.filter((c) => c.eyanStatus === "completed").length;
  const failed      = cases.filter((c) => c.eyanStatus === "failed").length;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
            Dos Pinos
          </h1>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <StatPill label="pendientes"  count={pending}    color="bg-yellow-400" />
            <StatPill label="asignados"   count={assigned}   color="bg-blue-400" />
            <StatPill label="en ruta"     count={inProgress} color="bg-orange-400" />
            <StatPill label="completados" count={completed}  color="bg-emerald-400" />
            {failed > 0 && <StatPill label="fallidos" count={failed} color="bg-red-400" />}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {cases.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {isResetting ? "Limpiando..." : "Limpiar todo"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="h-8 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sync SF"}
          </Button>
          <Button size="sm" className="h-8 text-xs" asChild>
            <Link href="/dos-pinos/import">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Importar
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div
        className="flex items-center gap-2 flex-wrap p-3 rounded-lg"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <SearchInput
          placeholder="Buscar PDV, dirección, cita..."
          value={search}
          onChange={setSearch}
          className="flex-1 min-w-[200px] h-8 text-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(STATUS_META) as DPCaseStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={batch} onValueChange={setBatch}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los lotes</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {cases.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin casos"
          description={
            search || status !== "all" || zone !== "all" || batch !== "all"
              ? "No hay casos con los filtros aplicados"
              : "Importa un Excel de Salesforce para comenzar"
          }
          action={
            !search && status === "all" && zone === "all" && batch === "all" ? (
              <Button asChild size="sm">
                <Link href="/dos-pinos/import">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Importar Excel
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          {/* Table header */}
          <div className="grid grid-cols-[80px_110px_1fr_130px_110px_140px_130px] border-b border-border">
            {["#CASO", "CITA", "PUNTO DE VENTA", "ESTADO EYAN", "ZONA", "COORDINADOR", ""].map(
              (h) => (
                <div
                  key={h}
                  className="px-3 py-2.5 text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </div>
              )
            )}
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {cases.map((c, i) => {
              const meta = STATUS_META[c.eyanStatus];
              const driverName = getDriverName(c.assignedDriverId);
              const driverId = getDriverId(c.assignedDriverId);
              const canAssign = c.eyanStatus !== "completed" && c.eyanStatus !== "failed";
              const sfStyle = SF_STATUS_STYLE[c.sfStatus] ?? "bg-muted text-muted-foreground";

              return (
                <div
                  key={c._id}
                  className={`grid grid-cols-[80px_110px_1fr_130px_110px_140px_130px] items-center hover:bg-accent/50 transition-colors group ${
                    i % 2 === 0 ? "" : "bg-black/[0.06]"
                  }`}
                >
                  {/* Case # */}
                  <div className="px-3 py-3">
                    <span className="font-mono text-[13px] font-medium text-foreground">
                      {c.caseNumber}
                    </span>
                  </div>

                  {/* Cita */}
                  <div className="px-3 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.appointmentNumber}
                    </span>
                  </div>

                  {/* PDV + account + SF status */}
                  <div className="px-3 py-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium text-foreground truncate max-w-[220px]">
                        {c.commercialName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sfStyle}`}>
                        {c.sfStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {c.accountName}
                    </p>
                  </div>

                  {/* EYAN status */}
                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`status-dot ${meta.dot}`} />
                      <span className={`text-[12px] font-medium ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>
                  </div>

                  {/* Zona */}
                  <div className="px-3 py-3">
                    <span className="text-[12px] text-muted-foreground font-heading font-500">
                      {c.equipmentZone || "—"}
                    </span>
                  </div>

                  {/* Driver */}
                  <div className="px-3 py-3">
                    {driverName ? (
                      <span className="text-[12px] text-foreground">{driverName}</span>
                    ) : (
                      <span className="text-[12px] text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-3 py-3 flex justify-end">
                    {canAssign && (
                      <button
                        onClick={() =>
                          setAssignModal({
                            caseId: c._id,
                            caseNumber: c.caseNumber,
                            currentDriverId: driverId,
                          })
                        }
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {driverName ? "Reasignar" : "Asignar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              {cases.length} casos
            </p>
          </div>
        </div>
      )}

      {assignModal && (
        <AssignDriverModal
          caseId={assignModal.caseId}
          caseNumber={assignModal.caseNumber}
          currentDriverId={assignModal.currentDriverId}
          open={!!assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={fetchCases}
        />
      )}
    </div>
  );
}
