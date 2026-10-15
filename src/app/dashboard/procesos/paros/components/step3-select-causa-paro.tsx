"use client";

/**
 * Causa del origen_componente. Carga causaDefectoService; fallback tabla virtual.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import SelectCardGrid, { type SelectableCard } from "./select-card-grid";
import type { CausaDefecto, MuestreoTablaVirtual } from "@/types/interfaces";
import { loadCausasByOrigenComponente } from "@/lib/flujo-seleccion";
import { getCausasParaAreaMotivoOrigenComponente } from "./select-grid";

interface Step3SelectCausaParoProps {
  codigoArea: number | null;
  codigoAreaTipoMotivo: number | null;
  codigoOrigen: number | null;
  codigoComponente: number | null;
  selectedOrigenComponenteId?: number | null;
  selectedCausaId: number | null;
  onSelect: (causaId: number, nombreCausa: string) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
}

export default function Step3SelectCausaParo({
  codigoArea,
  codigoAreaTipoMotivo,
  codigoOrigen,
  codigoComponente,
  selectedOrigenComponenteId,
  selectedCausaId,
  onSelect,
  onAfterSelect,
  tablaVirtual,
}: Step3SelectCausaParoProps) {
  const [causas, setCausas] = useState<CausaDefecto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (codigoOrigen == null || codigoComponente == null) {
      setCausas([]);
      return;
    }
    setIsLoading(true);
    loadCausasByOrigenComponente(
      codigoOrigen,
      codigoComponente,
      selectedOrigenComponenteId,
    )
      .then((lista) => {
        if (cancelled) return;
        if (lista.length > 0) {
          setCausas(lista);
          return;
        }
        if (codigoArea != null && codigoAreaTipoMotivo != null) {
          setCausas(
            getCausasParaAreaMotivoOrigenComponente(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
              codigoOrigen,
              codigoComponente,
            ).map((c) => ({
              codigo_causa_defecto: c.codigo_causa_defecto,
              codigo_origen_componente: selectedOrigenComponenteId ?? 0,
              nombre_causa_defecto: c.nombre_causa_defecto,
              estado: "A",
              fecha_modificacion: "",
              usuario_modificacion: "",
            })),
          );
        } else {
          setCausas([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (codigoArea != null && codigoAreaTipoMotivo != null) {
          setCausas(
            getCausasParaAreaMotivoOrigenComponente(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
              codigoOrigen,
              codigoComponente,
            ).map((c) => ({
              codigo_causa_defecto: c.codigo_causa_defecto,
              codigo_origen_componente: selectedOrigenComponenteId ?? 0,
              nombre_causa_defecto: c.nombre_causa_defecto,
              estado: "A",
              fecha_modificacion: "",
              usuario_modificacion: "",
            })),
          );
        } else {
          setCausas([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    codigoArea,
    codigoAreaTipoMotivo,
    codigoOrigen,
    codigoComponente,
    selectedOrigenComponenteId,
    tablaVirtual,
  ]);

  const cards: SelectableCard[] = useMemo(
    () =>
      causas.map((c) => ({
        id: c.codigo_causa_defecto,
        title: c.nombre_causa_defecto,
        subtitle: `Causa #${c.codigo_causa_defecto}`,
      })),
    [causas],
  );

  if (
    codigoArea == null ||
    codigoAreaTipoMotivo == null ||
    codigoOrigen == null ||
    codigoComponente == null
  ) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Completa los pasos anteriores primero.
      </div>
    );
  }

  return (
    <SelectCardGrid
      items={cards}
      selectedId={selectedCausaId}
      onSelect={(id) => {
        const c = causas.find((x) => x.codigo_causa_defecto === id);
        if (c) onSelect(c.codigo_causa_defecto, c.nombre_causa_defecto);
      }}
      onAfterSelect={onAfterSelect}
      icon={AlertTriangle}
      emptyMessage="No hay causas registradas."
      isLoading={isLoading}
      hideFilter
    />
  );
}
