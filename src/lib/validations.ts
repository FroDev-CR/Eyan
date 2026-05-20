import { z } from "zod";

// Validaciones comunes
export const emailSchema = z.string().email("Email inválido");
export const phoneSchema = z.string().min(7, "Teléfono debe tener al menos 7 caracteres");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)");
export const timeSchema = z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Hora inválida (HH:MM)").optional();

// Schema de coordinador
export const driverSchema = z.object({
  firstName: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  lastName: z.string().min(2, "Apellido debe tener al menos 2 caracteres").max(50),
  phone: phoneSchema,
  email: emailSchema,
  licenseNumber: z.string().min(5, "Número de licencia inválido"),
  licenseExpiry: dateSchema,
  status: z.enum(["available", "on_route", "off_duty", "inactive"]).default("available"),
});

export type DriverFormSchema = z.infer<typeof driverSchema>;

// Schema de camión
export const truckSchema = z.object({
  plateNumber: z.string().min(5, "Placa inválida").max(10).toUpperCase(),
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  brand: z.string().min(2, "Marca requerida"),
  model: z.string().min(1, "Modelo requerido"),
  year: z.number().min(1990, "Año debe ser mayor a 1990").max(new Date().getFullYear() + 1),
  capacity: z.string().min(1, "Capacidad requerida"),
  type: z.enum(["flatbed", "refrigerated", "cargo", "tanker", "other"]).default("cargo"),
  status: z.enum(["available", "in_use", "maintenance", "inactive"]).default("available"),
  currentMileage: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type TruckFormSchema = z.infer<typeof truckSchema>;

// Schema de ruta
export const routeSchema = z.object({
  name: z.string().min(3, "Nombre debe tener al menos 3 caracteres").max(100),
  origin: z.string().min(2, "Origen requerido"),
  destination: z.string().min(2, "Destino requerido"),
  estimatedDuration: z.number().min(1, "Duración debe ser al menos 1 minuto"),
  distance: z.number().min(0).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export type RouteFormSchema = z.infer<typeof routeSchema>;

// Schema de asignación
export const assignmentSchema = z.object({
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  driverId: z.string().min(1, "Coordinador requerido"),
  truckId: z.string().min(1, "Camión requerido"),
  routeId: z.string().min(1, "Ruta requerida"),
  notes: z.string().max(500).optional(),
});

export type AssignmentFormSchema = z.infer<typeof assignmentSchema>;

// Schema de login
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export type LoginFormSchema = z.infer<typeof loginSchema>;

// Schema de usuario
export const userSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(100),
  email: emailSchema,
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["admin", "dispatcher", "driver"]).default("driver"),
  driverId: z.string().optional(),
});

export type UserFormSchema = z.infer<typeof userSchema>;

const emailLocalSchema = z
  .string()
  .min(1, "Usuario de correo requerido")
  .max(64)
  .regex(/^[a-z0-9._-]+$/i, "Solo letras, números, punto, guion y guion bajo");

/** Coordinador Dos Pinos — alta desde Configuración (admin) */
export const coordinatorCreateSchema = z.object({
  firstName: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  lastName: z.string().min(2, "Apellido debe tener al menos 2 caracteres").max(50),
  phone: phoneSchema,
  emailLocal: emailLocalSchema,
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export const coordinatorUpdateSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: phoneSchema.optional(),
  emailLocal: emailLocalSchema.optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export type CoordinatorCreateSchema = z.infer<typeof coordinatorCreateSchema>;
export type CoordinatorUpdateSchema = z.infer<typeof coordinatorUpdateSchema>;

// Función helper para validar datos
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || "Error de validación" };
}
