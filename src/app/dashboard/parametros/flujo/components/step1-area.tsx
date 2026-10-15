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

interface Step1AreaProps {
  selectedArea: Area | null;
  onSelect: (area: Area) => void;
}

export default function Step1Area({ selectedArea, onSelect }: Step1AreaProps) {
  const { toast } = useToast();
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await areaService.getAll();
        if (cancelled) return;
        setAreas(((res.data || []) as Area[]).filter((a) => a.estado === "A"));
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "No se pudo cargar las áreas.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
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
        a.regional?.toLowerCase().includes(f),
    );
  }, [areas, filter]);

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 1 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">Selecciona el área</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El flujo se configura para un área concreta.
        </p>
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
            No hay áreas activas. Créalas en Parámetros → Áreas.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => {
            const selected = selectedArea?.codigo_area === a.codigo_area;
            return (
              <button
                key={a.codigo_area}
                type="button"
                onClick={() => onSelect(a)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium truncate">{a.nombre_area}</span>
                  </div>
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                {a.regional && (
                  <Badge variant="outline" className="mt-2">
                    {a.regional}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
