"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Search, Boxes, Tag } from "lucide-react";
import type {
  Area,
  AreaTipoMotivo,
  Componente,
  TipoMotivo,
} from "@/types/interfaces";
import { componenteService } from "@/services/seguridades/componente.service";
import { cn } from "@/lib/utils";

interface Step3SelectComponenteProps {
  area: Area | null;
  motivo: TipoMotivo | null;
  atm: AreaTipoMotivo | null;
  /** Selección múltiple (creación). En edición se pasa 0–1 ítem. */
  selectedComponentes: Componente[];
  onToggle: (componente: Componente) => void;
  /** Si es false, solo permite un componente (modo edición). Default true. */
  allowMultiple?: boolean;
}

export default function Step3SelectComponente({
  area,
  motivo,
  atm,
  selectedComponentes,
  onToggle,
  allowMultiple = true,
}: Step3SelectComponenteProps) {
  const { toast } = useToast();
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchComponentes = async () => {
      if (!atm) return;
      setIsLoading(true);
      try {
        const res = await componenteService.getComponentesByCodigoAreaTipoMotivo(
          atm.codigo_area_tipo_motivo
        );

        const respAny = res as unknown as Record<string, any>;
        const candidates: any[] =
          respAny?.data?.data ??
          respAny?.data ??
          respAny?.payload ??
          respAny?.body ??
          [];

        const lista: Componente[] = Array.isArray(candidates)
          ? (candidates as Componente[])
          : [];

        if (cancelled) return;
        setComponentes(lista.filter((c) => c.estado === "A"));
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar los componentes.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchComponentes();
    return () => {
      cancelled = true;
    };
  }, [atm, toast]);

  const selectedIds = useMemo(
    () => new Set(selectedComponentes.map((c) => c.codigo_componente)),
    [selectedComponentes],
  );

  const filtered = useMemo(() => {
    const seen = new Set<number>();
    const dedup = componentes.filter((c) => {
      if (seen.has(c.codigo_componente)) return false;
      seen.add(c.codigo_componente);
      return true;
    });
    if (!filter.trim()) return dedup;
    const f = filter.toLowerCase();
    return dedup.filter((c) => c.nombre_componente.toLowerCase().includes(f));
  }, [componentes, filter]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 3 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          {allowMultiple
            ? "Selecciona uno o más componentes"
            : "Selecciona el componente"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {allowMultiple
            ? "La misma tabla (columnas, nombre y tipo de medición) se asignará a cada componente elegido."
            : "Elige el componente sobre el cual se va a construir la tabla."}{" "}
          Solo se muestran los componentes muestreables para{" "}
          <span className="font-medium">{area?.nombre_area}</span> ·{" "}
          <span className="font-medium">{motivo?.nombre_tipo_motivo}</span>.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar componentes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Cargando componentes muestreables...
        </p>
      ) : componentes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Esta combinación de área + motivo no tiene componentes muestreables
            asociados. Verifica la parametrización antes de continuar.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No hay coincidencias con el filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const selected = selectedIds.has(c.codigo_componente);
            return (
              <button
                key={c.codigo_componente}
                type="button"
                onClick={() => onToggle(c)}
                className={cn(
                  "text-left rounded-md border p-3 transition-colors",
                  "hover:border-primary/50",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-md p-2 shrink-0",
                        selected ? "bg-primary/10" : "bg-slate-100"
                      )}
                    >
                      <Boxes
                        className={cn(
                          "h-4 w-4",
                          selected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {c.nombre_componente}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cód. {c.codigo_componente}
                      </p>
                    </div>
                  </div>
                  {selected && (
                    <Badge variant="default" className="bg-primary">
                      <Check className="h-3 w-3 mr-1" />
                      Elegido
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedComponentes.length > 0 && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumen
            </span>
            <Badge variant="secondary">
              {selectedComponentes.length} componente
              {selectedComponentes.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="flex items-start gap-2 text-sm">
            <Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">{area?.nombre_area}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-semibold">{motivo?.nombre_tipo_motivo}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-semibold text-primary">
                {selectedComponentes.map((c) => c.nombre_componente).join(", ")}
              </span>
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
