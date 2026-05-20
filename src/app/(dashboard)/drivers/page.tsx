"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { DriverCard } from "@/components/drivers/DriverCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDrivers } from "@/hooks/useDrivers";
import { driverStatusLabels } from "@/constants/status";
import { Settings, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const { drivers, isLoading } = useDrivers({
    search,
    status: status !== "all" ? status : undefined,
  });
  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div>
      <PageHeader
        title="Coordinadores"
        description={`${drivers.length} coordinadores registrados — solo lectura`}
        actions={
          <Button asChild variant="outline">
            <Link href="/settings?tab=coordinadores">
              <Settings className="mr-2 h-4 w-4" />
              Gestionar en Configuración
            </Link>
          </Button>
        }
      />

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="py-3 text-sm text-muted-foreground">
          Crear, editar contraseñas y eliminar coordinadores solo desde{" "}
          <Link href="/settings?tab=coordinadores" className="text-primary hover:underline font-medium">
            Configuración → Coordinadores
          </Link>
          .
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          placeholder="Buscar por nombre, email o licencia..."
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-md"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(driverStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de coordinadores */}
      {drivers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay coordinadores"
          description={
            search || status !== "all"
              ? "No se encontraron coordinadores con los filtros aplicados"
              : "Comienza agregando tu primer coordinador"
          }
          action={
            !search && status === "all" && (
              <Button asChild>
                <Link href="/settings?tab=coordinadores">
                  <Settings className="mr-2 h-4 w-4" />
                  Ir a Configuración
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <DriverCard key={driver._id} driver={driver} readOnly />
          ))}
        </div>
      )}

    </div>
  );
}
