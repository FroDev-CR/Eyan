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
import { formatDuration } from "@/lib/utils";
import type { Route } from "@/types";
import {
  MoreVertical,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Navigation,
  ArrowRight,
} from "lucide-react";

interface RouteCardProps {
  route: Route;
  onDelete?: (route: Route) => void;
}

export function RouteCard({ route, onDelete }: RouteCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Link
                href={`/routes/${route._id}`}
                className="font-semibold hover:text-primary transition-colors"
              >
                {route.name}
              </Link>
              <Badge
                variant={route.isActive ? "success" : "secondary"}
                className="ml-2"
              >
                {route.isActive ? "Activa" : "Inactiva"}
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
              <DropdownMenuItem asChild>
                <Link href={`/routes/${route._id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete?.(route)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-3">
          {/* Origen → Destino */}
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <span>{route.origin}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span>{route.destination}</span>
          </div>

          {/* Duración y distancia */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(route.estimatedDuration)}</span>
            </div>
            {route.distance && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{route.distance} km</span>
              </div>
            )}
          </div>

          {/* Descripción */}
          {route.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {route.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
