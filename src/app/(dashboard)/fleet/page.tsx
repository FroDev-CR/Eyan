"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TruckCard } from "@/components/fleet/TruckCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTrucks, useTruckMutations } from "@/hooks/useTrucks";
import { useToast } from "@/hooks/useToast";
import { truckStatusLabels, truckTypeLabels } from "@/constants/status";
import type { Truck } from "@/types";
import { Plus, Truck as TruckIcon } from "lucide-react";

export default function FleetPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    truck: Truck | null;
  }>({ open: false, truck: null });

  const { trucks, isLoading, refetch } = useTrucks({
    search,
    status: status !== "all" ? status : undefined,
    type: type !== "all" ? type : undefined,
  });
  const { deleteTruck, isLoading: isDeleting } = useTruckMutations();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteDialog.truck) return;

    const result = await deleteTruck(deleteDialog.truck._id);
    if (result.success) {
      toast({
        title: "Camión eliminado",
        description: `${deleteDialog.truck.name} ha sido eliminado.`,
      });
      setDeleteDialog({ open: false, truck: null });
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar el camión",
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
        title="Flota"
        description={`${trucks.length} camiones registrados`}
        actions={
          <Button asChild>
            <Link href="/fleet/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Camión
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          placeholder="Buscar por nombre, placa, marca..."
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
            {Object.entries(truckStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(truckTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de camiones */}
      {trucks.length === 0 ? (
        <EmptyState
          icon={TruckIcon}
          title="No hay camiones"
          description={
            search || status !== "all" || type !== "all"
              ? "No se encontraron camiones con los filtros aplicados"
              : "Comienza agregando tu primer camión"
          }
          action={
            !search && status === "all" && type === "all" && (
              <Button asChild>
                <Link href="/fleet/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Camión
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trucks.map((truck) => (
            <TruckCard
              key={truck._id}
              truck={truck}
              onDelete={(t) => setDeleteDialog({ open: true, truck: t })}
            />
          ))}
        </div>
      )}

      {/* Dialog de confirmación */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, truck: open ? deleteDialog.truck : null })
        }
        title="Eliminar camión"
        description={`¿Estás seguro de que deseas eliminar ${deleteDialog.truck?.name}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
