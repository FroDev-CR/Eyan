import type { UserRole } from "@/types";

// Etiquetas de roles en español
export const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  dispatcher: "Despachador",
  driver: "Coordinador",
};

// Descripciones de roles
export const roleDescriptions: Record<UserRole, string> = {
  admin: "Acceso completo a todas las funcionalidades del sistema",
  dispatcher: "Puede gestionar planificación, rutas y asignaciones",
  driver: "Puede ver y actualizar sus propias tareas asignadas",
};

// Permisos por rol
export interface Permission {
  canViewDashboard: boolean;
  canViewPlanning: boolean;
  canEditPlanning: boolean;
  canManageDrivers: boolean;
  canManageFleet: boolean;
  canManageRoutes: boolean;
  canEditRoutes: boolean;
  canViewOrders: boolean;
  canManageOrders: boolean;
  canManageCRM: boolean;
  canManagePayroll: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
  canUpdateOwnAssignments: boolean;
}

export const rolePermissions: Record<UserRole, Permission> = {
  admin: {
    canViewDashboard: true,
    canViewPlanning: true,
    canEditPlanning: true,
    canManageDrivers: true,
    canManageFleet: true,
    canManageRoutes: true,
    canEditRoutes: true,
    canViewOrders: true,
    canManageOrders: true,
    canManageCRM: true,
    canManagePayroll: true,
    canManageSettings: true,
    canManageUsers: true,
    canUpdateOwnAssignments: true,
  },
  dispatcher: {
    canViewDashboard: true,
    canViewPlanning: true,
    canEditPlanning: true,
    canManageDrivers: false,
    canManageFleet: false,
    canManageRoutes: true,
    canEditRoutes: true,
    canViewOrders: true,
    canManageOrders: false,
    canManageCRM: false,
    canManagePayroll: false,
    canManageSettings: false,
    canManageUsers: false,
    canUpdateOwnAssignments: true,
  },
  driver: {
    canViewDashboard: true,
    canViewPlanning: false,
    canEditPlanning: false,
    canManageDrivers: false,
    canManageFleet: false,
    canManageRoutes: false,
    canEditRoutes: false,
    canViewOrders: false,
    canManageOrders: false,
    canManageCRM: false,
    canManagePayroll: false,
    canManageSettings: false,
    canManageUsers: false,
    canUpdateOwnAssignments: true,
  },
};

// Helper para verificar permisos
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  return rolePermissions[role][permission];
}
