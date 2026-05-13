"use client";

import { useState, useEffect, useCallback } from "react";
import type { Driver, DriverFormData } from "@/types";
import type { ApiResponse } from "@/types/api";

interface UseDriversOptions {
  status?: string;
  search?: string;
}

export function useDrivers(options: UseDriversOptions = {}) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.search) params.set("search", options.search);

      const url = `/api/drivers${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data: ApiResponse<Driver[]> = await response.json();

      if (data.success && data.data) {
        setDrivers(data.data);
      } else {
        setError(data.error || "Error al cargar coordinadores");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.search]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  return { drivers, isLoading, error, refetch: fetchDrivers };
}

export function useDriver(id: string) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/drivers/${id}`);
        const data: ApiResponse<Driver> = await response.json();

        if (data.success && data.data) {
          setDriver(data.data);
        } else {
          setError(data.error || "Coordinador no encontrado");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDriver();
    }
  }, [id]);

  return { driver, isLoading, error };
}

export function useDriverMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const createDriver = async (data: DriverFormData): Promise<ApiResponse<Driver>> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const updateDriver = async (id: string, data: DriverFormData): Promise<ApiResponse<Driver>> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drivers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDriver = async (id: string): Promise<ApiResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drivers/${id}`, {
        method: "DELETE",
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return { createDriver, updateDriver, deleteDriver, isLoading };
}
