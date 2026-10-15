"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building, Check, Search } from "lucide-react";
import type { Area } from "@/types/interfaces";
import { areaService } from "@/services/seguridades/area.service";
import { cn } from "@/lib/utils";

interface Step1SelectAreaProps {
  selectedArea: Area | null;
  onSelect: (area: Area) => void;
  /** Etiqueta opcional del paso (p. ej. en wizard de réplica). */
  stepHint?: string;
  /** Descripción bajo el título. */
  description?: string;
}

export default function Step1SelectArea({
  selectedArea,
  onSelect,
  stepHint = "Paso 1 de 4",
  description = "Elige el área para la cual se construirá la nueva tabla.",
}: Step1SelectAreaProps) {
  const { toast } = useToast();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchAreas = async () => {
      setIsLoading(true);
      try {
        const res = await areaService.getAll();
        if (cancelled) return;
        const data = ((res.data || []) as Area[]).filter(
          (a) => a.estado === "A"
        );
        setAreas(data);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar las áreas.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return areas;
    const f = filter.toLowerCase();
    return areas.filter(
      (a) =>
        a.nombre_area.toLowerCase().includes(f) ||
        a.regional?.toLowerCase().includes(f)
    );
  }, [areas, filter]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">{stepHint}</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Selecciona el área
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar por nombre o regional..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Cargando áreas...
        </p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay áreas activas disponibles.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const selected =
              selectedArea?.codigo_area === a.codigo_area;
            return (
              <button
                key={a.codigo_area}
                type="button"
                onClick={() => onSelect(a)}
                className={cn(
                  "text-left rounded-md border p-4 transition-colors",
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
                      <Building
                        className={cn(
                          "h-4 w-4",
                          selected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.nombre_area}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.regional || "Sin regional"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ficha social:{" "}
                        <span className="font-medium">
                          {a.nombre_ficha_social || "—"}
                        </span>
                      </p>
                    </div>
                  </div>
                  {selected && (
                    <Badge variant="default" className="bg-primary">
                      <Check className="h-3 w-3 mr-1" />
                      Elegida
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedArea && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Área seleccionada
          </span>
          <p className="mt-1">
            <span className="font-semibold">{selectedArea.nombre_area}</span>{" "}
            <span className="text-muted-foreground">
              (cód. {selectedArea.codigo_area})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}