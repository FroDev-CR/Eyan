import type { DriverStatus, TruckStatus, AssignmentStatus, TruckType } from "@/types";

// Estados de coordinador con etiquetas en español
export const driverStatusLabels: Record<DriverStatus, string> = {
  available: "Disponible",
  on_route: "En ruta",
  off_duty: "Fuera de servicio",
  inactive: "Inactivo",
};

export const driverStatusColors: Record<DriverStatus, string> = {
  available: "bg-driver-available",
  on_route: "bg-driver-on-route",
  off_duty: "bg-driver-off-duty",
  inactive: "bg-driver-inactive",
};

// Estados de camión con etiquetas en español
export const truckStatusLabels: Record<TruckStatus, string> = {
  available: "Disponible",
  in_use: "En uso",
  maintenance: "En mantenimiento",
  inactive: "Inactivo",
};

export const truckStatusColors: Record<TruckStatus, string> = {
  available: "bg-truck-available",
  in_use: "bg-truck-in-use",
  maintenance: "bg-truck-maintenance",
  inactive: "bg-truck-inactive",
};

// Tipos de camión con etiquetas en español
export const truckTypeLabels: Record<TruckType, string> = {
  flatbed: "Plataforma",
  refrigerated: "Refrigerado",
  cargo: "Carga general",
  tanker: "Cisterna",
  other: "Otro",
};

// Estados de asignación con etiquetas en español
export const assignmentStatusLabels: Record<AssignmentStatus, string> = {
  scheduled: "Programado",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const assignmentStatusColors: Record<AssignmentStatus, string> = {
  scheduled: "bg-status-scheduled",
  in_progress: "bg-status-in-progress",
  completed: "bg-status-completed",
  cancelled: "bg-status-cancelled",
};

// Para usar en los badges de shadcn/ui
export const assignmentStatusVariants: Record<AssignmentStatus, "scheduled" | "in-progress" | "completed" | "cancelled"> = {
  scheduled: "scheduled",
  in_progress: "in-progress",
  completed: "completed",
  cancelled: "cancelled",
};

export const driverStatusVariants: Record<DriverStatus, "available" | "on-route" | "off-duty" | "inactive"> = {
  available: "available",
  on_route: "on-route",
  off_duty: "off-duty",
  inactive: "inactive",
};

export const truckStatusVariants: Record<TruckStatus, "available" | "in-use" | "maintenance" | "inactive"> = {
  available: "available",
  in_use: "in-use",
  maintenance: "maintenance",
  inactive: "inactive",
};
