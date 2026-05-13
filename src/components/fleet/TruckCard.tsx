"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { truckStatusLabels, truckStatusVariants, truckTypeLabels } from "@/constants/status";
import type { Truck } from "@/types";
import { MoreVertical, Pencil, Trash2, Truck as TruckIcon, Gauge, Calendar } from "lucide-react";

interface TruckCardProps {
  truck: Truck;
  onDelete?: (truck: Truck) => void;
}

export function TruckCard({ truck, onDelete }: TruckCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <TruckIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Link
                href={`/fleet/${truck._id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                {truck.name}
              </Link>
              <p className="text-sm font-mono text-muted-foreground">
                {truck.plateNumber}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/fleet/${truck._id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(truck)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={truckStatusVariants[truck.status]}>
            {truckStatusLabels[truck.status]}
          </Badge>
          <Badge variant="secondary">{truckTypeLabels[truck.type]}</Badge>
        </div>

        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{truck.brand} {truck.model}</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {truck.year}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Capacidad: {truck.capacity}</span>
            {truck.currentMileage && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {truck.currentMileage.toLocaleString()} km
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
