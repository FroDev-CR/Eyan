"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouteMutations } from "@/hooks/useRoutes";
import { useToast } from "@/hooks/useToast";
import type { Route, RouteFormData } from "@/types";
import { Loader2 } from "lucide-react";

interface RouteFormProps {
  route?: Route;
  onSuccess?: () => void;
}

export function RouteForm({ route, onSuccess }: RouteFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createRoute, updateRoute, isLoading } = useRouteMutations();

  const [formData, setFormData] = useState<RouteFormData>({
    name: "",
    origin: "",
    destination: "",
    estimatedDuration: 60,
    distance: undefined,
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (route) {
      setFormData({
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        estimatedDuration: route.estimatedDuration,
        distance: route.distance,
        description: route.description || "",
        isActive: route.isActive,
      });
    }
  }, [route]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = route
      ? await updateRoute(route._id, formData)
      : await createRoute(formData);

    if (result.success) {
      toast({
        title: route ? "Ruta actualizada" : "Ruta creada",
        description: `${formData.name} ha sido ${route ? "actualizada" : "creada"} correctamente.`,
      });
      onSuccess?.();
      router.push("/routes");
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof RouteFormData, value: string | number | boolean | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-generar nombre si origen y destino están completos
  useEffect(() => {
    if (formData.origin && formData.destination && !route) {
      const autoName = `${formData.origin} → ${formData.destination}`;
      if (formData.name !== autoName) {
        setFormData((prev) => ({ ...prev, name: autoName }));
      }
    }
  }, [formData.origin, formData.destination, formData.name, route]);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{route ? "Editar Ruta" : "Nueva Ruta"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Ruta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ej: San José → Limón"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="origin">Origen</Label>
              <Input
                id="origin"
                value={formData.origin}
                onChange={(e) => handleChange("origin", e.target.value)}
                placeholder="Ej: San José"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
                placeholder="Ej: Limón"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Duración Estimada (minutos)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => handleChange("estimatedDuration", parseInt(e.target.value))}
                min={1}
                required
              />
              <p className="text-xs text-muted-foreground">
                {Math.floor(formData.estimatedDuration / 60)}h {formData.estimatedDuration % 60}min
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">Distancia (km)</Label>
              <Input
                id="distance"
                type="number"
                value={formData.distance || ""}
                onChange={(e) =>
                  handleChange("distance", e.target.value ? parseInt(e.target.value) : undefined)
                }
                min={0}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Descripción adicional de la ruta..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="isActive" className="text-sm font-normal cursor-pointer">
              Ruta activa (disponible para asignaciones)
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : route ? (
              "Guardar cambios"
            ) : (
              "Crear ruta"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
