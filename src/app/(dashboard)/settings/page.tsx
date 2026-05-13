"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { Loader2, Database, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  const handleSeedDatabase = async () => {
    if (!confirm("Esto eliminará todos los datos existentes y creará datos de prueba. ¿Continuar?")) {
      return;
    }

    setIsSeeding(true);
    try {
      const response = await fetch("/api/seed", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Datos creados",
          description: `Se crearon ${data.data.users} usuarios, ${data.data.drivers} coordinadores, ${data.data.trucks} camiones, ${data.data.routes} rutas y ${data.data.assignments} asignaciones.`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron crear los datos de prueba",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Configuración general del sistema"
      />

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
            <CardDescription>
              Herramientas para gestionar la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Precaución</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    La acción de poblar datos de prueba eliminará todos los datos existentes
                    y los reemplazará con datos de demostración.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleSeedDatabase}
              disabled={isSeeding}
            >
              {isSeeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando datos...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Poblar datos de prueba
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Esto creará:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>1 admin (admin@eyan.com / admin123)</li>
                <li>1 despachador (maria@eyan.com / admin123)</li>
                <li>5 coordinadores con usuario (juan@eyan.com, carlos@eyan.com... / coord123)</li>
                <li>5 camiones de diferentes tipos</li>
                <li>6 rutas principales</li>
                <li>6 asignaciones para esta semana</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
            <CardDescription>
              Detalles técnicos de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Versión</dt>
                <dd className="font-mono">1.0.0</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Framework</dt>
                <dd className="font-mono">Next.js 14</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Base de datos</dt>
                <dd className="font-mono">MongoDB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Autenticación</dt>
                <dd className="font-mono">NextAuth.js</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
