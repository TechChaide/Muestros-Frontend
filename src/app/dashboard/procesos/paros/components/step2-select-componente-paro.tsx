"use client";

/**
 * Componente ligado al origen. Carga origen_componente + componente;
 * fallback tabla virtual.
 */
import { useEffect, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import SelectCardGrid, { type SelectableCard } from "./select-card-grid";
import type { MuestreoTablaVirtual } from "@/types/interfaces";
import {
  loadComponentesByOrigen,
  type ComponenteDeOrigen,
} from "@/lib/flujo-seleccion";

function fromVirtual(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAtm: number,
  codigoOrigen: number,
): ComponenteDeOrigen[] {
  const map = new Map<number, ComponenteDeOrigen>();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAtm) continue;
    if (f.codigo_origen !== codigoOrigen) continue;
    map.set(f.codigo_componente, {
      codigo_componente: f.codigo_componente,
      nombre_componente: f.nombre_componente,
      codigo_origen_componente: f.codigo_origen_componente,
    });
  }
  return Array.from(map.values());
}

interface Step2SelectComponenteParoProps {
  codigoArea: number | null;
  codigoAreaTipoMotivo: number | null;
  codigoOrigen: number | null;
  selectedComponenteId: number | null;
  onSelect: (
    componenteId: number,
    nombreComponente: string,
    codigoOrigenComponente: number,
  ) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
}

export default function Step2SelectComponenteParo({
  codigoArea,
  codigoAreaTipoMotivo,
  codigoOrigen,
  selectedComponenteId,
  onSelect,
  onAfterSelect,
  tablaVirtual,
}: Step2SelectComponenteParoProps) {
  const [componentes, setComponentes] = useState<ComponenteDeOrigen[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (codigoOrigen == null) {
      setComponentes([]);
      return;
    }
    setIsLoading(true);
    loadComponentesByOrigen(codigoOrigen)
      .then((lista) => {
        if (cancelled) return;
        if (lista.length > 0) {
          setComponentes(lista);
          return;
        }
        if (codigoArea != null && codigoAreaTipoMotivo != null) {
          setComponentes(
            fromVirtual(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
              codigoOrigen,
            ),
          );
        } else {
          setComponentes([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (codigoArea != null && codigoAreaTipoMotivo != null) {
          setComponentes(
            fromVirtual(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
              codigoOrigen,
            ),
          );
        } else {
          setComponentes([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codigoArea, codigoAreaTipoMotivo, codigoOrigen, tablaVirtual]);

  const cards: SelectableCard[] = useMemo(
    () =>
      componentes.map((c) => ({
        id: c.codigo_componente,
        title: c.nombre_componente,
        subtitle: `Componente #${c.codigo_componente}`,
      })),
    [componentes],
  );

  if (
    codigoArea == null ||
    codigoAreaTipoMotivo == null ||
    codigoOrigen == null
  ) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Completa el paso anterior primero.
      </div>
    );
  }

  return (
    <SelectCardGrid
      items={cards}
      selectedId={selectedComponenteId}
      onSelect={(id) => {
        const c = componentes.find((x) => x.codigo_componente === id);
        if (c) {
          onSelect(
            c.codigo_componente,
            c.nombre_componente,
            c.codigo_origen_componente,
          );
        }
      }}
      onAfterSelect={onAfterSelect}
      icon={Cpu}
      emptyMessage="No hay componentes disponibles."
      isLoading={isLoading}
      hideFilter
    />
  );
}
