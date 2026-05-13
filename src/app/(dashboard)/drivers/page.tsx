"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DriverCard } from "@/components/drivers/DriverCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDrivers, useDriverMutations } from "@/hooks/useDrivers";
import { useToast } from "@/hooks/useToast";
import { driverStatusLabels } from "@/constants/status";
import type { Driver } from "@/types";
import { Plus, Users } from "lucide-react";

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    driver: Driver | null;
  }>({ open: false, driver: null });

  const { drivers, isLoading, refetch } = useDrivers({
    search,
    status: status !== "all" ? status : undefined,
  });
  const { deleteDriver, isLoading: isDeleting } = useDriverMutations();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deleteDialog.driver) return;

    const result = await deleteDriver(deleteDialog.driver._id);
    if (result.success) {
      toast({
        title: "Coordinador eliminado",
        description: `${deleteDialog.driver.firstName} ${deleteDialog.driver.lastName} ha sido eliminado.`,
      });
      setDeleteDialog({ open: false, driver: null });
      refetch();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar el coordinador",
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
        title="Coordinadores"
        description={`${drivers.length} coordinadores registrados`}
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Coordinador
            </Link>
          </Button>
        }
      />

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
                <Link href="/drivers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Coordinador
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => (
            <DriverCard
              key={driver._id}
              driver={driver}
              onDelete={(d) => setDeleteDialog({ open: true, driver: d })}
            />
          ))}
        </div>
      )}

      {/* Dialog de confirmación de eliminación */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, driver: open ? deleteDialog.driver : null })
        }
        title="Eliminar coordinador"
        description={`¿Estás seguro de que deseas eliminar a ${deleteDialog.driver?.firstName} ${deleteDialog.driver?.lastName}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
