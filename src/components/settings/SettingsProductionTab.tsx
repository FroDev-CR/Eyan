"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { AlertTriangle, Loader2, Trash2, Users } from "lucide-react";

export function SettingsProductionTab() {
  const { toast } = useToast();
  const [cleaningDosPinos, setCleaningDosPinos] = useState(false);
  const [cleaningCoordinators, setCleaningCoordinators] = useState(false);

  const handleCleanDosPinos = async () => {
    if (
      !confirm(
        "Se eliminarán TODOS los casos Dos Pinos y rutas diarias (incluye datos importados por Excel). ¿Continuar?"
      )
    )
      return;
    if (!confirm("Confirmación final: esta acción no se puede deshacer.")) return;

    setCleaningDosPinos(true);
    try {
      const res = await fetch("/api/settings/production-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosPinos: true, coordinators: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error");
      toast({
        title: "Dos Pinos limpiado",
        description: `${json.data.casesDeleted ?? 0} casos · ${json.data.routesDeleted ?? 0} rutas eliminadas`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setCleaningDosPinos(false);
    }
  };

  const handleCleanCoordinators = async () => {
    if (
      !confirm(
        "Se eliminarán TODOS los coordinadores y sus usuarios de acceso (incluye datos de prueba del seed). ¿Continuar?"
      )
    )
      return;
    if (!confirm("Última confirmación: no quedará ningún coordinador en el sistema.")) return;

    setCleaningCoordinators(true);
    try {
      const res = await fetch("/api/settings/production-cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosPinos: false, coordinators: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error");
      toast({
        title: "Coordinadores eliminados",
        description: `${json.data.coordinatorsDeleted ?? 0} perfiles · ${json.data.coordinatorUsersDeleted ?? 0} usuarios`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setCleaningCoordinators(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Usa estas herramientas una vez antes de producción. Después crea coordinadores reales en la
          pestaña <strong className="text-foreground">Coordinadores</strong> e importa casos desde
          Salesforce o Excel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4" />
            Datos Dos Pinos (prueba / Excel)
          </CardTitle>
          <CardDescription>
            Borra casos importados por Excel, sincronización de prueba y rutas diarias finalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            onClick={handleCleanDosPinos}
            disabled={cleaningDosPinos}
          >
            {cleaningDosPinos ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Limpiar casos y rutas Dos Pinos
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Coordinadores de prueba
          </CardTitle>
          <CardDescription>
            Elimina todos los coordinadores y usuarios con rol coordinador (juan, carlos, miguel, etc.
            del seed). No elimina admin ni despachadores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
            onClick={handleCleanCoordinators}
            disabled={cleaningCoordinators}
          >
            {cleaningCoordinators ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            Eliminar todos los coordinadores
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
