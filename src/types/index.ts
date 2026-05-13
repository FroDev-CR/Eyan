// Tipos principales de EYAN

// Roles de usuario
export type UserRole = "admin" | "dispatcher" | "driver";

// Estados de coordinador
export type DriverStatus = "available" | "on_route" | "off_duty" | "inactive";

// Estados de camión
export type TruckStatus = "available" | "in_use" | "maintenance" | "inactive";

// Tipos de camión
export type TruckType = "flatbed" | "refrigerated" | "cargo" | "tanker" | "other";

// Estados de asignación
export type AssignmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

// Usuario
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  driverId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Coordinador
export interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: Date;
  status: DriverStatus;
  avatar?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Camión
export interface Truck {
  _id: string;
  plateNumber: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  capacity: string;
  type: TruckType;
  status: TruckStatus;
  currentMileage?: number;
  lastMaintenanceDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ruta
export interface Route {
  _id: string;
  name: string;
  origin: string;
  destination: string;
  estimatedDuration: number;
  distance?: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Asignación
export interface Assignment {
  _id: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  driverId: string;
  truckId: string;
  routeId: string;
  status: AssignmentStatus;
  notes?: string;
  orderId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Asignación poblada (con relaciones expandidas)
export interface AssignmentPopulated extends Omit<Assignment, "driverId" | "truckId" | "routeId" | "createdBy"> {
  driver: Driver;
  truck: Truck;
  route: Route;
  createdBy: User;
}

// Formularios
export interface DriverFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: DriverStatus;
}

export interface TruckFormData {
  plateNumber: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  capacity: string;
  type: TruckType;
  status: TruckStatus;
  currentMileage?: number;
  notes?: string;
}

export interface RouteFormData {
  name: string;
  origin: string;
  destination: string;
  estimatedDuration: number;
  distance?: number;
  description?: string;
  isActive: boolean;
}

export interface AssignmentFormData {
  date: string;
  startTime?: string;
  endTime?: string;
  driverId: string;
  truckId: string;
  routeId: string;
  notes?: string;
}

// Dos Pinos
export type DPCaseStatus = "pending" | "assigned" | "in_progress" | "completed" | "failed";

export interface DosPinosCase {
  _id: string;
  caseNumber: number;
  appointmentNumber: string;
  linkedAssetNumber: number;
  clientNumber: number;
  commercialName: string;
  sfStatus: string;
  branch: string;
  sfStatus2: string;
  clientAddress: string;
  equipmentZone: string;
  accountName: string;
  serviceResourceName: string;
  openingDate?: Date;
  eyanStatus: DPCaseStatus;
  assignedDriverId?: string;
  assignedZone?: string;
  movementType?: string;
  importBatch: string;
  importedAt: Date;
  week?: number;
  year?: number;
  notes?: string;
  completedAt?: Date;
  tipoEquipo?: string;
  lugarDeCarga?: string;
  distanciaPDV?: string;
  comentarioAdicional?: string;
  routeOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DosPinosCasePopulated extends Omit<DosPinosCase, "assignedDriverId"> {
  assignedDriverId?: { _id: string; firstName: string; lastName: string } | string;
}

export interface DosPinosDailyRoute {
  _id: string;
  coordinatorId: string | { _id: string; firstName: string; lastName: string; phone?: string; email?: string };
  date: string;
  caseIds: string[] | DosPinosCase[];
  totalCases: number;
  completedCases: number;
  failedCases: number;
  finalizedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DPImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  batch: string;
  week?: number;
  year?: number;
  cases: DosPinosCase[];
}
