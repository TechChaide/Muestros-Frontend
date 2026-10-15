"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Search, Tag } from "lucide-react";
import type { Area, AreaTipoMotivo, TipoMotivo } from "@/types/interfaces";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import { cn } from "@/lib/utils";
import { extractList } from "./sql-helpers";

interface Step2AtmProps {
  area: Area;
  selectedAtm: AreaTipoMotivo | null;
  selectedMotivo: TipoMotivo | null;
  onSelect: (atm: AreaTipoMotivo, motivo: TipoMotivo) => void;
}

export default function Step2Atm({
  area,
  selectedAtm,
  selectedMotivo,
  onSelect,
}: Step2AtmProps) {
  const { toast } = useToast();
  const [tiposMotivo, setTiposMotivo] = useState<TipoMotivo[]>([]);
  const [atms, setAtms] = useState<AreaTipoMotivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [motivoToAdd, setMotivoToAdd] = useState<number | null>(null);
  const [correo, setCorreo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [motivosRes, atmRes] = await Promise.all([
        tipoMotivoService.getAll(),
        areaTipoMotivoService.getTiposMotivoByCodigoArea(area.codigo_area),
      ]);
      setTiposMotivo(
        ((motivosRes.data || []) as TipoMotivo[]).filter((m) => m.estado === "A"),
      );
      let lista = extractList<AreaTipoMotivo>(atmRes).filter(
        (a) => a.estado === "A",
      );
      if (lista.length === 0) {
        const all = await areaTipoMotivoService.getAll();
        lista = ((all.data || []) as AreaTipoMotivo[]).filter(
          (a) => a.codigo_area === area.codigo_area && a.estado === "A",
        );
      }
      setAtms(lista);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo cargar los motivos.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [area.codigo_area, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const motivoById = useMemo(() => {
    const m = new Map<number, TipoMotivo>();
    tiposMotivo.forEach((t) => m.set(t.codigo_tipo_motivo, t));
    return m;
  }, [tiposMotivo]);

  const filas = useMemo(() => {
    return atms
      .map((atm) => ({
        atm,
        motivo: motivoById.get(atm.codigo_tipo_motivo) ?? null,
      }))
      .filter((x) => x.motivo)
      .filter((x) => {
        if (!filter.trim()) return true;
        const f = filter.toLowerCase();
        return x.motivo!.nombre_tipo_motivo.toLowerCase().includes(f);
      });
  }, [atms, motivoById, filter]);

  const motivosDisponibles = useMemo(() => {
    const usados = new Set(atms.map((a) => a.codigo_tipo_motivo));
    return tiposMotivo.filter((m) => !usados.has(m.codigo_tipo_motivo));
  }, [tiposMotivo, atms]);

  const handleAssociate = async () => {
    if (motivoToAdd == null) return;
    setIsSaving(true);
    try {
      await areaTipoMotivoService.save({
        codigo_area_tipo_motivo: 0,
        codigo_area: area.codigo_area,
        codigo_tipo_motivo: motivoToAdd,
        correo_notificacion: correo.trim(),
        tipo_fuente: "MANUAL",
        valor: "",
        caso: "",
        estado: "A",
      });
      toast({
        title: "Motivo asociado",
        description: "Se creó el ATM. Ya puedes seleccionarlo.",
        variant: "success",
      });
      setShowAdd(false);
      setMotivoToAdd(null);
      await load();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo asociar el motivo.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 2 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Selecciona el motivo (ATM)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Motivos asociados al área{" "}
          <span className="font-medium text-foreground">{area.nombre_area}</span>.
          Si falta alguno, asócialo aquí.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filtrar motivos..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          Asociar motivo
        </Button>
      </div>

      {showAdd && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Nuevo ATM para esta área</p>
            {motivosDisponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todos los motivos activos ya están asociados, o no hay motivos
                en el catálogo (Parámetros → Tipos de motivo).
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {motivosDisponibles.map((m) => {
                    const sel = motivoToAdd === m.codigo_tipo_motivo;
                    return (
                      <button
                        key={m.codigo_tipo_motivo}
                        type="button"
                        onClick={() => setMotivoToAdd(m.codigo_tipo_motivo)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm",
                          sel
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/40",
                        )}
                      >
                        {m.nombre_tipo_motivo}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="correo-atm">Correo notificación (opcional)</Label>
                  <Input
                    id="correo-atm"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={motivoToAdd == null || isSaving}
                  onClick={() => void handleAssociate()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar ATM"
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : filas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Esta área aún no tiene motivos. Usa &quot;Asociar motivo&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filas.map(({ atm, motivo }) => {
            const selected =
              selectedAtm?.codigo_area_tipo_motivo ===
              atm.codigo_area_tipo_motivo;
            return (
              <button
                key={atm.codigo_area_tipo_motivo}
                type="button"
                onClick={() => onSelect(atm, motivo!)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-primary/40",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium truncate">
                      {motivo!.nombre_tipo_motivo}
                    </span>
                  </div>
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">ATM #{atm.codigo_area_tipo_motivo}</Badge>
                  {atm.tipo_fuente && (
                    <Badge variant="secondary">{atm.tipo_fuente}</Badge>
                  )}
                </div>
                {selectedMotivo?.codigo_tipo_motivo ===
                  motivo!.codigo_tipo_motivo &&
                  selected && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Seleccionado
                    </p>
                  )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
