"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { TruckForm } from "@/components/fleet/TruckForm";
import { useTruck } from "@/hooks/useTrucks";

interface EditTruckPageProps {
  params: Promise<{ id: string }>;
}

export default function EditTruckPage({ params }: EditTruckPageProps) {
  const { id } = use(params);
  const { truck, isLoading, error } = useTruck(id);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !truck) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Camión no encontrado</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Camión"
        description={`${truck.name} - ${truck.plateNumber}`}
      />
      <TruckForm truck={truck} />
    </div>
  );
}
