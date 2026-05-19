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
