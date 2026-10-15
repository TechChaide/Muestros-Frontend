"use client";

import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { tareasMaquinasService } from "@/services/seguridades/tareasMaquinas.service";
import {
  downloadMachinesTemplate,
  applyExistingMaquinas,
  parseMachinesFile,
  toSavePayload,
  type MachineExcelRow,
  type MachineIdentity,
  type ParseMachinesResult,
} from "./parse-machines-excel";

interface MachineExcelUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
  existingRecords?: MachineIdentity[];
}

export default function MachineExcelUpload({
  onSuccess,
  onCancel,
  existingRecords = [],
}: MachineExcelUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParseMachinesResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    try {
      const result = applyExistingMaquinas(
        await parseMachinesFile(file),
        existingRecords,
      );
      setParsed(result);
      if (result.headerError) {
        toast({
          title: "Formato inválido",
          description: result.headerError,
          variant: "destructive",
        });
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo leer el archivo.";
      toast({ title: "Error al leer Excel", description: msg, variant: "destructive" });
      setParsed(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadMachinesTemplate();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo generar la plantilla.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    const valid = parsed?.valid ?? [];
    if (valid.length === 0) return;
    setIsSaving(true);
    setProgress({ current: 0, total: valid.length });
    let ok = 0;
    const failed: { row: MachineExcelRow; message: string }[] = [];
    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        await tareasMaquinasService.save(toSavePayload(row));
        ok += 1;
      } catch (error) {
        failed.push({
          row,
          message:
            error instanceof Error ? error.message : "Error al guardar",
        });
      }
      setProgress({ current: i + 1, total: valid.length });
    }
    setIsSaving(false);

    if (failed.length === 0) {
      toast({
        title: "Carga completada",
        description: `Se guardaron ${ok} máquina(s).`,
      });
      onSuccess();
      return;
    }

    toast({
      title: "Carga parcial",
      description: `Guardadas: ${ok}. Con error: ${failed.length}.`,
      variant: "destructive",
    });
    setParsed((prev) => {
      if (!prev) return prev;
      const failedRows = failed.map((f) => ({
        ...f.row,
        errors: [...f.row.errors, f.message],
      }));
      return {
        ...prev,
        valid: prev.valid.filter(
          (r) => !failed.some((f) => f.row.rowNumber === r.rowNumber),
        ),
        invalid: [...prev.invalid, ...failedRows],
      };
    });
  };

  const previewRows = parsed?.rows.slice(0, 80) ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Carga masiva de máquinas</CardTitle>
            <CardDescription>
              Excel con columnas <strong>maquina</strong>,{" "}
              <strong>componente</strong>, <strong>actividad</strong> y{" "}
              <strong>REGIONAL</strong>. Se guarda una máquina por fila.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Descargar plantilla
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  {fileName || "Ningún archivo seleccionado"}
                </p>
                <p className="text-muted-foreground">
                  Formatos: .xlsx, .xls o .csv
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handlePick}
              disabled={isParsing || isSaving}
            >
              {isParsing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isParsing ? "Leyendo..." : "Seleccionar Excel"}
            </Button>
          </div>

          {parsed && !parsed.headerError && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {parsed.rows.length} fila(s) leídas
                </Badge>
                <Badge className="bg-green-600 hover:bg-green-700">
                  {parsed.valid.length} válidas
                </Badge>
                {parsed.invalid.length > 0 && (
                  <Badge variant="destructive">
                    {parsed.invalid.length} con error
                  </Badge>
                )}
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fila</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>Actividad</TableHead>
                      <TableHead>Regional</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row) => {
                      const ok = row.errors.length === 0;
                      return (
                        <TableRow key={row.rowNumber}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell className="font-medium">
                            {row.maquina || "—"}
                          </TableCell>
                          <TableCell>{row.componente || "—"}</TableCell>
                          <TableCell>{row.actividad || "—"}</TableCell>
                          <TableCell>{row.regional || "—"}</TableCell>
                          <TableCell>
                            {ok ? (
                              <Badge className="bg-green-600">Lista</Badge>
                            ) : (
                              <span className="text-xs text-red-600">
                                {row.errors.join(". ")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {parsed.rows.length > previewRows.length && (
                <p className="text-xs text-muted-foreground">
                  Mostrando las primeras {previewRows.length} de{" "}
                  {parsed.rows.length} filas.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || !parsed || parsed.valid.length === 0}
            >
              {isSaving
                ? "Guardando..."
                : `Guardar ${parsed?.valid.length ?? 0} máquina(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isSaving}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/40 backdrop-blur-md"
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Guardando máquinas
            </DialogTitle>
            <DialogDescription>
              Enviando {progress.current} de {progress.total} registros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Progress
              value={
                progress.total > 0
                  ? Math.round((progress.current / progress.total) * 100)
                  : 0
              }
              className="h-2.5"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.current} / {progress.total}
              </span>
              <span className="font-mono tabular-nums">
                {progress.total > 0
                  ? Math.round((progress.current / progress.total) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
