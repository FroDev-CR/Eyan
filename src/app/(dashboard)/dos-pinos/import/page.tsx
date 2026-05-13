"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/useToast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { DPImportResult } from "@/types";

type ImportState = "idle" | "uploading" | "done" | "error";

export default function DosPinosImportPage() {
  const [importState, setImportState] = useState<ImportState>("idle");
  const [result, setResult] = useState<DPImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

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
    setResult(null);
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

  const handleImport = async () => {
    if (!selectedFile) return;

    setImportState("uploading");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/dos-pinos/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!json.success) {
        setImportState("error");
        toast({
          title: "Error al importar",
          description: json.error,
          variant: "destructive",
        });
        return;
      }

      setResult(json.data);
      setImportState("done");
    } catch {
      setImportState("error");
      toast({
        title: "Error",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Importar Reporte Dos Pinos"
        description="Carga el Excel exportado de Salesforce para importar casos pendientes"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dos-pinos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver casos
            </Link>
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Drop zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archivo Excel</CardTitle>
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
                  <p className="font-medium text-sm">
                    Arrastra el archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls)</p>
                </div>
              )}
            </div>

            {selectedFile && importState !== "done" && (
              <Button
                className="w-full mt-4"
                onClick={handleImport}
                disabled={importState === "uploading"}
              >
                {importState === "uploading" ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar casos
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Result */}
        {result && importState === "done" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Importación completada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-500/10 p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-xs text-muted-foreground mt-1">Casos nuevos</p>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{result.duplicates}</p>
                  <p className="text-xs text-muted-foreground mt-1">Duplicados</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{result.errors}</p>
                  <p className="text-xs text-muted-foreground mt-1">Errores</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lote</span>
                  <span className="font-medium">{result.batch}</span>
                </div>
                {result.week && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Semana</span>
                    <span className="font-medium">
                      {result.week} / {result.year}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => router.push("/dos-pinos")}>
                  Ver casos importados
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setResult(null);
                    setImportState("idle");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Importar otro
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {importState === "error" && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">Error al procesar el archivo. Verifica el formato e intenta de nuevo.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
