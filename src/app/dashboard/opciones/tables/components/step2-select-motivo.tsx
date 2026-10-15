"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Search, Tag } from "lucide-react";
import type { Area, AreaTipoMotivo, TipoMotivo } from "@/types/interfaces";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import { cn } from "@/lib/utils";

interface Step2SelectMotivoProps {
  area: Area | null;
  /** codigo_area_tipo_motivo (de la tabla intermedia) que el usuario eligió */
  selectedAtmId: number | null;
  /** motivo completo que se muestra al usuario */
  selectedMotivo: TipoMotivo | null;
  onSelect: (atm: AreaTipoMotivo, motivo: TipoMotivo) => void;
  /** Etiqueta opcional del paso (p. ej. en wizard de réplica). */
  stepHint?: string;
  description?: string;
}

export default function Step2SelectMotivo({
  area,
  selectedAtmId,
  selectedMotivo,
  onSelect,
  stepHint = "Paso 2 de 4",
  description,
}: Step2SelectMotivoProps) {
  const { toast } = useToast();
  const [tiposMotivo, setTiposMotivo] = useState<TipoMotivo[]>([]);
  const [atmsDelArea, setAtmsDelArea] = useState<AreaTipoMotivo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!area) return;
      setIsLoading(true);
      try {
        // 1) Tipos de motivo activos (catálogo)
        const motivosRes = await tipoMotivoService.getAll();
        if (cancelled) return;
        const motivosActivos = ((motivosRes.data || []) as TipoMotivo[]).filter(
          (m) => m.estado === "A"
        );
        setTiposMotivo(motivosActivos);

        // 2) Llamada especializada: motivos que aplican para el área
        const atmRes = await areaTipoMotivoService.getTiposMotivoByCodigoArea(
          area.codigo_area
        );
        if (cancelled) return;

        // El endpoint puede devolver la lista en distintas propiedades según
        // la implementación backend (data, payload, body, etc.).
        const respAny = atmRes as unknown as Record<string, any>;
        const candidates: any[] =
          respAny?.data?.data ??
          respAny?.data ??
          respAny?.payload ??
          respAny?.body ??
          [];

        const lista: AreaTipoMotivo[] = Array.isArray(candidates)
          ? (candidates as AreaTipoMotivo[])
          : [];

        // Filtrar solo los activos
        const atmsActivos = lista.filter((a) => a.estado === "A");
        setAtmsDelArea(atmsActivos);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar los motivos del área.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [area, toast]);

  // motivos que aplican al área, intersectando con el catálogo activo
  const motivosAplicables = useMemo(() => {
    const codigos = new Set(
      atmsDelArea.map((a) => a.codigo_tipo_motivo)
    );
    return tiposMotivo.filter((m) => codigos.has(m.codigo_tipo_motivo));
  }, [tiposMotivo, atmsDelArea]);

  const motivosFiltrados = useMemo(() => {
    // Deduplicar por `codigo_tipo_motivo` para evitar keys duplicadas
    // cuando el área tenga varios ATMs con el mismo motivo.
    const seen = new Set<number>();
    const dedup = motivosAplicables.filter((m) => {
      if (seen.has(m.codigo_tipo_motivo)) return false;
      seen.add(m.codigo_tipo_motivo);
      return true;
    });
    if (!filter.trim()) return dedup;
    const f = filter.toLowerCase();
    return dedup.filter((m) =>
      m.nombre_tipo_motivo.toLowerCase().includes(f)
    );
  }, [motivosAplicables, filter]);

  if (!area) return null;

  const resolvedDescription =
    description ??
    `Elige el tipo de motivo asociado al área ${area.nombre_area} para el cual se construirá la tabla.`;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">{stepHint}</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Selecciona el motivo
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {resolvedDescription}
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Filtrar motivos..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Cargando motivos aplicables al área...
        </p>
      ) : motivosAplicables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Esta área aún no tiene tipos de motivo asociados. Asocia motivos en
            Parámetros &rarr; Áreas &rarr; Tipos de motivo antes de continuar.
          </CardContent>
        </Card>
      ) : motivosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No hay coincidencias con el filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {motivosFiltrados.map((m) => {
            const selected = selectedMotivo?.codigo_tipo_motivo === m.codigo_tipo_motivo;
            return (
              <button
                key={m.codigo_tipo_motivo}
                type="button"
                onClick={() => {
                  const atm = atmsDelArea.find(
                    (a) => a.codigo_tipo_motivo === m.codigo_tipo_motivo
                  );
                  if (atm) onSelect(atm, m);
                }}
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
                      <Tag
                        className={cn(
                          "h-4 w-4",
                          selected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {m.nombre_tipo_motivo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cód. {m.codigo_tipo_motivo}
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

      {selectedMotivo && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Motivo seleccionado
          </span>
          <p className="mt-1">
            <span className="font-semibold">
              {selectedMotivo.nombre_tipo_motivo}
            </span>{" "}
            <span className="text-muted-foreground">
              (cód. {selectedMotivo.codigo_tipo_motivo})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}