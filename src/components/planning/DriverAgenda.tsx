"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAssignments, useAssignmentMutations } from "@/hooks/useAssignments";
import { useToast } from "@/hooks/useToast";
import {
  formatDate,
  formatTime,
  formatDuration,
} from "@/lib/utils";
import {
  assignmentStatusLabels,
  assignmentStatusVariants,
} from "@/constants/status";
import type { AssignmentPopulated } from "@/types";
import {
  Calendar,
  MapPin,
  Truck,
  Clock,
  Play,
  CheckCircle,
  Navigation,
  Phone,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface DriverAgendaProps {
  driverId: string;
}

export function DriverAgenda({ driverId }: DriverAgendaProps) {
  const [activeTab, setActiveTab] = useState("today");
  const { toast } = useToast();
  const { updateStatus, isLoading: isUpdating } = useAssignmentMutations();

  // Fechas para filtros
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const { assignments: todayAssignments, isLoading: loadingToday, refetch: refetchToday } =
    useAssignments({
      driverId,
      dateFrom: todayStr,
      dateTo: todayStr,
    });

  const { assignments: weekAssignments, isLoading: loadingWeek, refetch: refetchWeek } =
    useAssignments({
      driverId,
      dateFrom: format(weekStart, "yyyy-MM-dd"),
      dateTo: format(weekEnd, "yyyy-MM-dd"),
    });

  const handleStatusChange = async (assignment: AssignmentPopulated, newStatus: string) => {
    const result = await updateStatus(assignment._id, newStatus as AssignmentPopulated["status"]);
    if (result.success) {
      toast({
        title: newStatus === "in_progress" ? "Ruta iniciada" : "Ruta completada",
        description: newStatus === "in_progress"
          ? "Has iniciado la ruta. ¡Buen viaje!"
          : "Has completado la ruta exitosamente.",
        variant: newStatus === "completed" ? "success" : "default",
      });
      refetchToday();
      refetchWeek();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="today" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Hoy
          {todayAssignments.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {todayAssignments.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="week" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Esta semana
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </div>

        {loadingToday ? (
          <LoadingSpinner text="Cargando asignaciones..." />
        ) : todayAssignments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin asignaciones hoy"
            description="No tienes rutas programadas para hoy. Descansa y prepárate para mañana."
          />
        ) : (
          <div className="space-y-4">
            {todayAssignments.map((assignment) => (
              <AssignmentDetailCard
                key={assignment._id}
                assignment={assignment}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="week" className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </div>

        {loadingWeek ? (
          <LoadingSpinner text="Cargando asignaciones..." />
        ) : weekAssignments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin asignaciones esta semana"
            description="No tienes rutas programadas para esta semana."
          />
        ) : (
          <div className="space-y-4">
            {weekAssignments.map((assignment) => (
              <AssignmentDetailCard
                key={assignment._id}
                assignment={assignment}
                onStatusChange={handleStatusChange}
                isUpdating={isUpdating}
                showDate
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

interface AssignmentDetailCardProps {
  assignment: AssignmentPopulated;
  onStatusChange: (assignment: AssignmentPopulated, status: string) => void;
  isUpdating: boolean;
  showDate?: boolean;
}

function AssignmentDetailCard({
  assignment,
  onStatusChange,
  isUpdating,
  showDate = false,
}: AssignmentDetailCardProps) {
  const canStart = assignment.status === "scheduled";
  const canComplete = assignment.status === "in_progress";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            {showDate && (
              <p className="text-sm text-muted-foreground mb-1">
                {formatDate(assignment.date, "EEEE, d MMM")}
              </p>
            )}
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {assignment.route.name}
            </CardTitle>
          </div>
          <Badge variant={assignmentStatusVariants[assignment.status]}>
            {assignmentStatusLabels[assignment.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Detalles de la ruta */}
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
            <Navigation className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{assignment.route.origin}</p>
              <p className="text-xs text-muted-foreground">Origen</p>
            </div>
            <div className="flex-1 border-t border-dashed border-border mx-2" />
            <div className="text-right">
              <p className="font-medium">{assignment.route.destination}</p>
              <p className="text-xs text-muted-foreground">Destino</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{assignment.truck.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {assignment.truck.plateNumber}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                {assignment.startTime ? (
                  <>
                    <p className="font-medium">
                      {formatTime(assignment.startTime)}
                      {assignment.endTime && ` - ${formatTime(assignment.endTime)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{formatDuration(assignment.route.estimatedDuration)}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Sin hora definida</p>
                )}
              </div>
            </div>
          </div>

          {assignment.route.distance && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{assignment.route.distance} km de distancia</span>
            </div>
          )}

          {assignment.notes && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-sm font-medium text-warning mb-1">Notas:</p>
              <p className="text-sm">{assignment.notes}</p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        {(canStart || canComplete) && (
          <div className="flex gap-2 pt-2">
            {canStart && (
              <Button
                className="flex-1"
                onClick={() => onStatusChange(assignment, "in_progress")}
                disabled={isUpdating}
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar Ruta
              </Button>
            )}
            {canComplete && (
              <Button
                className="flex-1"
                variant="success"
                onClick={() => onStatusChange(assignment, "completed")}
                disabled={isUpdating}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar Completada
              </Button>
            )}
          </div>
        )}

        {assignment.status === "completed" && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-success/10 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Ruta completada</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
