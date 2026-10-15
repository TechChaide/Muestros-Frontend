"use client";

/**
 * Paso 2: tipo de motivo (ATM) del área.
 * Carga areaTipoMotivo + tipoMotivo; si vacío, usa la tabla virtual.
 */
import { useEffect, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import SelectCardGrid, {
  type SelectableCard,
} from "./select-card-grid";
import type { Area, MuestreoTablaVirtual } from "@/types/interfaces";
import { esMotivoDevoluciones, getMotivosParaArea } from "./select-grid";
import {
  loadMotivosByArea,
  type MotivoDeArea,
} from "@/lib/flujo-seleccion";

interface Step2SelectMotivoMuestreoProps {
  selectedArea: Area | null;
  selectedMotivoId: number | null;
  onSelect: (motivoId: number, nombreMotivo: string) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
}

export default function Step2SelectMotivoMuestreo({
  selectedArea,
  selectedMotivoId,
  onSelect,
  onAfterSelect,
  tablaVirtual,
}: Step2SelectMotivoMuestreoProps) {
  const [motivos, setMotivos] = useState<MotivoDeArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!selectedArea) {
      setMotivos([]);
      return;
    }
    setIsLoading(true);
    loadMotivosByArea(selectedArea.codigo_area, esMotivoDevoluciones)
      .then((lista) => {
        if (cancelled) return;
        if (lista.length > 0) {
          setMotivos(lista);
          return;
        }
        setMotivos(
          getMotivosParaArea(tablaVirtual, selectedArea.codigo_area).map(
            (m) => ({
              ...m,
              codigo_tipo_motivo: 0,
            }),
          ),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setMotivos(
          getMotivosParaArea(tablaVirtual, selectedArea.codigo_area).map(
            (m) => ({
              ...m,
              codigo_tipo_motivo: 0,
            }),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedArea, tablaVirtual]);

  const cards: SelectableCard[] = useMemo(
    () =>
      motivos.map((m) => ({
        id: m.codigo_area_tipo_motivo,
        title: m.nombre_tipo_motivo,
        subtitle: `ATM #${m.codigo_area_tipo_motivo}`,
      })),
    [motivos],
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 2 de 7</span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Selecciona el tipo de motivo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Solo se muestran motivos cuyo nombre contiene{" "}
          <strong>DEVOLUCIONES</strong>.
        </p>
      </div>

      {!selectedArea ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Selecciona primero un área en el paso anterior.
        </div>
      ) : (
        <SelectCardGrid
          items={cards}
          selectedId={selectedMotivoId}
          onSelect={(id) => {
            const m = motivos.find((x) => x.codigo_area_tipo_motivo === id);
            if (m) onSelect(m.codigo_area_tipo_motivo, m.nombre_tipo_motivo);
          }}
          onAfterSelect={onAfterSelect}
          icon={Tag}
          filterPlaceholder="Filtrar motivos..."
          emptyMessage="No hay motivos de devoluciones disponibles para esta área."
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
