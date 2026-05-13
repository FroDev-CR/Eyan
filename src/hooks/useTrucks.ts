"use client";

import { useState, useEffect, useCallback } from "react";
import type { Truck, TruckFormData } from "@/types";
import type { ApiResponse } from "@/types/api";

interface UseTrucksOptions {
  status?: string;
  type?: string;
  search?: string;
}

export function useTrucks(options: UseTrucksOptions = {}) {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrucks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);
      if (options.type) params.set("type", options.type);
      if (options.search) params.set("search", options.search);

      const url = `/api/fleet${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data: ApiResponse<Truck[]> = await response.json();

      if (data.success && data.data) {
        setTrucks(data.data);
      } else {
        setError(data.error || "Error al cargar camiones");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.type, options.search]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  return { trucks, isLoading, error, refetch: fetchTrucks };
}

export function useTruck(id: string) {
  const [truck, setTruck] = useState<Truck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTruck = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/fleet/${id}`);
        const data: ApiResponse<Truck> = await response.json();

        if (data.success && data.data) {
          setTruck(data.data);
        } else {
          setError(data.error || "Camión no encontrado");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchTruck();
    }
  }, [id]);

  return { truck, isLoading, error };
}

export function useTruckMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const createTruck = async (data: TruckFormData): Promise<ApiResponse<Truck>> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fleet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const updateTruck = async (id: string, data: TruckFormData): Promise<ApiResponse<Truck>> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fleet/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTruck = async (id: string): Promise<ApiResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/fleet/${id}`, {
        method: "DELETE",
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return { createTruck, updateTruck, deleteTruck, isLoading };
}
