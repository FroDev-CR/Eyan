"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { RouteCard } from "@/components/routes/RouteCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoutes, useRouteMutations } from "@/hooks/useRoutes";
import { useToast } from "@/hooks/useToast";
import type { Route } from "@/types";
import { Plus, MapPin } from "lucide-react";

export default function RoutesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    route: Route | null;
  }>({ open: false, route: null });

  const { routes, isLoading, refetch } = useRoutes({
    search,
    isActive: activeFilter === "all" ? undefined : activeFilter === "true",
  });
  const { deleteRoute, isLoading: isDeleting } = useRouteMutations();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteDialog.route) return;

    const result = await deleteRoute(deleteDialog.route._id);
    if (result.success) {
      toast({
        title: "Ruta eliminada",
        description: `${deleteDialog.route.name} ha sido eliminada.`,
      });
      setDeleteDialog({ open: false, route: null });
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar la ruta",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div>
      <PageHeader
        title="Rutas"
        description={`${routes.length} rutas registradas`}
        actions={
          <Button asChild>
            <Link href="/routes/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Ruta
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          placeholder="Buscar por nombre, origen o destino..."
          value={search}
          onChange={setSearch}
          className="flex-1 max-w-md"
        />
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de rutas */}
      {routes.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No hay rutas"
          description={
            search || activeFilter !== "all"
              ? "No se encontraron rutas con los filtros aplicados"
              : "Comienza agregando tu primera ruta"
          }
          action={
            !search && activeFilter === "all" && (
              <Button asChild>
                <Link href="/routes/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Ruta
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {routes.map((route) => (
            <RouteCard
              key={route._id}
              route={route}
              onDelete={(r) => setDeleteDialog({ open: true, route: r })}
            />
          ))}
        </div>
      )}

      {/* Dialog de confirmación */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, route: open ? deleteDialog.route : null })
        }
        title="Eliminar ruta"
        description={`¿Estás seguro de que deseas eliminar ${deleteDialog.route?.name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
