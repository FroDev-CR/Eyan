import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistance, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// Combina clases de Tailwind de forma segura
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatear fechas
export function formatDate(date: Date | string, formatStr: string = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, formatStr, { locale: es });
}

// Formatear fecha relativa (hace 2 días, etc.)
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true, locale: es });
}

// Formatear hora
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Generar iniciales de un nombre
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Capitalizar primera letra
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Generar color consistente basado en string (para avatares)
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "#3B82F6", // azul
    "#22C55E", // verde
    "#F59E0B", // amarillo
    "#EF4444", // rojo
    "#8B5CF6", // violeta
    "#EC4899", // rosa
    "#06B6D4", // cyan
    "#F97316", // naranja
  ];
  return colors[Math.abs(hash) % colors.length];
}

// Formatear duración en minutos a horas y minutos
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

// Validar placa de vehículo (formato genérico)
export function isValidPlate(plate: string): boolean {
  // Formato básico: letras y números, 5-8 caracteres
  return /^[A-Z0-9]{5,8}$/i.test(plate.replace(/[-\s]/g, ""));
}

// Generar ID único simple
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
