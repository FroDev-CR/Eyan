"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AssignmentCard } from "./AssignmentCard";
import { AssignmentModal } from "./AssignmentModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDrivers } from "@/hooks/useDrivers";
import { useAssignments, useAssignmentMutations } from "@/hooks/useAssignments";
import { useToast } from "@/hooks/useToast";
import { getInitials, stringToColor, formatDate } from "@/lib/utils";
import {
  addDays,
  startOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { es } from "date-fns/locale";
import type { AssignmentPopulated, Driver } from "@/types";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanningBoard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"week" | "day">("week");
  const [modalState, setModalState] = useState<{
    open: boolean;
    assignment?: AssignmentPopulated;
    defaultDate?: string;
    defaultDriverId?: string;
  }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    assignment: AssignmentPopulated | null;
  }>({ open: false, assignment: null });

  const { toast } = useToast();
  const { updateStatus, deleteAssignment, isLoading: isMutating } = useAssignmentMutations();

  // Calcular rango de fechas
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Lunes
  const days = viewType === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [currentDate];

  const dateFrom = format(days[0], "yyyy-MM-dd");
  const dateTo = format(days[days.length - 1], "yyyy-MM-dd");

  const { drivers } = useDrivers();
  const { assignments, refetch } = useAssignments({ dateFrom, dateTo });

  // Agrupar asignaciones por driver y fecha
  const assignmentsByDriverAndDate = useMemo(() => {
    const map = new Map<string, Map<string, AssignmentPopulated[]>>();

    assignments.forEach((assignment) => {
      // Validar que el driver existe
      if (!assignment.driver?._id) return;

      const driverId = assignment.driver._id;
      const dateStr = format(new Date(assignment.date), "yyyy-MM-dd");

      if (!map.has(driverId)) {
        map.set(driverId, new Map());
      }
      const driverMap = map.get(driverId)!;
      if (!driverMap.has(dateStr)) {
        driverMap.set(dateStr, []);
      }
      driverMap.get(dateStr)!.push(assignment);
    });

    return map;
  }, [assignments]);

  const navigateWeek = (direction: number) => {
    setCurrentDate((prev) => addDays(prev, direction * (viewType === "week" ? 7 : 1)));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCellClick = (driver: Driver, date: Date) => {
    setModalState({
      open: true,
      defaultDate: format(date, "yyyy-MM-dd"),
      defaultDriverId: driver._id,
    });
  };

  const handleEditAssignment = (assignment: AssignmentPopulated) => {
    setModalState({ open: true, assignment });
  };

  const handleDeleteAssignment = (assignment: AssignmentPopulated) => {
    setDeleteDialog({ open: true, assignment });
  };

  const handleStatusChange = async (assignment: AssignmentPopulated, status: string) => {
    const result = await updateStatus(assignment._id, status as AssignmentPopulated["status"]);
    if (result.success) {
      toast({
        title: "Estado actualizado",
        description: `La asignación ahora está ${status === "in_progress" ? "en progreso" : status === "completed" ? "completada" : "cancelada"}.`,
      });
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.assignment) return;

    const result = await deleteAssignment(deleteDialog.assignment._id);
    if (result.success) {
      toast({
        title: "Asignación eliminada",
        description: "La asignación ha sido eliminada.",
      });
      setDeleteDialog({ open: false, assignment: null });
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con navegación */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            <Calendar className="mr-2 h-4 w-4" />
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {viewType === "week"
              ? `${format(days[0], "d MMM", { locale: es })} - ${format(days[6], "d MMM yyyy", { locale: es })}`
              : format(currentDate, "EEEE, d MMMM yyyy", { locale: es })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md">
            <Button
              variant={viewType === "day" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("day")}
              className="rounded-r-none"
            >
              Día
            </Button>
            <Button
              variant={viewType === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("week")}
              className="rounded-l-none"
            >
              Semana
            </Button>
          </div>
          <Button onClick={() => setModalState({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva asignación
          </Button>
        </div>
      </div>

      {/* Tablero */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header de días */}
        <div className="grid bg-surface border-b border-border" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
          <div className="p-3 border-r border-border font-medium text-muted-foreground">
            Coordinador
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "p-3 text-center border-r border-border last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE", { locale: es })}
              </div>
              <div className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Filas de coordinadores */}
        <div className="divide-y divide-border">
          {drivers.map((driver) => {
            const driverName = `${driver.firstName} ${driver.lastName}`;
            const initials = getInitials(driverName);
            const avatarColor = stringToColor(driverName);
            const driverAssignments = assignmentsByDriverAndDate.get(driver._id);

            return (
              <div
                key={driver._id}
                className="grid"
                style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}
              >
                {/* Info del coordinador */}
                <div className="p-3 border-r border-border flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{driverName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{driver.status.replace("_", " ")}</p>
                  </div>
                </div>

                {/* Celdas por día */}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayAssignments = driverAssignments?.get(dateStr) || [];

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-2 min-h-[100px] border-r border-border last:border-r-0 cursor-pointer hover:bg-accent/30 transition-colors",
                        isToday(day) && "bg-primary/5"
                      )}
                      onClick={() => handleCellClick(driver, day)}
                    >
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        {dayAssignments.map((assignment) => (
                          <AssignmentCard
                            key={assignment._id}
                            assignment={assignment}
                            compact
                            onEdit={handleEditAssignment}
                            onDelete={handleDeleteAssignment}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Empty state si no hay coordinadores */}
        {drivers.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No hay coordinadores registrados. Agrega coordinadores para comenzar a planificar.
          </div>
        )}
      </div>

      {/* Modal de asignación */}
      <AssignmentModal
        open={modalState.open}
        onOpenChange={(open) => setModalState((prev) => ({ ...prev, open }))}
        assignment={modalState.assignment}
        defaultDate={modalState.defaultDate}
        defaultDriverId={modalState.defaultDriverId}
        onSuccess={refetch}
      />

      {/* Dialog de confirmación de eliminación */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, assignment: open ? deleteDialog.assignment : null })
        }
        title="Eliminar asignación"
        description="¿Estás seguro de que deseas eliminar esta asignación? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="destructive"
        isLoading={isMutating}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
