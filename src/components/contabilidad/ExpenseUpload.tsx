"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { DPImportResult } from "@/types";

interface ExpenseRow {
  [key: string]: unknown;
}

interface ExpenseUploadProps {
  onSuccess?: (data: ExpenseRow[]) => void;
  onCancel?: () => void;
}

// Helper para formatear valores según el tipo
function formatCellValue(value: unknown): { display: string; full: string } {
  if (!value) return { display: "—", full: "" };

  const str = String(value);

  // Detectar y formatear fechas
  if (/\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    try {
      const date = /^\d{4}-\d{2}-\d{2}/.test(str) ? parseISO(str) : new Date(str);
      if (!isNaN(date.getTime())) {
        const formatted = format(date, "dd/MM/yyyy", { locale: es });
        return { display: formatted, full: formatted };
      }
    } catch {}
  }

  // Detectar y formatear números
  if (/^\d+(\.\d+)?$|^\d+,\d+$/.test(str.trim())) {
    try {
      const num = parseFloat(str.replace(",", "."));
      if (!isNaN(num)) {
        const formatted = new Intl.NumberFormat("es-CO", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(num);
        return { display: formatted, full: formatted };
      }
    } catch {}
  }

  return { display: str.length > 30 ? str.slice(0, 30) + "..." : str, full: str };
}

export function ExpenseUpload({ onSuccess, onCancel }: ExpenseUploadProps) {
  const [importState, setImportState] = useState<"idle" | "uploading" | "preview" | "error">("idle");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: ExpenseRow[]; totalRows: number } | null>(
    null
  );
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "Archivo inválido",
        description: "Solo se aceptan archivos Excel (.xlsx, .xls)",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    setImportState("idle");
    setPreviewData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setImportState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/contabilidad/expenses/scrape", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!json.success) {
        setImportState("error");
        toast({
          title: "Error al procesar",
          description: json.error,
          variant: "destructive",
        });
        return;
      }

      setPreviewData(json.data);
      setImportState("preview");
    } catch {
      setImportState("error");
      toast({
        title: "Error",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    }
  };

  if (importState === "preview" && previewData) {
    const isNoteType = (docType: unknown) => {
      const type = String(docType || "").toLowerCase();
      return type.includes("nota") || type.includes("credit");
    };

    const hasNotes = previewData.rows.some((row) =>
      previewData.headers.some((h) => h.toLowerCase().includes("tipo") && isNoteType(row[h]))
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Preview de datos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="text-muted-foreground mb-3">
              Se encontraron <span className="font-bold">{previewData.totalRows}</span> gastos para cargar
            </p>
            <div className="rounded-lg border border-border overflow-auto max-h-96 bg-background">
              <table className="text-xs w-full border-collapse">
                <thead className="bg-muted/50 sticky top-0 border-b">
                  <tr>
                    {previewData.headers.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-semibold whitespace-nowrap text-xs border-r last:border-r-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.slice(0, 5).map((row, rowIdx) => {
                    const isCredit = previewData.headers.some(
                      (h) => h.toLowerCase().includes("tipo") && isNoteType(row[h])
                    );

                    return (
                      <tr
                        key={rowIdx}
                        className={`border-b last:border-b-0 ${
                          isCredit
                            ? "bg-yellow-50/80 hover:bg-yellow-100/50"
                            : "hover:bg-muted/50"
                        } transition-colors`}
                      >
                        {previewData.headers.map((h) => {
                          const cellKey = `${rowIdx}-${h}`;
                          const { display, full } = formatCellValue(row[h]);
                          const isHovered = hoveredCell === cellKey && full !== display;

                          return (
                            <td
                              key={h}
                              className="px-3 py-2 text-muted-foreground border-r last:border-r-0 whitespace-nowrap"
                              onMouseEnter={() => full !== display && setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                              title={full}
                            >
                              <span className="inline-block max-w-[150px] overflow-hidden text-ellipsis">
                                {display}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasNotes && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 mt-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Se detectaron <strong>notas de crédito</strong> (fondo amarillo). Revisa que estén correctas antes de importar.</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                onSuccess?.(previewData.rows);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Guardar gastos ({previewData.totalRows})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImportState("idle");
                setPreviewData(null);
              }}
            >
              Cambiar archivo
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} size="icon">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-500" />
          Cargar Excel de Gastos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {selectedFile ? (
            <div className="rounded-lg border-2 border-border p-4 bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-1">Archivo seleccionado:</p>
              <p className="text-sm text-muted-foreground font-mono">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Arrastra un archivo aquí</p>
              <p className="text-xs text-muted-foreground">o haz clic para seleccionar (.xlsx, .xls)</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          <div className="flex gap-3">
            {selectedFile && (
              <>
                <Button
                  className="flex-1"
                  onClick={handleUpload}
                  disabled={importState === "uploading"}
                >
                  {importState === "uploading" ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Previsualizar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setImportState("idle");
                  }}
                >
                  Limpiar
                </Button>
              </>
            )}
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} size="icon" className="ml-auto">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
