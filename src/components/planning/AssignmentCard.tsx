"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, stringToColor, formatTime } from "@/lib/utils";
import { assignmentStatusLabels, assignmentStatusVariants } from "@/constants/status";
import type { AssignmentPopulated } from "@/types";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Truck,
  MapPin,
  Clock,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface AssignmentCardProps {
  assignment: AssignmentPopulated;
  onEdit?: (assignment: AssignmentPopulated) => void;
  onDelete?: (assignment: AssignmentPopulated) => void;
  onStatusChange?: (assignment: AssignmentPopulated, status: string) => void;
  compact?: boolean;
}

export function AssignmentCard({
  assignment,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: AssignmentCardProps) {
  const driverName = `${assignment.driver.firstName} ${assignment.driver.lastName}`;
  const initials = getInitials(driverName);
  const avatarColor = stringToColor(driverName);

  if (compact) {
    return (
      <div className="p-2 rounded-md bg-accent/50 border border-border hover:border-primary/50 transition-colors cursor-pointer group">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {assignment.startTime && (
              <span className="text-xs font-mono text-muted-foreground">
                {formatTime(assignment.startTime)}
              </span>
            )}
            <Badge
              variant={assignmentStatusVariants[assignment.status]}
              className="h-5 text-[10px]"
            >
              {assignmentStatusLabels[assignment.status]}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(assignment)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {assignment.status === "scheduled" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(assignment, "in_progress")}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Iniciar
                </DropdownMenuItem>
              )}
              {assignment.status === "in_progress" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(assignment, "completed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completar
                </DropdownMenuItem>
              )}
              {assignment.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange?.(assignment, "cancelled")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(assignment)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{assignment.route.name}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Truck className="h-3 w-3 flex-shrink-0" />
          <span className="truncate font-mono">{assignment.truck.plateNumber}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback style={{ backgroundColor: avatarColor }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{driverName}</p>
            <Badge variant={assignmentStatusVariants[assignment.status]}>
              {assignmentStatusLabels[assignment.status]}
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(assignment)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {assignment.status === "scheduled" && (
              <DropdownMenuItem
                onClick={() => onStatusChange?.(assignment, "in_progress")}
              >
                <Play className="mr-2 h-4 w-4" />
                Iniciar ruta
              </DropdownMenuItem>
            )}
            {assignment.status === "in_progress" && (
              <DropdownMenuItem
                onClick={() => onStatusChange?.(assignment, "completed")}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar completada
              </DropdownMenuItem>
            )}
            {assignment.status !== "cancelled" && (
              <DropdownMenuItem
                onClick={() => onStatusChange?.(assignment, "cancelled")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete?.(assignment)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{assignment.route.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span>
            {assignment.truck.name} -{" "}
            <span className="font-mono">{assignment.truck.plateNumber}</span>
          </span>
        </div>
        {assignment.startTime && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatTime(assignment.startTime)}
              {assignment.endTime && ` - ${formatTime(assignment.endTime)}`}
            </span>
          </div>
        )}
        {assignment.notes && (
          <p className="text-xs text-muted-foreground mt-2 p-2 bg-accent/30 rounded">
            {assignment.notes}
          </p>
        )}
      </div>
    </div>
  );
}
