"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, ArrowRight, Calendar } from "lucide-react";
import type { DosPinosDailyRoute } from "@/types";

function getCoordName(c: DosPinosDailyRoute["coordinatorId"]): string {
  if (typeof c === "object" && c !== null) return `${c.firstName} ${c.lastName}`;
  return "—";
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RutasDiariasPage() {
  const [routes, setRoutes] = useState<DosPinosDailyRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState("");

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    fetch(`/api/dos-pinos/daily-routes?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRoutes(j.data);
      })
      .finally(() => setIsLoading(false));
  }, [date]);

  if (isLoading) return <LoadingPage />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
            Rutas diarias
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Reportes finalizados por coordinador
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 text-sm w-[170px]"
          />
          {date && (
            <button
              onClick={() => setDate("")}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {routes.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin rutas finalizadas"
          description={
            date
              ? "Ningún coordinador finalizó ruta en la fecha seleccionada."
              : "Cuando un coordinador finalice su día, aparecerá aquí."
          }
        />
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="grid grid-cols-[1fr_180px_120px_120px_140px] border-b border-border">
            {["COORDINADOR", "FECHA", "TAREAS", "FINALIZADA", ""].map((h) => (
              <div
                key={h}
                className="px-3 py-2.5 text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {routes.map((r) => (
              <div
                key={r._id}
                className="grid grid-cols-[1fr_180px_120px_120px_140px] items-center hover:bg-accent/40 transition-colors"
              >
                <div className="px-3 py-3">
                  <span className="text-[14px] font-medium text-foreground">
                    {getCoordName(r.coordinatorId)}
                  </span>
                </div>
                <div className="px-3 py-3 text-[12px] text-muted-foreground">
                  {formatDate(r.date)}
                </div>
                <div className="px-3 py-3 text-[12px]">
                  <span className="text-foreground font-medium">{r.totalCases}</span>
                  <span className="text-muted-foreground/60">
                    {" "}({r.completedCases}✓ {r.failedCases}✗)
                  </span>
                </div>
                <div className="px-3 py-3 text-[12px] text-muted-foreground">
                  {formatTime(r.finalizedAt)}
                </div>
                <div className="px-3 py-3 flex justify-end">
                  <Link
                    href={`/dos-pinos/rutas/${r._id}`}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
                  >
                    Ver reporte
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              {routes.length} {routes.length === 1 ? "ruta" : "rutas"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
