"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { DriverForm } from "@/components/drivers/DriverForm";
import { useDriver } from "@/hooks/useDrivers";

interface EditDriverPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDriverPage({ params }: EditDriverPageProps) {
  const { id } = use(params);
  const { driver, isLoading, error } = useDriver(id);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !driver) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Coordinador no encontrado</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Coordinador"
        description={`${driver.firstName} ${driver.lastName}`}
      />
      <DriverForm driver={driver} />
    </div>
  );
}
