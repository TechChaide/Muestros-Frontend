"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { MaquinasMantenimiento } from "@/types/interfaces";
import { serviciosMuestreosService } from "@/services/seguridades/serviciosMuestreos.service";
import MachineForm from "./components/machine-form";
import MachineExcelUpload from "./components/machine-excel-upload";
import MachinesTable from "./components/machines-table";

type ViewMode = "list" | "form" | "excel";

function extractList<T>(res: unknown): T[] {
  const respAny = res as Record<string, unknown>;
  const nested = (respAny?.data as Record<string, unknown> | undefined)?.data;
  const candidates = nested ?? respAny?.data ?? [];
  return Array.isArray(candidates) ? (candidates as T[]) : [];
}

export default function MachineSetPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<ViewMode>("list");
  const [records, setRecords] = useState<MaquinasMantenimiento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await serviciosMuestreosService.getMaquinasMantenimiento();
      setRecords(extractList<MaquinasMantenimiento>(res));
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo cargar las máquinas.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleSaved = () => {
    setMode("list");
    void fetchRecords();
  };

  const existingActividades = useMemo(
    () => records.map((r) => r.actividad).filter(Boolean),
    [records],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Carga de máquinas</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Crea máquinas una a una o cárgalas masivamente con un Excel
            (columnas <strong>maquina</strong>, <strong>componente</strong>,{" "}
            <strong>actividad</strong> y <strong>REGIONAL</strong>).
          </p>
        </CardContent>
      </Card>

      {isLoading && mode === "list" && records.length === 0 ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : mode === "form" ? (
        <MachineForm
          existingActividades={existingActividades}
          existingRecords={records}
          onSuccess={handleSaved}
          onCancel={() => setMode("list")}
        />
      ) : mode === "excel" ? (
        <MachineExcelUpload
          existingRecords={records}
          onSuccess={handleSaved}
          onCancel={() => setMode("list")}
        />
      ) : (
        <MachinesTable
          records={records}
          isLoading={isLoading}
          onAddNew={() => setMode("form")}
          onBulkUpload={() => setMode("excel")}
        />
      )}
    </div>
  );
}
