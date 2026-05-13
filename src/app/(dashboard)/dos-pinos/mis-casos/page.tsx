"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import {
  ClipboardList,
  MapPin,
  ArrowRight,
  GripVertical,
  Flag,
} from "lucide-react";
import type { DosPinosCase, DPCaseStatus } from "@/types";

const STATUS_META: Record<DPCaseStatus, { label: string; dot: string; text: string }> = {
  pending:     { label: "Pendiente",  dot: "bg-yellow-400",  text: "text-yellow-400"  },
  assigned:    { label: "Asignado",   dot: "bg-blue-400",    text: "text-blue-400"    },
  in_progress: { label: "En ruta",    dot: "bg-orange-400",  text: "text-orange-400"  },
  completed:   { label: "Completado", dot: "bg-emerald-400", text: "text-emerald-400" },
  failed:      { label: "Fallido",    dot: "bg-red-400",     text: "text-red-400"     },
};

/* ── Sortable row ─────────────────────────────────────── */
function SortableCaseRow({ c, index }: { c: DosPinosCase; index: number }) {
  const meta = STATUS_META[c.eyanStatus];
  const canReport = c.eyanStatus === "assigned" || c.eyanStatus === "in_progress";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: c._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-4 hover:bg-accent/40 transition-colors group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="font-mono text-[11px] text-muted-foreground/60 w-5 text-right tabular-nums">
        {index + 1}
      </span>

      <div className={`status-dot mt-0.5 flex-shrink-0 ${meta.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[13px] font-medium text-foreground">
            #{c.caseNumber}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {c.appointmentNumber}
          </span>
          <span className={`text-[11px] font-medium ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-[14px] font-medium text-foreground mt-0.5 truncate">
          {c.commercialName}
        </p>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{c.clientAddress}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {c.equipmentZone && (
          <span className="text-[11px] font-heading font-500 text-muted-foreground uppercase tracking-wide">
            {c.equipmentZone}
          </span>
        )}
        {canReport && (
          <Button size="sm" className="h-8 text-[12px]" asChild>
            <Link href={`/dos-pinos/${c._id}/reporte`}>
              Reportar
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Done row (no drag) ───────────────────────────────── */
function DoneCaseRow({ c }: { c: DosPinosCase }) {
  const meta = STATUS_META[c.eyanStatus];
  return (
    <div className="flex items-center gap-3 px-4 py-4 hover:bg-accent/40 transition-colors">
      <div className={`status-dot mt-0.5 flex-shrink-0 ${meta.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[13px] font-medium text-foreground">
            #{c.caseNumber}
          </span>
          <span className={`text-[11px] font-medium ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <p className="text-[14px] font-medium text-foreground mt-0.5 truncate">
          {c.commercialName}
        </p>
      </div>
      <Button size="sm" variant="outline" className="h-8 text-[12px]" asChild>
        <Link href={`/dos-pinos/${c._id}/reporte`}>Ver reporte</Link>
      </Button>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────── */
export default function MisCasosPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [cases, setCases] = useState<DosPinosCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [routeFinalized, setRouteFinalized] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchMyCases = useCallback(async () => {
    const driverId = session?.user?.driverId;
    if (!driverId) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dos-pinos/cases?driver=${driverId}`);
      const json = await res.json();
      if (json.success) setCases(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.driverId]);

  useEffect(() => {
    if (session !== undefined) fetchMyCases();
  }, [session, fetchMyCases]);

  const active = cases.filter(
    (c) => c.eyanStatus === "assigned" || c.eyanStatus === "in_progress"
  );
  const done = cases.filter(
    (c) => c.eyanStatus === "completed" || c.eyanStatus === "failed"
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active: dragged, over } = event;
    if (!over || dragged.id === over.id) return;

    const oldIndex = active.findIndex((c) => c._id === dragged.id);
    const newIndex = active.findIndex((c) => c._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedActive = arrayMove(active, oldIndex, newIndex);
    // Merge back with done section
    setCases([...reorderedActive, ...done]);

    // Persist new order
    const orders = reorderedActive.map((c, idx) => ({
      caseId: c._id,
      routeOrder: idx,
    }));
    try {
      const res = await fetch("/api/dos-pinos/cases/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Error al guardar orden", description: json.error, variant: "destructive" });
        fetchMyCases();
      }
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
      fetchMyCases();
    }
  };

  const handleFinalize = async () => {
    const driverId = session?.user?.driverId;
    if (!driverId) return;
    if (!confirm("¿Finalizar la ruta del día? El admin recibirá tu reporte.")) return;
    setIsFinalizing(true);
    try {
      const res = await fetch("/api/dos-pinos/daily-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinatorId: driverId }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Ruta finalizada", description: "Reporte enviado al admin." });
        setRouteFinalized(true);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) return <LoadingPage />;

  if (!session?.user?.driverId) {
    return (
      <div>
        <SectionHeader title="Mis Tareas" sub="Vista del coordinador" />
        <EmptyState
          icon={ClipboardList}
          title="Perfil sin coordinador vinculado"
          description="Tu usuario no tiene un perfil de coordinador. Contacta al administrador."
        />
      </div>
    );
  }

  const canFinalize = active.length === 0 && done.length > 0 && !routeFinalized;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Mis Tareas"
          sub={`${cases.length} tareas asignadas · ${active.length} pendientes · ${done.length} reportadas`}
        />
        {canFinalize && (
          <Button
            onClick={handleFinalize}
            disabled={isFinalizing}
            size="sm"
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Flag className="mr-1.5 h-4 w-4" />
            {isFinalizing ? "Finalizando..." : "Finalizar ruta"}
          </Button>
        )}
        {routeFinalized && (
          <span className="text-[12px] text-emerald-400 font-medium px-3 py-2 rounded-md bg-emerald-500/10">
            Ruta del día finalizada ✓
          </span>
        )}
      </div>

      {cases.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sin tareas asignadas"
          description="No tienes tareas asignadas actualmente."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {active.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <GroupHeader
                label="Por realizar — arrastra para reordenar"
                count={active.length}
                dot="bg-blue-400"
              />
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={active.map((c) => c._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-border">
                    {active.map((c, i) => (
                      <SortableCaseRow key={c._id} c={c} index={i} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {done.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <GroupHeader
                label="Finalizadas"
                count={done.length}
                dot="bg-muted-foreground"
              />
              <div className="divide-y divide-border">
                {done.map((c) => <DoneCaseRow key={c._id} c={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
        {title}
      </h1>
      <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function GroupHeader({ label, count, dot }: { label: string; count: number; dot: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
      <span className={`status-dot ${dot}`} />
      <span className="text-[11px] font-heading font-600 uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="text-[11px] text-muted-foreground ml-1">({count})</span>
    </div>
  );
}
