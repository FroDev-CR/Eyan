import { PageHeader } from "@/components/shared/PageHeader";
import { PlanningBoard } from "@/components/planning/PlanningBoard";

export default function PlanningPage() {
  return (
    <div>
      <PageHeader
        title="Planificación"
        description="Gestiona las asignaciones de rutas, coordinadores y camiones"
      />
      <PlanningBoard />
    </div>
  );
}
