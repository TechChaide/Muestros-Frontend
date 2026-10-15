"use client";

/**
 * Origen del ATM auto-resuelto. Carga origenService; fallback tabla virtual.
 */
import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import SelectCardGrid, { type SelectableCard } from "./select-card-grid";
import type { MuestreoTablaVirtual, Origen } from "@/types/interfaces";
import { loadOrigenesByAtm } from "@/lib/flujo-seleccion";
import { getOrigenesParaAreaYMotivo } from "./select-grid";

interface Step1SelectOrigenParoProps {
  codigoArea: number | null;
  codigoAreaTipoMotivo: number | null;
  selectedOrigenId: number | null;
  onSelect: (origenId: number, nombreOrigen: string) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
}

export default function Step1SelectOrigenParo({
  codigoArea,
  codigoAreaTipoMotivo,
  selectedOrigenId,
  onSelect,
  onAfterSelect,
  tablaVirtual,
}: Step1SelectOrigenParoProps) {
  const [origenes, setOrigenes] = useState<Origen[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (codigoAreaTipoMotivo == null) {
      setOrigenes([]);
      return;
    }
    setIsLoading(true);
    loadOrigenesByAtm(codigoAreaTipoMotivo)
      .then((lista) => {
        if (cancelled) return;
        if (lista.length > 0) {
          setOrigenes(lista);
          return;
        }
        if (codigoArea != null) {
          setOrigenes(
            getOrigenesParaAreaYMotivo(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
            ).map((o) => ({
              codigo_origen: o.codigo_origen,
              codigo_area_tipo_motivo: codigoAreaTipoMotivo,
              nombre_origen: o.nombre_origen,
              estado: "A",
            })),
          );
        } else {
          setOrigenes([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (codigoArea != null) {
          setOrigenes(
            getOrigenesParaAreaYMotivo(
              tablaVirtual,
              codigoArea,
              codigoAreaTipoMotivo,
            ).map((o) => ({
              codigo_origen: o.codigo_origen,
              codigo_area_tipo_motivo: codigoAreaTipoMotivo,
              nombre_origen: o.nombre_origen,
              estado: "A",
            })),
          );
        } else {
          setOrigenes([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codigoArea, codigoAreaTipoMotivo, tablaVirtual]);

  const cards: SelectableCard[] = useMemo(
    () =>
      origenes.map((o) => ({
        id: o.codigo_origen,
        title: o.nombre_origen,
        subtitle: `Origen #${o.codigo_origen}`,
      })),
    [origenes],
  );

  if (codigoArea == null || codigoAreaTipoMotivo == null) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        No se pudo resolver el área o el motivo del paro.
      </div>
    );
  }

  return (
    <SelectCardGrid
      items={cards}
      selectedId={selectedOrigenId}
      onSelect={(id) => {
        const o = origenes.find((x) => x.codigo_origen === id);
        if (o) onSelect(o.codigo_origen, o.nombre_origen);
      }}
      onAfterSelect={onAfterSelect}
      icon={MapPin}
      emptyMessage="No hay orígenes disponibles."
      isLoading={isLoading}
      hideFilter
    />
  );
}
