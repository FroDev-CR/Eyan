import { PageHeader } from "@/components/shared/PageHeader";
import { RouteForm } from "@/components/routes/RouteForm";

export default function NewRoutePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nueva Ruta"
        description="Agrega una nueva ruta al sistema"
      />
      <RouteForm />
    </div>
  );
}
