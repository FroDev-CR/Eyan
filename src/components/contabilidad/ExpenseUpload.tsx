"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import type { DPImportResult } from "@/types";

interface ExpenseRow {
  [key: string]: unknown;
}

interface ExpenseUploadProps {
  onSuccess?: (data: ExpenseRow[]) => void;
  onCancel?: () => void;
}

export function ExpenseUpload({ onSuccess, onCancel }: ExpenseUploadProps) {
  const [importState, setImportState] = useState<"idle" | "uploading" | "preview" | "error">("idle");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: ExpenseRow[]; totalRows: number } | null>(
    null
  );
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
            <p className="text-muted-foreground mb-2">
              Se encontraron <span className="font-bold">{previewData.totalRows}</span> gastos para cargar
            </p>
            <div className="rounded-lg bg-muted p-3 max-h-60 overflow-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    {previewData.headers.slice(0, 5).map((h) => (
                      <th key={h} className="text-left p-1 font-semibold">
                        {h}
                      </th>
                    ))}
                    {previewData.headers.length > 5 && (
                      <th className="text-left p-1 font-semibold">...</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-background/50">
                      {previewData.headers.slice(0, 5).map((h) => (
                        <td key={h} className="p-1 text-muted-foreground">
                          {String(row[h] || "").slice(0, 20)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                onSuccess?.(previewData.rows);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Guardar gastos
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedFile(null);
                setPreviewData(null);
                setImportState("idle");
              }}
            >
              Cambiar archivo
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {onCancel && <X className="h-4 w-4 cursor-pointer" onClick={onCancel} />}
          Cargar gastos desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <FileSpreadsheet className="h-10 w-10 text-green-500" />
              <p className="font-medium text-sm">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB — Clic para cambiar
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-sm">Arrastra el archivo aquí o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls)</p>
            </div>
          )}
        </div>

        {selectedFile && importState !== "preview" && (
          <Button className="w-full mt-4" onClick={handleUpload} disabled={importState === "uploading"}>
            {importState === "uploading" ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Analizar archivo
              </>
            )}
          </Button>
        )}

        {importState === "error" && (
          <Card className="border-destructive/50 mt-4">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">Error al procesar el archivo. Verifica el formato e intenta de nuevo.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
