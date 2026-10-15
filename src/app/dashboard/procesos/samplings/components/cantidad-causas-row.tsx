"use client";

/**
 * Bloque compacto: Cantidad | Causa(s) | + Causa
 * Encima de las columnas dinámicas de cada fila de captura.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CausaOption } from "@/lib/variaciones-causas";
import SearchableSelect from "@/components/searchable-select";

interface CantidadCausasRowProps {
  cantidad: number;
  /** Códigos de causa; puede incluir -1 como slot vacío pendiente. */
  causasIds: number[];
  causasDisponibles: CausaOption[];
  disabled?: boolean;
  onCantidadChange: (cantidad: number) => void;
  onCausasChange: (causasIds: number[]) => void;
}

export default function CantidadCausasRow({
  cantidad,
  causasIds,
  causasDisponibles,
  disabled = false,
  onCantidadChange,
  onCausasChange,
}: CantidadCausasRowProps) {
  const displaySlots: number[] =
    causasIds.length === 0 ? [-1] : [...causasIds];

  const usedPositive = new Set(causasIds.filter((id) => id > 0));

  const commitSlots = (slots: number[]) => {
    onCausasChange(slots);
  };

  const setSlotValue = (slotIdx: number, value: string) => {
    const next = [...displaySlots];
    next[slotIdx] = Number(value);
    commitSlots(next);
  };

  const addCausaSlot = () => {
    commitSlots([...displaySlots, -1]);
  };

  const removeSlot = (slotIdx: number) => {
    const next = displaySlots.filter((_, i) => i !== slotIdx);
    commitSlots(next.length === 0 ? [-1] : next);
  };

  return (
    <div className="flex flex-wrap items-end gap-2 pb-2 mb-1 border-b border-dashed">
      <div className="space-y-1 w-[88px] shrink-0">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Cantidad
        </Label>
        <Input
          type="number"
          min={1}
          className="h-8 text-sm font-mono"
          disabled={disabled}
          value={cantidad || ""}
          onChange={(e) =>
            onCantidadChange(
              Math.max(1, Math.floor(Number(e.target.value) || 0)),
            )
          }
        />
      </div>

      {displaySlots.map((slotVal, slotIdx) => {
        const selectedNum = slotVal > 0 ? slotVal : 0;
        const options = causasDisponibles
          .filter(
            (c) =>
              c.codigo_causa_defecto === selectedNum ||
              !usedPositive.has(c.codigo_causa_defecto),
          )
          .map((c) => ({
            value: String(c.codigo_causa_defecto),
            label: c.nombre_causa_defecto,
          }));
        return (
          <div
            key={`causa-slot-${slotIdx}`}
            className="space-y-1 min-w-[160px] flex-1 max-w-[220px]"
          >
            <div className="flex items-center justify-between gap-1">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Causa{displaySlots.length > 1 ? ` ${slotIdx + 1}` : ""}
              </Label>
              {(displaySlots.length > 1 || selectedNum > 0) && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeSlot(slotIdx)}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  title="Quitar causa"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <SearchableSelect
              value={selectedNum > 0 ? String(selectedNum) : undefined}
              options={options}
              placeholder="Selecciona causa"
              searchPlaceholder="Buscar causa…"
              disabled={disabled}
              onValueChange={(v) => setSlotValue(slotIdx, v)}
            />
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={addCausaSlot}
        className={cn(
          "h-8 gap-1 border-emerald-500/70 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800",
          "dark:text-emerald-400 dark:hover:bg-emerald-950/40",
        )}
      >
        <Plus className="h-3.5 w-3.5" />
        Causa
      </Button>
    </div>
  );
}
