"use client";

import { useState, useEffect, useCallback } from "react";
import type { AssignmentPopulated, AssignmentFormData, AssignmentStatus } from "@/types";
import type { ApiResponse } from "@/types/api";

interface UseAssignmentsOptions {
  status?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useAssignments(options: UseAssignmentsOptions = {}) {
  const [assignments, setAssignments] = useState<AssignmentPopulated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.driverId) params.set("driverId", options.driverId);
      if (options.dateFrom) params.set("dateFrom", options.dateFrom);
      if (options.dateTo) params.set("dateTo", options.dateTo);

      const url = `/api/assignments${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data: ApiResponse<AssignmentPopulated[]> = await response.json();

      if (data.success && data.data) {
        // Transformar campos de la API a la estructura esperada
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformed = (data.data as any[]).map((item) => ({
          ...item,
          driver: item.driverId,
          truck: item.truckId,
          route: item.routeId,
        }));
        setAssignments(transformed);
      } else {
        setError(data.error || "Error al cargar asignaciones");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.driverId, options.dateFrom, options.dateTo]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return { assignments, isLoading, error, refetch: fetchAssignments };
}

export function useAssignment(id: string) {
  const [assignment, setAssignment] = useState<AssignmentPopulated | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/assignments/${id}`);
        const data: ApiResponse<AssignmentPopulated> = await response.json();

        if (data.success && data.data) {
          setAssignment(data.data);
        } else {
          setError(data.error || "Asignación no encontrada");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAssignment();
    }
  }, [id]);

  return { assignment, isLoading, error };
}

export function useAssignmentMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const createAssignment = async (
    data: AssignmentFormData
  ): Promise<ApiResponse<AssignmentPopulated>> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const updateAssignment = async (
    id: string,
    data: Partial<AssignmentFormData>
  ): Promise<ApiResponse<AssignmentPopulated>> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: AssignmentStatus
  ): Promise<ApiResponse<AssignmentPopulated>> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAssignment = async (id: string): Promise<ApiResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${id}`, {
        method: "DELETE",
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return { createAssignment, updateAssignment, updateStatus, deleteAssignment, isLoading };
}
