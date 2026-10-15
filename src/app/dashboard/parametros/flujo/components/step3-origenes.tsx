"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Area, AreaTipoMotivo, Origen, TipoMotivo } from "@/types/interfaces";
import { origenService } from "@/services/seguridades/origen.service";
import { areaService } from "@/services/seguridades/area.service";
import {
  extractList,
  formatDateForSQLServer,
  getUsuarioSession,
} from "./sql-helpers";
import {
  normalizeOrigenNombre,
  ORIGEN_OPCION_OTROS,
} from "@/lib/origen-nombre";

interface Step3OrigenesProps {
  atm: AreaTipoMotivo;
  motivo: TipoMotivo | null;
  origenes: Origen[];
  onOrigenesChange: (origenes: Origen[]) => void;
}

export default function Step3Origenes({
  atm,
  motivo,
  origenes,
  onOrigenesChange,
}: Step3OrigenesProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFichas, setIsLoadingFichas] = useState(true);
  const [fichasSociales, setFichasSociales] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [otrosNombre, setOtrosNombre] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      let lista = extractList<Origen>(
        await origenService.getOrigenesByCodigoAreaTipoMotivo(
          atm.codigo_area_tipo_motivo,
        ),
      ).filter((o) => o.estado === "A");
      if (lista.length === 0) {
        const all = await origenService.getAll();
        lista = ((all.data || []) as Origen[]).filter(
          (o) =>
            o.estado === "A" &&
            o.codigo_area_tipo_motivo === atm.codigo_area_tipo_motivo,
        );
      }
      onOrigenesChange(lista);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo cargar los orígenes.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [atm.codigo_area_tipo_motivo, onOrigenesChange, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoadingFichas(true);
      try {
        const res = await areaService.getAll();
        if (cancelled) return;
        const areas = ((res.data || []) as Area[]).filter((a) => a.estado === "A");
        const set = new Set<string>();
        for (const a of areas) {
          const ficha = normalizeOrigenNombre(a.nombre_ficha_social ?? "");
          if (ficha) set.add(ficha);
        }
        setFichasSociales(
          Array.from(set).sort((a, b) => a.localeCompare(b, "es")),
        );
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar las fichas sociales.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoadingFichas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const isOtros = selectedOption === ORIGEN_OPCION_OTROS;

  const nombreResuelto = useMemo(() => {
    if (isOtros) return normalizeOrigenNombre(otrosNombre);
    if (!selectedOption) return "";
    return normalizeOrigenNombre(selectedOption);
  }, [isOtros, otrosNombre, selectedOption]);

  const handleCreate = async () => {
    const nombre = nombreResuelto;
    if (!nombre) {
      toast({
        title: "Validación",
        description: isOtros
          ? "Escribe el nombre del origen en Otros."
          : "Selecciona un origen de la lista o Otros.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      await origenService.save({
        codigo_origen: 0,
        codigo_area_tipo_motivo: atm.codigo_area_tipo_motivo,
        nombre_origen: nombre,
        estado: "A",
      });
      toast({
        title: "Origen creado",
        description: `"${nombre}" quedó asociado al motivo.`,
        variant: "success",
      });
      setSelectedOption("");
      setOtrosNombre("");
      await load();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo crear el origen.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlink = async (origen: Origen) => {
    try {
      await origenService.save({
        ...origen,
        estado: "I",
        usuario_modificacion: getUsuarioSession(),
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({
        title: "Origen desactivado",
        description: `"${origen.nombre_origen}" se desasoció del ATM.`,
        variant: "success",
      });
      await load();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo desactivar.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 3 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">Orígenes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elige un origen desde las fichas sociales de las áreas, o{" "}
          <span className="font-medium text-foreground">Otros</span> para
          escribir uno. Se guardan en mayúsculas sin caracteres especiales.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Motivo:{" "}
          <span className="font-medium text-foreground">
            {motivo?.nombre_tipo_motivo ?? `ATM #${atm.codigo_area_tipo_motivo}`}
          </span>
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label htmlFor="origen-ficha-select">Nuevo origen</Label>
          <select
            id="origen-ficha-select"
            className="border rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedOption}
            disabled={isLoadingFichas || isSaving}
            onChange={(e) => {
              setSelectedOption(e.target.value);
              if (e.target.value !== ORIGEN_OPCION_OTROS) {
                setOtrosNombre("");
              }
            }}
          >
            <option value="">
              {isLoadingFichas
                ? "Cargando fichas sociales..."
                : "Selecciona una ficha social..."}
            </option>
            {fichasSociales.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value={ORIGEN_OPCION_OTROS}>OTROS</option>
          </select>

          {isOtros && (
            <div className="space-y-1.5">
              <Label htmlFor="origen-otros-input">Especificar origen</Label>
              <Input
                id="origen-otros-input"
                value={otrosNombre}
                onChange={(e) =>
                  setOtrosNombre(normalizeOrigenNombre(e.target.value))
                }
                placeholder="ESCRIBE EL ORIGEN"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCreate();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Solo letras, números y espacios. Se convierte a mayúsculas
                automáticamente.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              className="gap-1"
              disabled={!nombreResuelto || isSaving}
              onClick={() => void handleCreate()}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando orígenes...
        </div>
      ) : origenes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay orígenes. Agrega al menos uno para continuar.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {origenes.map((o) => (
            <li
              key={o.codigo_origen}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{o.nombre_origen}</p>
                <Badge variant="outline" className="mt-1">
                  #{o.codigo_origen}
                </Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => void handleUnlink(o)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
