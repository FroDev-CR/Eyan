import { PageHeader } from "@/components/shared/PageHeader";
import { TruckForm } from "@/components/fleet/TruckForm";

export default function NewTruckPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nuevo Camión"
        description="Agrega un nuevo camión a la flota"
      />
      <TruckForm />
    </div>
  );
}
