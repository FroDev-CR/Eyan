"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SettingsCoordinatorsTab } from "@/components/settings/SettingsCoordinatorsTab";
import { SettingsProductionTab } from "@/components/settings/SettingsProductionTab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import {
  Loader2,
  Plug,
  Unplug,
  RefreshCw,
  Receipt,
  Tags,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Users,
  Rocket,
} from "lucide-react";
import { EXPENSE_CATEGORY_RULES } from "@/lib/contabilidad/expense-category-rules";

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  environment?: "sandbox" | "production";
  connectedAt?: string;
  lastRefreshedAt?: string;
  refreshExpired?: boolean;
}

const SETTINGS_TABS = ["qbo", "coordinadores", "produccion"] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

function SettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTab = SETTINGS_TABS.includes(tabParam as SettingsTab)
    ? (tabParam as SettingsTab)
    : "qbo";

  const setTab = (tab: SettingsTab) => {
    router.replace(`/settings?tab=${tab}`);
  };
  const [qboStatus, setQboStatus] = useState<QBOStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncingCategories, setSyncingCategories] = useState(false);
  const [syncingInvoices, setSyncingInvoices] = useState(false);
  const [monthsBack, setMonthsBack] = useState("1");
  const [lastCategorySync, setLastCategorySync] = useState<{
    accountsCount: number;
    autoCategorized: number;
  } | null>(null);

  const fetchQboStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/contabilidad/qbo/status");
      const json = await res.json();
      if (json.success) setQboStatus(json.data);
    } catch {
      setQboStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchQboStatus();
  }, [fetchQboStatus]);

  useEffect(() => {
    const qboParam = searchParams.get("qbo");
    if (!qboParam) return;

    if (qboParam === "connected") {
      toast({ title: "QBO conectado", description: "Conexión exitosa con QuickBooks Online" });
      fetchQboStatus();
    } else if (qboParam === "state-mismatch") {
      toast({ title: "Error CSRF", description: "State mismatch en OAuth", variant: "destructive" });
    } else if (qboParam.startsWith("exchange-failed")) {
      toast({ title: "Error OAuth", description: decodeURIComponent(qboParam), variant: "destructive" });
    } else if (qboParam !== "auth-required") {
      toast({ title: "QBO", description: qboParam, variant: "destructive" });
    }

    window.history.replaceState({}, "", "/settings");
  }, [searchParams, toast, fetchQboStatus]);

  const handleConnect = () => {
    window.location.href = "/api/contabilidad/qbo/connect";
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar QuickBooks Online? Tendrás que volver a autorizar desde aquí.")) return;
    try {
      const res = await fetch("/api/contabilidad/qbo/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast({ title: "QBO desconectado" });
        setQboStatus({ connected: false });
        setLastCategorySync(null);
      } else {
        toast({ title: "Error", description: json.error, variant: "destructive" });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    }
  };

  const handleSyncCategories = async () => {
    setSyncingCategories(true);
    try {
      const res = await fetch("/api/contabilidad/qbo/sync-categories", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al sincronizar");

      setLastCategorySync({
        accountsCount: json.data.accountsCount,
        autoCategorized: json.data.autoCategorized,
      });
      toast({
        title: "Categorías actualizadas",
        description: `${json.data.accountsCount} cuentas en QBO · ${json.data.autoCategorized} gastos auto-categorizados`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSyncingCategories(false);
    }
  };

  const handleSyncInvoices = async () => {
    setSyncingInvoices(true);
    try {
      const res = await fetch("/api/contabilidad/qbo/sync-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthsBack: parseInt(monthsBack, 10) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Error al sincronizar facturas");

      toast({
        title: "Facturas actualizadas desde FEN",
        description: `${json.data.scraped} procesadas · ${json.data.created} nuevas · ${json.data.updated} actualizadas`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setSyncingInvoices(false);
    }
  };

  const connected = qboStatus?.connected && !qboStatus?.refreshExpired;

  return (
    <div>
      <PageHeader
        title="Configuración"
        description="QuickBooks, coordinadores Dos Pinos y preparación para producción"
      />

      <Tabs value={activeTab} onValueChange={(v) => setTab(v as SettingsTab)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="qbo">QuickBooks</TabsTrigger>
          <TabsTrigger value="coordinadores" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Coordinadores
          </TabsTrigger>
          <TabsTrigger value="produccion" className="gap-1.5">
            <Rocket className="h-3.5 w-3.5" />
            Producción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coordinadores">
          <SettingsCoordinatorsTab />
        </TabsContent>

        <TabsContent value="produccion">
          <SettingsProductionTab />
        </TabsContent>

        <TabsContent value="qbo">
      <div className="grid gap-6 max-w-2xl">
        {/* QuickBooks Online */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              QuickBooks Online
            </CardTitle>
            <CardDescription>
              Conexión OAuth con tu empresa en QBO. La gestión de la conexión se hace solo desde aquí.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStatus ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando conexión…
              </div>
            ) : connected ? (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-emerald-400">Conectado</p>
                  <p className="text-muted-foreground">
                    Entorno: <span className="font-mono">{qboStatus?.environment}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Empresa (realm): <span className="font-mono">{qboStatus?.realmId}</span>
                  </p>
                  {qboStatus?.connectedAt && (
                    <p className="text-muted-foreground text-xs">
                      Conectado: {new Date(qboStatus.connectedAt).toLocaleString("es-CR")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <XCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-400">
                    {qboStatus?.refreshExpired ? "Sesión expirada" : "No conectado"}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Conecta QBO para enviar gastos y facturas desde Contabilidad.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {connected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unplug className="mr-2 h-4 w-4" />
                  Desconectar
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnect}>
                  <Plug className="mr-2 h-4 w-4" />
                  Conectar QuickBooks
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={fetchQboStatus} disabled={loadingStatus}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatus ? "animate-spin" : ""}`} />
                Actualizar estado
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              El redirect OAuth debe apuntar a{" "}
              <code className="text-[11px]">/api/contabilidad/qbo/callback</code> en tu app de Intuit
              Developer.
            </p>
          </CardContent>
        </Card>

        {/* Sincronización */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sincronización
            </CardTitle>
            <CardDescription>
              Trae datos nuevos de QBO y FEN para que aparezcan en Contabilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Tags className="h-4 w-4 text-primary" />
                <p className="font-medium text-sm">Categorías de gasto (QBO)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Descarga las cuentas de gasto del plan contable y reaplica las reglas automáticas a
                gastos pendientes.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncCategories}
                disabled={!connected || syncingCategories}
              >
                {syncingCategories ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Tags className="mr-2 h-4 w-4" />
                )}
                Sincronizar categorías
              </Button>
              {lastCategorySync && (
                <p className="text-xs text-muted-foreground">
                  Última sync: {lastCategorySync.accountsCount} cuentas ·{" "}
                  {lastCategorySync.autoCategorized} auto-categorizados
                </p>
              )}
            </div>

            <div className="space-y-3 p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <p className="font-medium text-sm">Facturas de clientes (FEN)</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Actualiza el listado desde facturaenlanube.com (nuevas facturas y cambios).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={monthsBack} onValueChange={setMonthsBack}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mes</SelectItem>
                    <SelectItem value="2">2 meses</SelectItem>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncInvoices}
                  disabled={syncingInvoices}
                >
                  {syncingInvoices ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Receipt className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar facturas
                </Button>
              </div>
            </div>

            <Link
              href="/contabilidad"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ir a Contabilidad
              <ExternalLink className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Reglas automáticas */}
        <Card>
          <CardHeader>
            <CardTitle>Reglas de categoría automática</CardTitle>
            <CardDescription>
              Si el proveedor coincide, se asigna la cuenta QBO. Si no, eliges manualmente en
              Contabilidad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {EXPENSE_CATEGORY_RULES.map((rule) => (
                <li key={rule.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="font-medium">{rule.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Palabras: {rule.keywords.slice(0, 6).join(", ")}
                    {rule.keywords.length > 6 ? "…" : ""}
                  </p>
                </li>
              ))}
              <li className="p-3 rounded-lg bg-muted/20 border border-dashed border-border text-muted-foreground text-xs">
                Todo lo demás → selección manual en la columna «Categoría QBO»
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SettingsInner />
    </Suspense>
  );
}
