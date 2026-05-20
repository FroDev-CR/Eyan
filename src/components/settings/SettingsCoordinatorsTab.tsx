"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/useToast";
import { EYAN_EMAIL_DOMAIN } from "@/lib/coordinators/eyan-email";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";

interface CoordinatorRow {
  driver: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    status: string;
  };
  user: {
    _id: string;
    email: string;
    emailLocal: string;
    isActive: boolean;
  } | null;
}

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  emailLocal: "",
  password: "",
};

export function SettingsCoordinatorsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CoordinatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/coordinators");
      const json = await res.json();
      if (json.success) setRows(json.data);
      else toast({ title: "Error", description: json.error, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: CoordinatorRow) => {
    setEditingId(row.driver._id);
    setForm({
      firstName: row.driver.firstName,
      lastName: row.driver.lastName,
      phone: row.driver.phone,
      emailLocal: row.user?.emailLocal ?? row.user?.email.split("@")[0] ?? "",
      password: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const body: Record<string, string | boolean> = {
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          emailLocal: form.emailLocal,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/settings/coordinators/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Error al guardar");
        toast({ title: "Coordinador actualizado" });
      } else {
        if (!form.password) {
          toast({ title: "Contraseña requerida", variant: "destructive" });
          return;
        }
        const res = await fetch("/api/settings/coordinators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Error al crear");
        toast({ title: "Coordinador creado", description: `${form.emailLocal}@${EYAN_EMAIL_DOMAIN}` });
      }
      setDialogOpen(false);
      fetchRows();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: CoordinatorRow) => {
    const name = `${row.driver.firstName} ${row.driver.lastName}`;
    if (!confirm(`¿Eliminar a ${name} y su acceso al app?`)) return;

    const res = await fetch(`/api/settings/coordinators/${row.driver._id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast({ title: "Coordinador eliminado" });
      fetchRows();
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Coordinadores Dos Pinos
            </CardTitle>
            <CardDescription>
              Solo administradores pueden crear o editar. El acceso al app usa correo{" "}
              <span className="font-mono">usuario@{EYAN_EMAIL_DOMAIN}</span>.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo coordinador
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hay coordinadores. Crea el primero para las rutas de Dos Pinos.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Teléfono</th>
                    <th className="px-3 py-2 font-medium">Acceso app</th>
                    <th className="px-3 py-2 font-medium w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.driver._id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2.5">
                        {row.driver.firstName} {row.driver.lastName}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.driver.phone}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {row.user?.email ?? (
                          <span className="text-yellow-500">Sin usuario vinculado</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar coordinador" : "Nuevo coordinador"}</DialogTitle>
            <DialogDescription>
              Datos de contacto y credenciales para la app móvil / web del coordinador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="8888-8888"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailLocal">Usuario de correo</Label>
              <div className="flex items-center gap-0 rounded-md border border-input overflow-hidden">
                <Input
                  id="emailLocal"
                  className="border-0 rounded-none focus-visible:ring-0"
                  value={form.emailLocal}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      emailLocal: e.target.value.toLowerCase().replace(/@.*/, ""),
                    }))
                  }
                  placeholder="juan.perez"
                />
                <span className="px-3 py-2 text-sm text-muted-foreground bg-muted border-l border-input whitespace-nowrap">
                  @{EYAN_EMAIL_DOMAIN}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Contraseña{editingId ? " (dejar vacío para no cambiar)" : ""}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
