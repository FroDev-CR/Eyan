"use client";

import { useState, useEffect, useCallback } from "react";
import type { Route, RouteFormData } from "@/types";
import type { ApiResponse } from "@/types/api";

interface UseRoutesOptions {
  isActive?: boolean;
  search?: string;
}

export function useRoutes(options: UseRoutesOptions = {}) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.isActive !== undefined) {
        params.set("isActive", String(options.isActive));
      }
      if (options.search) params.set("search", options.search);

      const url = `/api/routes${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data: ApiResponse<Route[]> = await response.json();

      if (data.success && data.data) {
        setRoutes(data.data);
      } else {
        setError(data.error || "Error al cargar rutas");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [options.isActive, options.search]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return { routes, isLoading, error, refetch: fetchRoutes };
}

export function useRoute(id: string) {
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/routes/${id}`);
        const data: ApiResponse<Route> = await response.json();

        if (data.success && data.data) {
          setRoute(data.data);
        } else {
          setError(data.error || "Ruta no encontrada");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRoute();
    }
  }, [id]);

  return { route, isLoading, error };
}

export function useRouteMutations() {
  const [isLoading, setIsLoading] = useState(false);

  const createRoute = async (data: RouteFormData): Promise<ApiResponse<Route>> => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const updateRoute = async (id: string, data: RouteFormData): Promise<ApiResponse<Route>> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRoute = async (id: string): Promise<ApiResponse> => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/routes/${id}`, {
        method: "DELETE",
      });
      return await response.json();
    } finally {
      setIsLoading(false);
    }
  };

  return { createRoute, updateRoute, deleteRoute, isLoading };
}
