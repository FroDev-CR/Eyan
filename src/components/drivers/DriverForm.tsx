"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useDriverMutations } from "@/hooks/useDrivers";
import { useToast } from "@/hooks/useToast";
import { driverStatusLabels } from "@/constants/status";
import type { Driver, DriverFormData, DriverStatus } from "@/types";
import { Loader2 } from "lucide-react";

interface DriverFormProps {
  driver?: Driver;
  onSuccess?: () => void;
}

export function DriverForm({ driver, onSuccess }: DriverFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createDriver, updateDriver, isLoading } = useDriverMutations();

  const [formData, setFormData] = useState<DriverFormData>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    licenseNumber: "",
    licenseExpiry: "",
    status: "available",
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        email: driver.email,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: new Date(driver.licenseExpiry).toISOString().split("T")[0],
        status: driver.status,
      });
    }
  }, [driver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = driver
      ? await updateDriver(driver._id, formData)
      : await createDriver(formData);

    if (result.success) {
      toast({
        title: driver ? "Coordinador actualizado" : "Coordinador creado",
        description: `${formData.firstName} ${formData.lastName} ha sido ${driver ? "actualizado" : "creado"} correctamente.`,
      });
      onSuccess?.();
      router.push("/drivers");
      router.refresh();
    } else {
      toast({
        title: "Error",
        description: result.error || "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof DriverFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{driver ? "Editar Coordinador" : "Nuevo Coordinador"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="juan@ejemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+506 8888-8888"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Número de Licencia</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => handleChange("licenseNumber", e.target.value)}
                placeholder="ABC123456"
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseExpiry">Vencimiento de Licencia</Label>
              <Input
                id="licenseExpiry"
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => handleChange("licenseExpiry", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange("status", value as DriverStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(driverStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            ) : driver ? (
              "Guardar cambios"
            ) : (
              "Crear coordinador"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
