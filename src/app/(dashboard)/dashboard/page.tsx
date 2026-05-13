"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DriverAgenda } from "@/components/planning/DriverAgenda";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Users, Truck, MapPin, CalendarCheck } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isDriver = session?.user?.role === "driver";

  // Drivers land on Dos Pinos tasks, not the legacy assignments dashboard
  useEffect(() => {
    if (status === "authenticated" && isDriver) {
      router.replace("/dos-pinos/mis-casos");
    }
  }, [status, isDriver, router]);

  if (status === "loading" || isDriver) return <LoadingPage />;

  return <AdminDashboard />;
}

function AdminDashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema de transporte"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Coordinadores activos"
          value="12"
          description="3 en ruta actualmente"
          icon={Users}
        />
        <StatCard
          title="Camiones disponibles"
          value="8"
          description="De 15 en total"
          icon={Truck}
        />
        <StatCard
          title="Rutas activas"
          value="24"
          description="6 nuevas este mes"
          icon={MapPin}
        />
        <StatCard
          title="Asignaciones hoy"
          value="7"
          description="2 completadas"
          icon={CalendarCheck}
        />
      </div>

      {/* Quick overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Asignaciones de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Juan Pérez</p>
                      <p className="text-sm text-muted-foreground">
                        San José → Limón
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-status-scheduled text-white">
                    Programado
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { text: "Nueva asignación creada", time: "Hace 5 min" },
                { text: "Ruta completada: Cartago → Heredia", time: "Hace 1 hora" },
                { text: "Camión T-003 en mantenimiento", time: "Hace 2 horas" },
                { text: "Coordinador Carlos López marcó llegada", time: "Hace 3 horas" },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DriverDashboard() {
  const { data: session } = useSession();
  const driverId = session?.user?.driverId;

  return (
    <div>
      <PageHeader
        title="Mi Agenda"
        description="Tus asignaciones y rutas programadas"
      />

      {driverId ? (
        <DriverAgenda driverId={driverId} />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Cuenta no vinculada</h3>
              <p className="text-sm text-muted-foreground">
                Tu cuenta de usuario no está vinculada a un perfil de coordinador.
                Contacta al administrador para resolver esto.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
