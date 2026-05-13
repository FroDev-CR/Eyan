"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { roleLabels } from "@/constants/roles";
import { Loader2, KeyRound } from "lucide-react";
import type { UserRole } from "@/types";

export default function PerfilPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast({ title: "Contraseña actualizada" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const userRole = (session?.user?.role as UserRole) ?? "driver";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
          Mi perfil
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Información de tu cuenta y cambio de contraseña
        </p>
      </div>

      <div className="grid gap-5 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Información de cuenta</CardTitle>
            <CardDescription>Datos asociados a tu usuario</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{session?.user?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-mono text-xs">{session?.user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rol</dt>
                <dd className="font-medium">{roleLabels[userRole]}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Cambiar contraseña
            </CardTitle>
            <CardDescription>
              Necesitas tu contraseña actual para confirmar el cambio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="current">Contraseña actual</Label>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new">Nueva contraseña</Label>
                <Input
                  id="new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Cambiar contraseña"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
