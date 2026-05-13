"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useTruckMutations } from "@/hooks/useTrucks";
import { useToast } from "@/hooks/useToast";
import { truckStatusLabels, truckTypeLabels } from "@/constants/status";
import type { Truck, TruckFormData, TruckStatus, TruckType } from "@/types";
import { Loader2 } from "lucide-react";

interface TruckFormProps {
  truck?: Truck;
  onSuccess?: () => void;
}

export function TruckForm({ truck, onSuccess }: TruckFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createTruck, updateTruck, isLoading } = useTruckMutations();

  const [formData, setFormData] = useState<TruckFormData>({
    plateNumber: "",
    name: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    capacity: "",
    type: "cargo",
    status: "available",
    currentMileage: undefined,
    notes: "",
  });

  useEffect(() => {
    if (truck) {
      setFormData({
        plateNumber: truck.plateNumber,
        name: truck.name,
        brand: truck.brand,
        model: truck.model,
        year: truck.year,
        capacity: truck.capacity,
        type: truck.type,
        status: truck.status,
        currentMileage: truck.currentMileage,
        notes: truck.notes || "",
      });
    }
  }, [truck]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = truck
      ? await updateTruck(truck._id, formData)
      : await createTruck(formData);

    if (result.success) {
      toast({
        title: truck ? "Camión actualizado" : "Camión creado",
        description: `${formData.name} ha sido ${truck ? "actualizado" : "creado"} correctamente.`,
      });
      onSuccess?.();
      router.push("/fleet");
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof TruckFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{truck ? "Editar Camión" : "Nuevo Camión"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre / Identificador</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Ej: Camión Azul, T-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Placa</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) => handleChange("plateNumber", e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="font-mono uppercase"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ej: Volvo, Freightliner"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleChange("model", e.target.value)}
                placeholder="Ej: VNL 760"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => handleChange("year", parseInt(e.target.value))}
                min={1990}
                max={new Date().getFullYear() + 1}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Camión</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange("type", value as TruckType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(truckTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                value={formData.capacity}
                onChange={(e) => handleChange("capacity", e.target.value)}
                placeholder="Ej: 10 toneladas"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange("status", value as TruckStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(truckStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentMileage">Kilometraje Actual</Label>
              <Input
                id="currentMileage"
                type="number"
                value={formData.currentMileage || ""}
                onChange={(e) =>
                  handleChange(
                    "currentMileage",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="Km"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Notas adicionales sobre el camión..."
              rows={3}
            />
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
            ) : truck ? (
              "Guardar cambios"
            ) : (
              "Crear camión"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
