"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import type { DosPinosDailyRoute, DosPinosCase } from "@/types";

function getCoord(c: DosPinosDailyRoute["coordinatorId"]) {
  if (typeof c === "object" && c !== null) return c;
  return null;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(d: string | Date | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RutaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<DosPinosDailyRoute | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dos-pinos/daily-routes/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRoute(j.data);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <LoadingPage />;
  if (!route)
    return <div className="p-6 text-muted-foreground text-sm">Ruta no encontrada.</div>;

  const coord = getCoord(route.coordinatorId);
  const coordName = coord ? `${coord.firstName} ${coord.lastName}` : "—";
  const cases = route.caseIds as DosPinosCase[];

  return (
    <>
      {/* ── Screen-only chrome ────────────────────────────── */}
      <div className="print:hidden flex items-center justify-between gap-4 mb-5">
        <Link
          href="/dos-pinos/rutas"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a rutas
        </Link>
        <Button onClick={() => window.print()} size="sm" className="h-9">
          <Printer className="mr-1.5 h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {/* ── Printable document ─────────────────────────────── */}
      <div className="report-doc">
        {/* Header */}
        <div className="report-header">
          <div>
            <h1 className="report-brand">EYAN</h1>
            <p className="report-subtitle">Reporte de ruta — Dos Pinos</p>
          </div>
          <div className="report-meta">
            <div className="meta-row">
              <span className="meta-label">Fecha</span>
              <span className="meta-value">{fmtDate(route.date)}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Finalizada</span>
              <span className="meta-value">{fmtTime(route.finalizedAt)}</span>
            </div>
          </div>
        </div>

        {/* Coordinator card */}
        <div className="report-coord">
          <div className="coord-name">{coordName}</div>
          <div className="coord-contact">
            {coord?.phone && (
              <span><Phone className="h-3 w-3 inline mr-1" />{coord.phone}</span>
            )}
            {coord?.email && (
              <span><Mail className="h-3 w-3 inline mr-1" />{coord.email}</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="report-stats">
          <Stat label="Tareas" value={route.totalCases} color="text-foreground" />
          <Stat label="Completadas" value={route.completedCases} color="text-emerald-600" />
          <Stat label="Fallidas" value={route.failedCases} color="text-red-600" />
        </div>

        {/* Cases table */}
        <div className="report-cases">
          <div className="cases-header">
            Detalle de tareas ({cases.length})
          </div>
          {cases.map((c, idx) => (
            <div key={c._id} className="case-card">
              <div className="case-row-head">
                <div className="case-num">
                  <span className="case-idx">#{idx + 1}</span>
                  <span className="case-caseno">Caso {c.caseNumber}</span>
                  <span className="case-cita">{c.appointmentNumber}</span>
                </div>
                <div className={`case-status ${c.eyanStatus === "completed" ? "ok" : "fail"}`}>
                  {c.eyanStatus === "completed" ? (
                    <><CheckCircle2 className="h-3.5 w-3.5 inline" /> Completado</>
                  ) : (
                    <><XCircle className="h-3.5 w-3.5 inline" /> Fallido</>
                  )}
                </div>
              </div>
              <div className="case-pdv">{c.commercialName}</div>
              <div className="case-account">{c.accountName}</div>
              <div className="case-addr">
                <MapPin className="h-3 w-3 inline mr-1" />
                {c.clientAddress}
                {c.equipmentZone && <span className="case-zone"> · {c.equipmentZone}</span>}
              </div>

              <div className="case-grid">
                <Field label="Tipo Movimiento" value={c.movementType} />
                <Field label="Tipo Equipo" value={c.tipoEquipo} />
                <Field label="Lugar de carga" value={c.lugarDeCarga} />
                <Field label="Distancia PDV" value={c.distanciaPDV} />
                <Field label="Cliente" value={c.clientNumber ? String(c.clientNumber) : undefined} />
                <Field label="Activo" value={c.linkedAssetNumber ? String(c.linkedAssetNumber) : undefined} />
                <Field label="Reportado" value={fmtTime(c.completedAt)} />
              </div>

              {(c.comentarioAdicional || c.notes) && (
                <div className="case-note">
                  <span className="note-label">Comentario:</span>
                  <span className="note-text">{c.comentarioAdicional || c.notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="report-footer">
          <p>Generado por EYAN CRM · {new Date().toLocaleString("es-CR")}</p>
        </div>
      </div>

      {/* ── Print + screen styles ──────────────────────── */}
      <style jsx global>{`
        .report-doc {
          background: white;
          color: #0f1117;
          padding: 32px 40px;
          border-radius: 8px;
          max-width: 850px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 18px;
          margin-bottom: 24px;
          border-bottom: 2px solid #1a1d27;
        }

        .report-brand {
          font-size: 36px;
          font-weight: 900;
          letter-spacing: -1.5px;
          color: #0f1117;
          margin: 0;
          line-height: 1;
        }

        .report-subtitle {
          font-size: 12px;
          color: #6b7280;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin: 6px 0 0;
          font-weight: 600;
        }

        .report-meta {
          text-align: right;
          font-size: 11px;
        }

        .meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-bottom: 4px;
        }

        .meta-label {
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .meta-value {
          color: #0f1117;
          font-weight: 600;
          text-transform: capitalize;
        }

        .report-coord {
          background: #f3f4f6;
          padding: 14px 18px;
          border-radius: 6px;
          margin-bottom: 16px;
          border-left: 4px solid #3b82f6;
        }

        .coord-name {
          font-size: 18px;
          font-weight: 700;
          color: #0f1117;
        }

        .coord-contact {
          display: flex;
          gap: 18px;
          font-size: 11px;
          color: #6b7280;
          margin-top: 4px;
        }

        .report-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-box {
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          text-align: center;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
        }

        .stat-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #6b7280;
          margin-top: 6px;
          font-weight: 600;
        }

        .cases-header {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #6b7280;
          font-weight: 700;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 14px;
        }

        .case-card {
          padding: 14px 0;
          border-bottom: 1px solid #f3f4f6;
          page-break-inside: avoid;
        }

        .case-card:last-child {
          border-bottom: none;
        }

        .case-row-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .case-num {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .case-idx {
          background: #1a1d27;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .case-caseno {
          font-size: 12px;
          font-weight: 600;
          color: #0f1117;
          font-family: monospace;
        }

        .case-cita {
          font-size: 10px;
          color: #6b7280;
          font-family: monospace;
        }

        .case-status {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .case-status.ok {
          background: #d1fae5;
          color: #065f46;
        }

        .case-status.fail {
          background: #fee2e2;
          color: #991b1b;
        }

        .case-pdv {
          font-size: 14px;
          font-weight: 700;
          color: #0f1117;
          margin-top: 2px;
        }

        .case-account {
          font-size: 11px;
          color: #6b7280;
        }

        .case-addr {
          font-size: 11px;
          color: #4b5563;
          margin-top: 3px;
        }

        .case-zone {
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
        }

        .case-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 10px;
          padding: 10px;
          background: #f9fafb;
          border-radius: 4px;
        }

        .case-field-label {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9ca3af;
          font-weight: 700;
          display: block;
        }

        .case-field-value {
          font-size: 11px;
          color: #0f1117;
          font-weight: 500;
          margin-top: 2px;
          word-break: break-word;
        }

        .case-note {
          margin-top: 8px;
          padding: 8px 10px;
          background: #fef3c7;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.5;
          color: #1f2937;
        }

        .note-label {
          font-weight: 700;
          margin-right: 4px;
          color: #78350f;
        }

        .report-footer {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
          text-align: center;
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: white !important;
          }
          .report-doc {
            padding: 0;
            max-width: 100%;
            border-radius: 0;
          }
          .case-card {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-box">
      <div className={`stat-value ${color}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="case-field-label">{label}</span>
      <div className="case-field-value">{value || "—"}</div>
    </div>
  );
}
