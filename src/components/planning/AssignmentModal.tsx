"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useDrivers } from "@/hooks/useDrivers";
import { useTrucks } from "@/hooks/useTrucks";
import { useRoutes } from "@/hooks/useRoutes";
import { useAssignmentMutations } from "@/hooks/useAssignments";
import { useToast } from "@/hooks/useToast";
import type { AssignmentFormData, AssignmentPopulated } from "@/types";
import { Loader2 } from "lucide-react";

interface AssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: AssignmentPopulated;
  defaultDate?: string;
  defaultDriverId?: string;
  onSuccess?: () => void;
}

export function AssignmentModal({
  open,
  onOpenChange,
  assignment,
  defaultDate,
  defaultDriverId,
  onSuccess,
}: AssignmentModalProps) {
  const { toast } = useToast();
  const { createAssignment, updateAssignment, isLoading } = useAssignmentMutations();

  const { drivers } = useDrivers({ status: "available" });
  const { trucks } = useTrucks({ status: "available" });
  const { routes } = useRoutes({ isActive: true });

  const [formData, setFormData] = useState<AssignmentFormData>({
    date: defaultDate || new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    driverId: defaultDriverId || "",
    truckId: "",
    routeId: "",
    notes: "",
  });

  useEffect(() => {
    if (assignment) {
      setFormData({
        date: new Date(assignment.date).toISOString().split("T")[0],
        startTime: assignment.startTime || "",
        endTime: assignment.endTime || "",
        driverId: assignment.driver._id,
        truckId: assignment.truck._id,
        routeId: assignment.route._id,
        notes: assignment.notes || "",
      });
    } else {
      setFormData({
        date: defaultDate || new Date().toISOString().split("T")[0],
        startTime: "",
        endTime: "",
        driverId: defaultDriverId || "",
        truckId: "",
        routeId: "",
        notes: "",
      });
    }
  }, [assignment, defaultDate, defaultDriverId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = assignment
      ? await updateAssignment(assignment._id, formData)
      : await createAssignment(formData);

    if (result.success) {
      toast({
        title: assignment ? "Asignación actualizada" : "Asignación creada",
        description: "La asignación se ha guardado correctamente.",
      });
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast({
        title: "Error",
        description: result.error || "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: keyof AssignmentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Combinar lista de drivers disponibles con el driver actual (si está editando)
  const availableDrivers = assignment
    ? [...drivers.filter(d => d._id !== assignment.driver._id), assignment.driver as never]
    : drivers;

  const availableTrucks = assignment
    ? [...trucks.filter(t => t._id !== assignment.truck._id), assignment.truck as never]
    : trucks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {assignment ? "Editar Asignación" : "Nueva Asignación"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de salida</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Hora estimada llegada</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driverId">Coordinador</Label>
            <Select
              value={formData.driverId}
              onValueChange={(value) => handleChange("driverId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar coordinador" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver._id} value={driver._id}>
                    {driver.firstName} {driver.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="truckId">Camión</Label>
            <Select
              value={formData.truckId}
              onValueChange={(value) => handleChange("truckId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar camión" />
              </SelectTrigger>
              <SelectContent>
                {availableTrucks.map((truck) => (
                  <SelectItem key={truck._id} value={truck._id}>
                    {truck.name} - {truck.plateNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="routeId">Ruta</Label>
            <Select
              value={formData.routeId}
              onValueChange={(value) => handleChange("routeId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ruta" />
              </SelectTrigger>
              <SelectContent>
                {routes.map((route) => (
                  <SelectItem key={route._id} value={route._id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Instrucciones especiales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
              ) : assignment ? (
                "Guardar cambios"
              ) : (
                "Crear asignación"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
