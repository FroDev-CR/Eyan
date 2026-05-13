import { PageHeader } from "@/components/shared/PageHeader";
import { DriverForm } from "@/components/drivers/DriverForm";

export default function NewDriverPage() {
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nuevo Coordinador"
        description="Agrega un nuevo coordinador al sistema"
      />
      <DriverForm />
    </div>
  );
}
