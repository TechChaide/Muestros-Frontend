"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Search } from "lucide-react";
import type { Componente, Origen, OrigenComponente } from "@/types/interfaces";
import { componenteService } from "@/services/seguridades/componente.service";
import { origenComponenteService } from "@/services/seguridades/origenComponente.service";
import { cn } from "@/lib/utils";
import { formatDateForSQLServer, getUsuarioSession } from "./sql-helpers";

interface Step4ComponentesProps {
  origenes: Origen[];
  selectedOrigen: Origen | null;
  onSelectOrigen: (origen: Origen) => void;
  /** OCs activos del ATM (todos los orígenes del contexto) */
  ocs: OrigenComponente[];
  onOcsChange: (ocs: OrigenComponente[]) => void;
}

export default function Step4Componentes({
  origenes,
  selectedOrigen,
  onSelectOrigen,
  ocs,
  onOcsChange,
}: Step4ComponentesProps) {
  const { toast } = useToast();
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [allOcs, setAllOcs] = useState<OrigenComponente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedCompIds, setSelectedCompIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const origenIdsKey = useMemo(
    () =>
      origenes
        .map((o) => o.codigo_origen)
        .sort((a, b) => a - b)
        .join(","),
    [origenes],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [compRes, ocRes] = await Promise.all([
        componenteService.getAll(),
        origenComponenteService.getAll(),
      ]);
      setComponentes(
        ((compRes.data || []) as Componente[]).filter((c) => c.estado === "A"),
      );
      const listaAll = (ocRes.data || []) as OrigenComponente[];
      setAllOcs(listaAll);
      const idSet = new Set(
        origenIdsKey
          ? origenIdsKey.split(",").map((x) => Number(x))
          : [],
      );
      const delAtm = listaAll.filter(
        (oc) => oc.estado === "A" && idSet.has(oc.codigo_origen),
      );
      onOcsChange(delAtm);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo cargar componentes / asociaciones.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [onOcsChange, origenIdsKey, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Precargar selección del origen activo
  useEffect(() => {
    if (!selectedOrigen) {
      setSelectedCompIds([]);
      return;
    }
    const ids = allOcs
      .filter(
        (oc) =>
          oc.estado === "A" &&
          oc.codigo_origen === selectedOrigen.codigo_origen,
      )
      .map((oc) => oc.codigo_componente);
    setSelectedCompIds(ids);
  }, [selectedOrigen, allOcs]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return componentes;
    const f = filter.toLowerCase();
    return componentes.filter((c) =>
      c.nombre_componente.toLowerCase().includes(f),
    );
  }, [componentes, filter]);

  const toggleComp = (id: number) => {
    setSelectedCompIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSaveLinks = async () => {
    if (!selectedOrigen) return;
    setIsSaving(true);
    try {
      const usuario = getUsuarioSession();
      const now = formatDateForSQLServer(new Date());
      const existing = allOcs.filter(
        (oc) => oc.codigo_origen === selectedOrigen.codigo_origen,
      );
      const selectedSet = new Set(selectedCompIds);

      for (const oc of existing.filter((e) => e.estado === "A" && !selectedSet.has(e.codigo_componente))) {
        await origenComponenteService.save({
          ...oc,
          estado: "I",
          usuario_modificacion: usuario,
          fecha_modificacion: now,
        });
      }

      for (const codigo_componente of selectedCompIds) {
        const ya = existing.find((e) => e.codigo_componente === codigo_componente);
        if (ya) {
          if (ya.estado !== "A") {
            await origenComponenteService.save({
              ...ya,
              estado: "A",
              usuario_modificacion: usuario,
              fecha_modificacion: now,
            });
          }
        } else {
          await origenComponenteService.save({
            codigo_origen_componente: 0,
            codigo_origen: selectedOrigen.codigo_origen,
            codigo_componente,
            estado: "A",
          });
        }
      }

      toast({
        title: "Componentes asociados",
        description: `Se actualizaron los vínculos de "${selectedOrigen.nombre_origen}".`,
        variant: "success",
      });
      await load();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo guardar.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const compName = (id: number) =>
    componentes.find((c) => c.codigo_componente === id)?.nombre_componente ??
    `#${id}`;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 4 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Componentes por origen
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Elige un origen del ATM y marca los componentes a vincular (
          <code className="text-xs">origen_componente</code>).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {origenes.map((o) => {
          const sel = selectedOrigen?.codigo_origen === o.codigo_origen;
          const count = ocs.filter(
            (oc) => oc.codigo_origen === o.codigo_origen,
          ).length;
          return (
            <Button
              key={o.codigo_origen}
              type="button"
              size="sm"
              variant={sel ? "default" : "outline"}
              onClick={() => onSelectOrigen(o)}
            >
              {o.nombre_origen}
              <Badge
                variant={sel ? "secondary" : "outline"}
                className="ml-2"
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {!selectedOrigen ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Selecciona un origen para asociar componentes.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando...
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filtrar componentes..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
            {filtered.map((c) => {
              const selected = selectedCompIds.includes(c.codigo_componente);
              return (
                <button
                  key={c.codigo_componente}
                  type="button"
                  onClick={() => toggleComp(c.codigo_componente)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {c.nombre_componente}
                    </span>
                    {selected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {selectedCompIds.length} seleccionado(s) para{" "}
              {selectedOrigen.nombre_origen}
              {selectedCompIds.length > 0 && (
                <>
                  :{" "}
                  {selectedCompIds
                    .slice(0, 3)
                    .map(compName)
                    .join(", ")}
                  {selectedCompIds.length > 3 ? "…" : ""}
                </>
              )}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleSaveLinks()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar vínculos"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
