"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingPage } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plug,
  Unplug,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { ExpenseUpload } from "@/components/contabilidad/ExpenseUpload";

type SyncStatus = "pending" | "syncing" | "synced" | "failed";
type SubClienteArea = "Amanco" | "Kimberly Clark" | "Otros";

const YOBEL_CEDULA = "3101354880";

interface FENInvoiceWithSync {
  _id: string;
  fenId: string;
  consecutivo: string;
  identification: string;
  clienteName: string;
  fecha: string;
  plazo: number;
  moneda: string;
  medioPago: string;
  monto: number;
  saldo: number;
  estadoHacienda: string;
  correoEnviado: boolean;
  anulado: boolean;
  observaciones?: string;
  ordenCompraPrefix?: "ME" | "KC" | "WHL" | null;
  ordenCompraNumero?: string;
  subClienteArea?: SubClienteArea | null;
  scrapedAt: string;
  sync: {
    status: SyncStatus;
    qboInvoiceId?: string;
    qboInvoiceNumber?: string;
    syncedAt?: string;
    error?: string;
    attempts: number;
  };
}

interface QBOStatus {
  connected: boolean;
  realmId?: string;
  environment?: "sandbox" | "production";
  connectedAt?: string;
  refreshExpired?: boolean;
}

const STATUS_META: Record<
  SyncStatus,
  { label: string; dot: string; text: string; icon: typeof Clock }
> = {
  pending: { label: "Pendiente", dot: "bg-yellow-400", text: "text-yellow-400", icon: Clock },
  syncing: { label: "Sincronizando", dot: "bg-blue-400", text: "text-blue-400", icon: RefreshCw },
  synced:  { label: "Enviado a QBO", dot: "bg-emerald-400", text: "text-emerald-400", icon: CheckCircle2 },
  failed:  { label: "Falló", dot: "bg-red-400", text: "text-red-400", icon: XCircle },
};

