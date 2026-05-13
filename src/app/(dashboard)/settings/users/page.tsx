"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useToast } from "@/hooks/useToast";
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  KeyRound,
  Trash2,
  Loader2,
} from "lucide-react";
import type { Driver, UserRole } from "@/types";

interface UserListItem {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  driverId?: { _id: string; firstName: string; lastName: string; phone?: string; email?: string } | null;
}

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  dispatcher: "Despachador",
  driver: "Coordinador",
};

const roleColors: Record<UserRole, string> = {
  admin: "text-purple-400 bg-purple-500/10",
  dispatcher: "text-blue-400 bg-blue-500/10",
  driver: "text-emerald-400 bg-emerald-500/10",
};

export default function UsersAdminPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [resettingPwd, setResettingPwd] = useState<UserListItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole !== "all") params.set("role", filterRole);
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } finally {
      setIsLoading(false);
    }
  }, [filterRole, search]);

  const fetchDrivers = useCallback(async () => {
    const res = await fetch("/api/drivers");
    const json = await res.json();
    if (json.success) setDrivers(json.data);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleDelete = async (u: UserListItem) => {
    if (!confirm(`¿Eliminar usuario ${u.email}? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/users/${u._id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast({ title: "Usuario eliminado" });
      fetchUsers();
    } else {
      toast({ title: "Error", description: json.error, variant: "destructive" });
    }
  };

  // drivers without linked user (for create dialog)
  const linkedDriverIds = new Set(
    users.filter((u) => u.role === "driver" && u.driverId).map((u) => u.driverId!._id)
  );
  const availableDrivers = drivers.filter((d) => !linkedDriverIds.has(d._id));

  if (isLoading && users.length === 0) return <LoadingPage />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
            Usuarios
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Gestión de cuentas, roles y vinculación con coordinadores
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm" className="h-9">
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm w-[280px]"
        />
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as typeof filterRole)}>
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="dispatcher">Despachadores</SelectItem>
            <SelectItem value="driver">Coordinadores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="Sin usuarios"
          description="Crea el primer usuario para comenzar."
        />
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="grid grid-cols-[1fr_220px_140px_180px_140px] border-b border-border">
            {["NOMBRE", "EMAIL", "ROL", "COORDINADOR", "ACCIONES"].map((h) => (
              <div
                key={h}
                className="px-3 py-2.5 text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {users.map((u) => (
              <div
                key={u._id}
                className="grid grid-cols-[1fr_220px_140px_180px_140px] items-center hover:bg-accent/40 transition-colors"
              >
                <div className="px-3 py-3 flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">{u.name}</span>
                  {!u.isActive && (
                    <span className="text-[9px] uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="px-3 py-3 text-[12px] text-muted-foreground font-mono truncate">
                  {u.email}
                </div>
                <div className="px-3 py-3">
                  <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded ${roleColors[u.role]}`}>
                    {roleLabels[u.role]}
                  </span>
                </div>
                <div className="px-3 py-3 text-[12px] text-muted-foreground truncate">
                  {u.driverId
                    ? `${u.driverId.firstName} ${u.driverId.lastName}`
                    : "—"}
                </div>
                <div className="px-3 py-3 flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setEditing(u)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setResettingPwd(u)}
                    title="Resetear contraseña"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(u)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              {users.length} {users.length === 1 ? "usuario" : "usuarios"}
            </p>
          </div>
        </div>
      )}

      {creating && (
        <UserFormDialog
          open={creating}
          onClose={() => setCreating(false)}
          drivers={availableDrivers}
          onSaved={() => {
            setCreating(false);
            fetchUsers();
          }}
        />
      )}

      {editing && (
        <UserFormDialog
          open={!!editing}
          user={editing}
          drivers={drivers.filter(
            (d) =>
              !linkedDriverIds.has(d._id) ||
              (editing.driverId && editing.driverId._id === d._id)
          )}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            fetchUsers();
          }}
        />
      )}

      {resettingPwd && (
        <PasswordResetDialog
          user={resettingPwd}
          onClose={() => setResettingPwd(null)}
          onSaved={() => setResettingPwd(null)}
        />
      )}
    </div>
  );
}

/* ── User create/edit dialog ──────────────────────────── */
function UserFormDialog({
  open,
  user,
  drivers,
  onClose,
  onSaved,
}: {
  open: boolean;
  user?: UserListItem;
  drivers: Driver[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "driver");
  const [driverId, setDriverId] = useState<string>(user?.driverId?._id ?? "");
  const [isActive, setIsActive] = useState<boolean>(user?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = {
      name,
      email,
      role,
      driverId: role === "driver" ? driverId || null : null,
    };
    if (!isEdit) payload.password = password;
    if (isEdit) payload.isActive = isActive;

    try {
      const res = await fetch(
        isEdit ? `/api/users/${user!._id}` : "/api/users",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast({
          title: isEdit ? "Usuario actualizado" : "Usuario creado",
        });
        onSaved();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del usuario."
              : "Completa los datos para crear un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@eyan.com"
              required
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="dispatcher">Despachador</SelectItem>
                <SelectItem value="driver">Coordinador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "driver" && (
            <div className="space-y-1.5">
              <Label htmlFor="driver">Coordinador vinculado</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un coordinador" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Sin coordinadores disponibles. Crea uno primero.
                    </div>
                  ) : (
                    drivers.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.firstName} {d.lastName} — {d.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Usuario activo
              </Label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                "Guardar"
              ) : (
                "Crear"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Password reset dialog ────────────────────────────── */
function PasswordResetDialog({
  user,
  onClose,
  onSaved,
}: {
  user: UserListItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user._id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Contraseña actualizada",
          description: `Nueva contraseña para ${user.email}`,
        });
        onSaved();
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resetear contraseña</DialogTitle>
          <DialogDescription>
            Establece una nueva contraseña para <strong>{user.email}</strong>. El usuario tendrá que iniciar sesión con esta nueva contraseña.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <Input
              id="newPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Resetear"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
