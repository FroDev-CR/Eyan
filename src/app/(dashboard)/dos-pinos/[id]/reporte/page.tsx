"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  VISIT_RESULT_OPTIONS,
  DISTANCIA_OPTIONS,
  EQUIPO_TIPO_BASE,
  parseStoredVisitResult,
  resolveVisitResultValue,
} from "@/constants/dos-pinos-report";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import type { DosPinosCasePopulated } from "@/types";

function getCoordName(field: DosPinosCasePopulated["assignedDriverId"]): string {
  if (!field) return "";
  if (typeof field === "object") return `${field.firstName} ${field.lastName}`;
  return "";
}

export default function CaseReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<DosPinosCasePopulated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resultado, setResultado] = useState<"completed" | "failed" | "">("");
  const [tipoEquipo, setTipoEquipo] = useState("");
  const [lugarDeCarga, setLugarDeCarga] = useState("");
  const [visitResultPreset, setVisitResultPreset] = useState("");
  const [visitResultCustom, setVisitResultCustom] = useState("");
  const [distanciaPDV, setDistanciaPDV] = useState("");
  const [comentarioAdicional, setComentarioAdicional] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [equipoOptions, setEquipoOptions] = useState<string[]>([
    ...EQUIPO_TIPO_BASE,
  ]);

  useEffect(() => {
    fetch("/api/dos-pinos/equipo-options")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setEquipoOptions(j.data);
      })
      .catch(() => {});
  }, []);

  const handleAddEquipo = async (value: string): Promise<boolean> => {
    const v = value.trim();
    if (!v) return false;
    try {
      const res = await fetch("/api/dos-pinos/equipo-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: v }),
      });
      const j = await res.json();
      if (j.success && Array.isArray(j.data)) {
        setEquipoOptions(j.data);
        setTipoEquipo(v);
        return true;
      }
      toast({ title: "Error", description: j.error, variant: "destructive" });
      return false;
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
      return false;
    }
  };

  useEffect(() => {
    fetch(`/api/dos-pinos/cases/${id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const d = j.data as DosPinosCasePopulated;
          setCaseData(d);
          setTipoEquipo(d.tipoEquipo ?? "");
          setLugarDeCarga(d.lugarDeCarga ?? "");
          const parsed = parseStoredVisitResult(d.movementType);
          setVisitResultPreset(parsed.preset);
          setVisitResultCustom(parsed.customText);
          setDistanciaPDV(d.distanciaPDV ?? "");
          setComentarioAdicional(d.comentarioAdicional ?? d.notes ?? "");
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!resultado) {
      toast({ title: "Falta resultado", description: "Marca Completado o Fallido.", variant: "destructive" });
      return;
    }

    const movementType = resolveVisitResultValue(visitResultPreset, visitResultCustom);
    if (!movementType) {
      toast({
        title: "Falta resultado de visita",
        description: "Selecciona una opción o escribe un resultado personalizado.",
        variant: "destructive",
      });
      return;
    }
    if (visitResultPreset === "personalizado" && !visitResultCustom.trim()) {
      toast({
        title: "Texto requerido",
        description: "Escribe el resultado personalizado.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/dos-pinos/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eyanStatus: resultado,
          movementType,
          tipoEquipo: tipoEquipo || undefined,
          lugarDeCarga: lugarDeCarga || undefined,
          distanciaPDV: distanciaPDV || undefined,
          comentarioAdicional: comentarioAdicional || undefined,
          notes: comentarioAdicional || undefined,
          completedAt: new Date().toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Reporte enviado", description: "Tarea actualizada." });
        router.push("/dos-pinos/mis-casos");
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingPage />;
  if (!caseData)
    return <div className="p-6 text-muted-foreground text-sm">Tarea no encontrada.</div>;

  const alreadyReported =
    caseData.eyanStatus === "completed" || caseData.eyanStatus === "failed";
  const coordName = getCoordName(caseData.assignedDriverId);

  return (
    <div className="max-w-2xl">
      {/* ── Nav ───────────────────────────────────────── */}
      <Link
        href="/dos-pinos/mis-casos"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a mis tareas
      </Link>

      {/* ── Header ────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] text-muted-foreground">
            #{caseData.caseNumber}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-[13px] text-muted-foreground">
            {caseData.appointmentNumber}
          </span>
        </div>
        <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-tight mt-1">
          {caseData.commercialName}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {caseData.accountName}
        </p>
      </div>

      {/* ── Datos automáticos ────────────────────────── */}
      <div
        className="rounded-lg p-4 mb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <Detail label="Dirección" value={caseData.clientAddress} full />
        <Detail label="Zona" value={caseData.equipmentZone} />
        <Detail label="Sucursal" value={caseData.branch} />
        <Detail label="Código Cliente" value={String(caseData.clientNumber)} />
        <Detail label="Placa - Activo" value={String(caseData.linkedAssetNumber)} />
        <Detail label="Coordinador" value={coordName || "—"} />
      </div>

      {alreadyReported ? (
        /* ── Already reported ─────────────────────────── */
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div
            className={`inline-flex items-center gap-2 text-[14px] font-medium mb-4 ${
              caseData.eyanStatus === "completed" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {caseData.eyanStatus === "completed" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {caseData.eyanStatus === "completed" ? "Completado" : "Fallido"}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] mb-3">
            <Detail label="Resultado visita" value={caseData.movementType ?? "—"} />
            <Detail label="Tipo Equipo" value={caseData.tipoEquipo ?? "—"} />
            <Detail label="Sucursal" value={caseData.lugarDeCarga ?? "—"} />
            <Detail label="Distancia PDV" value={caseData.distanciaPDV ?? "—"} />
          </div>
          {(caseData.comentarioAdicional || caseData.notes) && (
            <div className="mb-2">
              <span className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground">
                Comentario adicional
              </span>
              <p className="text-[13px] text-foreground mt-1 bg-accent rounded-md px-3 py-2">
                {caseData.comentarioAdicional || caseData.notes}
              </p>
            </div>
          )}
          {caseData.completedAt && (
            <p className="text-[11px] text-muted-foreground mt-3">
              Reportado: {new Date(caseData.completedAt).toLocaleString("es-CR")}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/dos-pinos/mis-casos">Volver</Link>
          </Button>
        </div>
      ) : (
        /* ── Report form ──────────────────────────────── */
        <div className="flex flex-col gap-4">
          {/* Resultado */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--color-surface)" }}>
            <p className="text-[11px] font-heading font-600 uppercase tracking-widest text-muted-foreground mb-3">
              Resultado de la visita
            </p>
            <div className="grid grid-cols-2 gap-3">
              <ResultButton
                active={resultado === "completed"}
                onClick={() => setResultado("completed")}
                icon={<CheckCircle2 className="h-6 w-6" />}
                label="Completado"
                activeColor="border-emerald-500 bg-emerald-500/[0.08] text-emerald-400"
                idleColor="border-border hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-400"
              />
              <ResultButton
                active={resultado === "failed"}
                onClick={() => setResultado("failed")}
                icon={<XCircle className="h-6 w-6" />}
                label="Fallido"
                activeColor="border-red-500 bg-red-500/[0.08] text-red-400"
                idleColor="border-border hover:border-red-500/40 text-muted-foreground hover:text-red-400"
              />
            </div>
          </div>

          {/* Datos del Excel */}
          <div className="rounded-lg p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: "var(--color-surface)" }}>
            <FieldVisitResult
              preset={visitResultPreset}
              customText={visitResultCustom}
              onPresetChange={setVisitResultPreset}
              onCustomChange={setVisitResultCustom}
            />
            <FieldEquipoTipo
              value={tipoEquipo}
              options={equipoOptions}
              onChange={setTipoEquipo}
              onAdd={handleAddEquipo}
            />
            <FieldText
              label="Sucursal"
              value={lugarDeCarga}
              onChange={setLugarDeCarga}
              placeholder="RIO CLARO..."
            />
            <FieldSelect
              label="Distancia del PDV"
              value={distanciaPDV}
              onChange={setDistanciaPDV}
              options={DISTANCIA_OPTIONS as readonly string[]}
              placeholder="Seleccionar distancia..."
              full
            />
          </div>

          {/* Comentario */}
          <div className="rounded-lg p-4" style={{ backgroundColor: "var(--color-surface)" }}>
            <p className="text-[11px] font-heading font-600 uppercase tracking-widest text-muted-foreground mb-3">
              Comentario adicional
              <span className="normal-case tracking-normal text-muted-foreground/60 ml-1">(opcional)</span>
            </p>
            <Textarea
              placeholder="Describe lo ocurrido, firma digital/física, observaciones..."
              value={comentarioAdicional}
              onChange={(e) => setComentarioAdicional(e.target.value)}
              rows={4}
              maxLength={1000}
              className="resize-none text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground/50 mt-1.5 text-right">
              {comentarioAdicional.length}/1000
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!resultado || isSaving}
            className="h-10 font-heading font-600 tracking-wide"
          >
            {isSaving ? "Enviando..." : "Enviar reporte"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <span className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <p className="text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

function FieldVisitResult({
  preset,
  customText,
  onPresetChange,
  onCustomChange,
}: {
  preset: string;
  customText: string;
  onPresetChange: (v: string) => void;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div className="col-span-2 space-y-2">
      <label className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground block">
        Resultado visita
      </label>
      <Select value={preset || undefined} onValueChange={onPresetChange}>
        <SelectTrigger className="h-9 text-[13px]">
          <SelectValue placeholder="Seleccionar resultado..." />
        </SelectTrigger>
        <SelectContent>
          {VISIT_RESULT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "personalizado" && (
        <Input
          value={customText}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="Describe el resultado de la visita..."
          className="h-9 text-[13px]"
        />
      )}
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground block mb-1.5">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-[13px]"
      />
    </div>
  );
}

const ADD_SENTINEL = "__add_categoria__";

function FieldEquipoTipo({
  value,
  options,
  onChange,
  onAdd,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  onAdd: (v: string) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Valor guardado que no está en la lista (legacy texto libre): mostrarlo igual
  const allOptions =
    value && !options.includes(value) ? [value, ...options] : options;

  const handleSave = async () => {
    setSaving(true);
    const ok = await onAdd(draft);
    setSaving(false);
    if (ok) {
      setDraft("");
      setAdding(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground block mb-1.5">
        Tipo de Equipo
      </label>
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nueva categoría..."
            className="h-9 text-[13px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={saving || !draft.trim()}
            onClick={handleSave}
          >
            {saving ? "..." : "Guardar"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setAdding(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Select
          value={value || undefined}
          onValueChange={(v) => {
            if (v === ADD_SENTINEL) {
              setAdding(true);
              return;
            }
            onChange(v);
          }}
        >
          <SelectTrigger className="h-9 text-[13px]">
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {allOptions.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-[13px]">
                {opt}
              </SelectItem>
            ))}
            <SelectItem
              value={ADD_SENTINEL}
              className="text-[13px] text-primary"
            >
              + Añadir categoría
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder?: string;
  full?: boolean;
}) {
  // Valor legacy fuera de la lista: mostrarlo igual
  const allOptions =
    value && !options.includes(value) ? [value, ...options] : [...options];
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground block mb-1.5">
        {label}
      </label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-[13px]">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allOptions.map((opt) => (
            <SelectItem key={opt} value={opt} className="text-[13px]">
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResultButton({
  active,
  onClick,
  icon,
  label,
  activeColor,
  idleColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeColor: string;
  idleColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 py-5 rounded-lg border-2 transition-colors ${
        active ? activeColor : idleColor
      }`}
    >
      {icon}
      <span className="text-[13px] font-heading font-600 tracking-wide">
        {label}
      </span>
    </button>
  );
}
