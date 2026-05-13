// Tipos para respuestas de API

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Parámetros de filtro específicos
export interface DriverListParams extends ListParams {
  status?: string;
}

export interface TruckListParams extends ListParams {
  status?: string;
  type?: string;
}

export interface RouteListParams extends ListParams {
  isActive?: boolean;
}

export interface AssignmentListParams extends ListParams {
  status?: string;
  driverId?: string;
  truckId?: string;
  routeId?: string;
  dateFrom?: string;
  dateTo?: string;
}