function formatCurrency(amount: number, moneda: string): string {
  const code = moneda === "CRC" ? "CRC" : moneda === "USD" ? "USD" : moneda;
  try {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${moneda} ${amount.toLocaleString("es-CR")}`;
  }
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ContabilidadInner() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<FENInvoiceWithSync[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [qboStatus, setQboStatus] = useState<QBOStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [monthsBack, setMonthsBack] = useState<string>("1");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [view, setView] = useState<"invoices" | "expenses">("invoices");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showExpenseUpload, setShowExpenseUpload] = useState(false);

  // Detectar callback redirect (?qbo=connected|state-mismatch|...)
  useEffect(() => {
    const qboParam = searchParams.get("qbo");
    if (!qboParam) return;

    if (qboParam === "connected") {
      toast({ title: "QBO conectado", description: "Conexión exitosa con QuickBooks Online" });
    } else if (qboParam === "state-mismatch") {
      toast({ title: "Error CSRF", description: "State mismatch en OAuth", variant: "destructive" });
    } else if (qboParam.startsWith("exchange-failed")) {
      toast({ title: "Error OAuth", description: decodeURIComponent(qboParam), variant: "destructive" });
    } else {
      toast({ title: "QBO callback", description: qboParam, variant: "destructive" });
    }

    // Limpiar query param
    window.history.replaceState({}, "", "/contabilidad");
  }, [searchParams, toast]);

  const fetchQboStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/contabilidad/qbo/status");
      const json = await res.json();
      if (json.success) setQboStatus(json.data);
    } catch {
      setQboStatus({ connected: false });
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (areaFilter !== "all") params.set("area", areaFilter);
      const res = await fetch(`/api/contabilidad/invoices?${params}`);
      const json = await res.json();
      if (json.success) setInvoices(json.data);
      else toast({ title: "Error", description: json.error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, areaFilter, toast]);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/contabilidad/expenses`);
      const json = await res.json();
      if (json.success) setExpenses(json.data);
      else toast({ title: "Error", description: json.error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchQboStatus();
    if (view === "invoices") fetchInvoices();
    else fetchExpenses();
  }, [fetchInvoices, fetchQboStatus, fetchExpenses, view]);

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const res = await fetch(`/api/contabilidad/scrape?monthsBack=${monthsBack}`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Scrape completo",
          description: `${json.data.scraped} facturas · ${json.data.created} nuevas · ${json.data.updated} actualizadas`,
        });
        fetchInvoices();
      } else {
        toast({
          title: "Error al scrapear",
          description: json.error,
          variant: "destructive",
        });
        if (json.debug) console.error("FEN scrape debug:", json.debug);
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrapeExpenses = () => {
    setShowExpenseUpload(true);
  };

  const handleExpenseUploadSuccess = async (rows: any[]) => {
    try {
      const res = await fetch("/api/contabilidad/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mapping: {} }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Error al importar gastos");
      }

      toast({
        title: "Gastos importados",
        description: `${json.data.created} nuevos · ${json.data.updated} actualizados`,
      });

      setShowExpenseUpload(false);
      fetchExpenses();
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error desconocido",
        variant: "destructive",
      });
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/contabilidad/qbo/connect";
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar QBO? Tendrás que reautorizar para volver a sincronizar.")) return;

    try {
      const res = await fetch("/api/contabilidad/qbo/disconnect", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast({ title: "QBO desconectado" });
        fetchQboStatus();
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

  // Seleccionables: pendientes + falladas (retry), no anuladas
  const selectableInvoices = useMemo(() => {
    const rows = view === "invoices" ? invoices : expenses;
    return rows.filter((i: any) => (i.sync?.status === "pending" || i.sync?.status === "failed") && !i.anulado);
  }, [invoices, expenses, view]);

  const toggleAll = () => {
    if (selected.size === selectableInvoices.length && selected.size > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableInvoices.map((i) => i._id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSync = async () => {
    if (selected.size === 0) {
      toast({ title: "Sin selección", description: "Selecciona facturas pendientes" });
      return;
    }
    if (!qboStatus?.connected) {
      toast({
        title: "QBO no conectado",
        description: "Conecta QuickBooks Online primero",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`¿Enviar ${selected.size} factura(s) a QuickBooks Online?`)) return;

    setIsSyncing(true);
    try {
      const endpoint = view === "invoices" ? "/api/contabilidad/sync" : "/api/contabilidad/expenses/sync";
      const body = view === "invoices" ? { invoiceIds: Array.from(selected) } : { expenseIds: Array.from(selected) };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Sync completo",
          description: `${json.data.synced} sincronizadas · ${json.data.failed} fallidas`,
          variant: json.data.failed > 0 ? "destructive" : "default",
        });
        setSelected(new Set());
        if (view === "invoices") fetchInvoices(); else fetchExpenses();
      } else {
        toast({
          title: "Error",
          description: json.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const stats = useMemo(() => {
    const rows = view === "invoices" ? invoices : expenses;
    const pending = rows.filter((i: any) => i.sync?.status === "pending" && !i.anulado).length;
    const synced = rows.filter((i: any) => i.sync?.status === "synced").length;
    const failed = rows.filter((i: any) => i.sync?.status === "failed").length;
    const anuladas = rows.filter((i: any) => i.anulado).length;
    return { pending, synced, failed, anuladas };
  }, [invoices, expenses, view]);

  if (isLoading) return <LoadingPage />;

  const rows = view === "invoices" ? invoices : expenses;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading font-700 text-[22px] tracking-tight text-foreground leading-none">
            Contabilidad
          </h1>
          <div className="mt-2">
            <button className={`px-3 py-1 rounded-md mr-2 ${view === 'invoices' ? 'bg-primary text-white' : 'bg-muted/10'}`} onClick={() => setView('invoices')}>Facturas de clientes</button>
            <button className={`px-3 py-1 rounded-md ${view === 'expenses' ? 'bg-primary text-white' : 'bg-muted/10'}`} onClick={() => setView('expenses')}>Gastos de la empresa</button>
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <StatPill label="pendientes" count={stats.pending} color="bg-yellow-400" />
            <StatPill label="enviadas" count={stats.synced} color="bg-emerald-400" />
            {stats.failed > 0 && (
              <StatPill label="fallidas" count={stats.failed} color="bg-red-400" />
            )}
            {stats.anuladas > 0 && (
              <StatPill label="anuladas" count={stats.anuladas} color="bg-muted" />
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <Select value={monthsBack} onValueChange={setMonthsBack}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 mes</SelectItem>
              <SelectItem value="2">2 meses</SelectItem>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
            </SelectContent>
          </Select>
          {view === "invoices" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrape}
              disabled={isScraping}
              className="h-8 text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isScraping ? "animate-spin" : ""}`} />
              {isScraping ? "Scrapeando..." : "Scrape FEN"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrapeExpenses}
              className="h-8 text-xs"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Cargar gastos
            </Button>
          )}
          {qboStatus?.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="h-8 text-xs"
            >
              <Unplug className="mr-1.5 h-3.5 w-3.5" />
              Desconectar QBO
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnect}
              className="h-8 text-xs"
            >
              <Plug className="mr-1.5 h-3.5 w-3.5" />
              Conectar QBO
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSync}
            disabled={selected.size === 0 || isSyncing || !qboStatus?.connected}
            className="h-8 text-xs"
          >
            <Send className={`mr-1.5 h-3.5 w-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
            {isSyncing ? "Enviando..." : `Enviar a QBO (${selected.size})`}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-2 flex-wrap p-3 rounded-lg"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Estado sync" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="synced">Enviadas</SelectItem>
            <SelectItem value="failed">Falladas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Área Yobel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            <SelectItem value="Amanco">Amanco</SelectItem>
            <SelectItem value="Kimberly Clark">Kimberly Clark</SelectItem>
            <SelectItem value="Otros">Otros (WHL)</SelectItem>
            <SelectItem value="directo">Yobel directo</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-[11px] text-muted-foreground ml-auto">
          {rows.length} registros en caché
        </div>
      </div>

      {/* Table */}
      {showExpenseUpload && view === "expenses" ? (
        <ExpenseUpload
          onSuccess={handleExpenseUploadSuccess}
          onCancel={() => setShowExpenseUpload(false)}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={view === 'invoices' ? "Sin facturas" : "Sin gastos"}
          description={view === 'invoices' ? 'Presiona "Scrape FEN" para traer facturas de facturaenlanube.com' : 'Carga un Excel con los gastos (Recepciones)'}
          action={
            view === 'invoices' ? (
              <Button onClick={handleScrape} disabled={isScraping} size="sm">
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isScraping ? "animate-spin" : ""}`} />
                {isScraping ? "Scrapeando..." : "Scrape FEN"}
              </Button>
            ) : (
              <Button onClick={handleScrapeExpenses} size="sm">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Cargar Excel
              </Button>
            )
          }
        />
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="grid grid-cols-[40px_85px_95px_1fr_115px_125px_115px_125px_105px] border-b border-border">
            <div className="px-3 py-2.5 flex items-center">
              <input
                type="checkbox"
                checked={
                  selectableInvoices.length > 0 &&
                  selected.size === selectableInvoices.length
                }
                onChange={toggleAll}
                disabled={selectableInvoices.length === 0}
                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
              />
            </div>
            {["CONSEC.", "FECHA", "CLIENTE", "ÁREA", "CÉDULA", "MONTO", "ESTADO", "HACIENDA"].map((h) => (
              <div
                key={h}
                className="px-3 py-2.5 text-[10px] font-heading font-600 uppercase tracking-widest text-muted-foreground"
              >
                {h}
              </div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {rows.map((inv: any, i: number) => {
              const status = inv.sync?.status as SyncStatus;
              const meta = STATUS_META[status];
              const isSelectable =
                (status === "pending" || status === "failed") &&
                !inv.anulado;
              const isSelected = selected.has(inv._id);

              return (
                <div
                  key={inv._id}
                  className={`grid grid-cols-[40px_85px_95px_1fr_115px_125px_115px_125px_105px] items-center hover:bg-accent/50 transition-colors ${
                    inv.anulado ? "opacity-40" : ""
                  } ${i % 2 === 0 ? "" : "bg-black/[0.06]"}`}
                >
                  <div className="px-3 py-3 flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(inv._id)}
                      disabled={!isSelectable}
                      className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                    />
                  </div>

                  <div className="px-3 py-3">
                    <span className="font-mono text-[13px] font-medium text-foreground">
                      {inv.consecutivo}
                    </span>
                  </div>

                  <div className="px-3 py-3">
                    <span className="text-[12px] text-muted-foreground">
                      {formatDate(inv.fecha || inv.documentDate)}
                    </span>
                  </div>

                  <div className="px-3 py-3 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {inv.clienteName || inv.providerName}
                    </p>
                    {inv.anulado && (
                      <p className="text-[10px] text-red-400 font-medium mt-0.5">ANULADA</p>
                    )}
                  </div>

                  <div className="px-3 py-3">
                    <AreaBadge inv={inv} />
                  </div>

                  <div className="px-3 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {inv.identification || inv.providerIdentification}
                    </span>
                  </div>

                  <div className="px-3 py-3">
                    <div className="text-[13px] font-medium text-foreground tabular-nums">
                      {formatCurrency(inv.monto || inv.total, inv.moneda || inv.currency)}
                    </div>
                    {inv.saldo > 0 && inv.saldo !== (inv.monto || inv.total) && (
                      <div className="text-[10px] text-yellow-400 tabular-nums mt-0.5">
                        Saldo: {formatCurrency(inv.saldo, inv.moneda || inv.currency)}
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`status-dot ${meta.dot}`} />
                      <span className={`text-[12px] font-medium ${meta.text}`}>
                        {meta.label}
                      </span>
                    </div>
                    {inv.sync.qboInvoiceNumber && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        QBO #{inv.sync.qboInvoiceNumber}
                      </div>
                    )}
                    {inv.sync.error && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3 text-red-400" />
                        <span
                          className="text-[10px] text-red-400 truncate max-w-[110px]"
                          title={inv.sync.error}
                        >
                          {inv.sync.error}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="px-3 py-3">
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {inv.estadoHacienda || "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {rows.length} registros · {selected.size} seleccionadas
            </p>
            <p className="text-[11px] text-muted-foreground">
              QBO:{" "}
              {qboStatus?.connected ? (
                <span className="text-emerald-400">
                  conectado ({qboStatus.environment})
                </span>
              ) : qboStatus?.refreshExpired ? (
                <span className="text-red-400">expirado — reconecta</span>
              ) : (
                <span className="text-yellow-400">no conectado</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContabilidadPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <ContabilidadInner />
    </Suspense>
  );
}

function AreaBadge({ inv }: { inv: any }) {
  const area = inv.subClienteArea;
  const identification = inv.identification || inv.providerIdentification;
  const isYobel = identification === YOBEL_CEDULA;

  if (area) {
    const areaKey = area as SubClienteArea;
    const styles: Record<SubClienteArea, string> = {
      Amanco: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      "Kimberly Clark": "bg-purple-500/15 text-purple-300 border-purple-500/30",
      Otros: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    };
    const label = areaKey === "Kimberly Clark" ? "KC" : areaKey;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-medium ${styles[areaKey]}`}
        title={inv.ordenCompraNumero ? `OC ${areaKey} ${inv.ordenCompraNumero}` : areaKey}
      >
        {label}
      </span>
    );
  }

  if (isYobel) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-md border bg-muted/30 text-muted-foreground border-border text-[10px] font-medium"
        title="Yobel sin sub-cliente (sin OC reconocida)"
      >
        Directo
      </span>
    );
  }

  return <span className="text-[11px] text-muted-foreground">—</span>;
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`status-dot ${color}`} />
      <span className="text-[13px] text-muted-foreground">
        <span className="font-heading font-600 text-foreground tabular-nums">{count}</span>{" "}
        {label}
      </span>
    </div>
  );
}
