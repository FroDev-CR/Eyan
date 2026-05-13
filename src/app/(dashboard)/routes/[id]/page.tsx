"use client";

import { use } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { RouteForm } from "@/components/routes/RouteForm";
import { useRoute } from "@/hooks/useRoutes";

interface EditRoutePageProps {
  params: Promise<{ id: string }>;
}

export default function EditRoutePage({ params }: EditRoutePageProps) {
  const { id } = use(params);
  const { route, isLoading, error } = useRoute(id);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !route) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Ruta no encontrada</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Editar Ruta"
        description={route.name}
      />
      <RouteForm route={route} />
    </div>
  );
}
