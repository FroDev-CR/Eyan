/** Opciones fijas para «Resultado visita» (antes Tipo de movimiento) */
export const VISIT_RESULT_PRESETS = [
  "Exitoso",
  "Reemplazo",
  "Retiro unico",
  "Infructuoso",
] as const;

export type VisitResultPreset = (typeof VISIT_RESULT_PRESETS)[number] | "personalizado" | "";

export const VISIT_RESULT_OPTIONS: { value: string; label: string }[] = [
  { value: "Exitoso", label: "Exitoso" },
  { value: "Reemplazo", label: "Reemplazo" },
  { value: "Retiro unico", label: "Retiro único" },
  { value: "Infructuoso", label: "Infructuoso" },
  { value: "personalizado", label: "Personalizado" },
];

export function resolveVisitResultValue(
  preset: string,
  customText: string
): string {
  if (preset === "personalizado") return customText.trim();
  return preset.trim();
}

export function parseStoredVisitResult(stored: string | undefined): {
  preset: string;
  customText: string;
} {
  const value = (stored ?? "").trim();
  if (!value) return { preset: "", customText: "" };
  if ((VISIT_RESULT_PRESETS as readonly string[]).includes(value)) {
    return { preset: value, customText: "" };
  }
  return { preset: "personalizado", customText: value };
}

/** Opciones base de «Tipo de equipo». Las personalizadas se guardan en DB
 *  (modelo DosPinosEquipoOption) y se mezclan con estas en runtime. */
export const EQUIPO_TIPO_BASE = [
  "Paletera",
  "1 ptas",
  "2 ptas",
  "3 ptas",
] as const;

/** Opciones fijas para «Distancia del PDV». */
export const DISTANCIA_OPTIONS = [
  "0 a 5 km",
  "5 a 15 km",
  "15 a 30 km",
  "+30 km",
] as const;

/** Estilo del badge según el tipo de tarea de Salesforce (campo «Estado»).
 *  Compartido entre la vista admin y la del coordinador. */
export const SF_STATUS_STYLE: Record<string, string> = {
  "Para entrega": "bg-blue-500/15 text-blue-300",
  "Para Reemplazo": "bg-violet-500/15 text-violet-300",
  "Para reemplazo": "bg-violet-500/15 text-violet-300",
  "En ruta": "bg-orange-500/15 text-orange-300",
  "Completado": "bg-emerald-500/15 text-emerald-300",
};

export function sfStatusStyle(status: string | undefined): string {
  return SF_STATUS_STYLE[status ?? ""] ?? "bg-muted text-muted-foreground";
}
