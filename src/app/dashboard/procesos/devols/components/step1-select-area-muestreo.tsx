"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, Check, IdCard, Search, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Area, MuestreoTablaVirtual } from "@/types/interfaces";
import { areaService } from "@/services/seguridades/area.service";
import { cn } from "@/lib/utils";
import { getCodigosAreaConMotivoDevoluciones } from "./select-grid";

interface Step1SelectAreaMuestreoProps {
  selectedArea: Area | null;
  onSelect: (area: Area | null) => void;
  onAfterSelect?: () => void;
  tablaVirtual: MuestreoTablaVirtual[];
  isTablaVirtualLoading?: boolean;
}

function getCodigoPersonaFromStorage(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    if (user?.condicion === "Usuario Externo") {
      return user?.id_usuario ?? "";
    }
    return user?.codigo_empleado ?? "";
  } catch {
    return "";
  }
}

/**
 * Paso 1 de devoluciones: áreas LIBRES (sin exigir usuario_calidad),
 * filtradas a las que tienen tipo_motivo DEVOLUCIONES en la tabla virtual.
 */
export default function Step1SelectAreaMuestreo({
  selectedArea,
  onSelect,
  onAfterSelect,
  tablaVirtual,
  isTablaVirtualLoading = false,
}: Step1SelectAreaMuestreoProps) {
  const { toast } = useToast();

  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState(true);
  const [filter, setFilter] = useState("");
  const [codigoPersona, setCodigoPersona] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const codigo = getCodigoPersonaFromStorage();
    setCodigoPersona(codigo);

    if (!codigo) {
      setIsLoadingAreas(false);
      toast({
        title: "Sesión incompleta",
        description:
          "No se encontró un identificador de usuario en la sesión actual. Vuelve a iniciar sesión.",
        variant: "destructive",
      });
      return;
    }

    const fetchAreas = async () => {
      setIsLoadingAreas(true);
      try {
        const res = await areaService.getCatalogo();
        if (cancelled) return;
        setAreas(
          ((res?.data ?? []) as Area[]).filter((a) => a.estado === "A"),
        );
      } catch (error) {
        if (cancelled) return;
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar las áreas.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoadingAreas(false);
      }
    };

    fetchAreas();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const areasDevols = useMemo(() => {
    if (tablaVirtual.length === 0) return [];
    const codigos = getCodigosAreaConMotivoDevoluciones(tablaVirtual);
    return areas.filter((a) => codigos.has(a.codigo_area));
  }, [areas, tablaVirtual]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return areasDevols;
    const f = filter.toLowerCase();
    return areasDevols.filter(
      (a) =>
        a.nombre_area?.toLowerCase().includes(f) ||
        a.regional?.toLowerCase().includes(f),
    );
  }, [areasDevols, filter]);

  const isLoading = isLoadingAreas || isTablaVirtualLoading;

  const handleSelect = useCallback(
    (a: Area) => {
      onSelect(a);
      onAfterSelect?.();
    },
    [onSelect, onAfterSelect],
  );

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 1 de N</span>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Selecciona el área
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Solo áreas con tipo de motivo DEVOLUCIONES. Cualquier usuario puede
          capturar.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
        <UserCircle2 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Usuario identificado
          </p>
          <p className="font-medium">
            Código persona:{" "}
            <span className="font-mono text-primary">
              {codigoPersona || "—"}
            </span>
          </p>
        </div>
        {codigoPersona && (
          <Badge variant="secondary" className="gap-1">
            <IdCard className="h-3 w-3" />
            {codigoPersona}
          </Badge>
        )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay áreas con tipo de motivo &quot;DEVOLUCIONES&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {filtered.map((a) => {
            const selected = selectedArea?.codigo_area === a.codigo_area;
            return (
              <button
                key={a.codigo_area}
                type="button"
                onClick={() => handleSelect(a)}
                className={cn(
                  "text-left rounded-md border p-4 transition-colors",
                  "hover:border-primary/50",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "bg-card",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-md p-2 shrink-0",
                        selected ? "bg-primary/10" : "bg-slate-100",
                      )}
                    >
                      <Building
                        className={cn(
                          "h-4 w-4",
                          selected
                            ? "text-primary"
                            : "text-muted-foreground",
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
                      {a.respCtrlProd && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Resp. Ctrl. Prod.:{" "}
                          <span className="font-medium">{a.respCtrlProd}</span>
                        </p>
                      )}
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
