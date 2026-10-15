"use client";

/**
 * Selección de componente filtrado por el origen elegido.
 * Carga origen_componente + componente (getAll); si vacío, usa tabla virtual.
 */
import { useEffect, useMemo, useState } from "react";
import { Cpu } from "lucide-react";
import SelectCardGrid, {
  type SelectableCard,
} from "./select-card-grid";
import type { Area, MuestreoTablaVirtual } from "@/types/interfaces";
import {
  loadComponentesByOrigen,
  type ComponenteDeOrigen,
} from "@/lib/flujo-seleccion";

interface Step3SelectComponenteMuestreoProps {
  selectedArea: Area | null;
  selectedAreaTipoMotivoId: number | null;
  selectedOrigenId: number | null;
  selectedComponenteId: number | null;
  onSelect: (
    componenteId: number,
    nombreComponente: string,
    codigoOrigenComponente: number,
  ) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
  stepHint?: string;
}

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
  return Array.from(map.values()).sort((a, b) =>
    a.nombre_componente.localeCompare(b.nombre_componente, "es"),
  );
}

export default function Step3SelectComponenteMuestreo({
  selectedArea,
  selectedAreaTipoMotivoId,
  selectedOrigenId,
  selectedComponenteId,
  onSelect,
  onAfterSelect,
  tablaVirtual,
  stepHint = "Paso 4 de 7",
}: Step3SelectComponenteMuestreoProps) {
  const [componentes, setComponentes] = useState<ComponenteDeOrigen[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (selectedOrigenId == null) {
      setComponentes([]);
      return;
    }
    setIsLoading(true);
    loadComponentesByOrigen(selectedOrigenId)
      .then((lista) => {
        if (cancelled) return;
        if (lista.length > 0) {
          setComponentes(lista);
          return;
        }
        if (selectedArea && selectedAreaTipoMotivoId != null) {
          setComponentes(
            fromVirtual(
              tablaVirtual,
              selectedArea.codigo_area,
              selectedAreaTipoMotivoId,
              selectedOrigenId,
            ),
          );
        } else {
          setComponentes([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (selectedArea && selectedAreaTipoMotivoId != null) {
          setComponentes(
            fromVirtual(
              tablaVirtual,
              selectedArea.codigo_area,
              selectedAreaTipoMotivoId,
              selectedOrigenId,
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
  }, [selectedArea, selectedAreaTipoMotivoId, selectedOrigenId, tablaVirtual]);

  const cards: SelectableCard[] = useMemo(
    () =>
      componentes.map((c) => ({
        id: c.codigo_componente,
        title: c.nombre_componente,
        subtitle: `Componente #${c.codigo_componente}`,
      })),
    [componentes],
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">{stepHint}</span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Selecciona el componente
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Componentes ligados al origen elegido.
        </p>
      </div>

      {!selectedArea ||
      selectedAreaTipoMotivoId == null ||
      selectedOrigenId == null ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Completa los pasos anteriores primero.
        </div>
      ) : (
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
          filterPlaceholder="Filtrar componentes..."
          emptyMessage="No hay componentes disponibles para este origen."
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
