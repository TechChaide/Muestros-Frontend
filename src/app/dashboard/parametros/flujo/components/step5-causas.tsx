"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import type {
  CausaDefecto,
  Componente,
  Origen,
  OrigenComponente,
} from "@/types/interfaces";
import { causaDefectoService } from "@/services/seguridades/causaDefecto.service";
import { componenteService } from "@/services/seguridades/componente.service";
import { cn } from "@/lib/utils";
import {
  extractList,
  formatDateForSQLServer,
  getUsuarioSession,
} from "./sql-helpers";

interface Step5CausasProps {
  origenes: Origen[];
  ocs: OrigenComponente[];
}

export default function Step5Causas({ origenes, ocs }: Step5CausasProps) {
  const { toast } = useToast();
  const [componentes, setComponentes] = useState<Componente[]>([]);
  /** Solo los OC que el usuario eligió para trabajar */
  const [selectedOcIds, setSelectedOcIds] = useState<number[]>([]);
  const [causasByOc, setCausasByOc] = useState<Record<number, CausaDefecto[]>>(
    {},
  );
  const [draftByOc, setDraftByOc] = useState<Record<number, string>>({});
  const [loadingOcIds, setLoadingOcIds] = useState<Set<number>>(new Set());
  const [savingOcIds, setSavingOcIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await componenteService.getAll();
        if (cancelled) return;
        setComponentes(
          ((res.data || []) as Componente[]).filter((c) => c.estado === "A"),
        );
      } catch {
        // no bloquea
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Si un OC deja de existir, quitarlo de la selección
  useEffect(() => {
    const valid = new Set(ocs.map((o) => o.codigo_origen_componente));
    setSelectedOcIds((prev) => prev.filter((id) => valid.has(id)));
  }, [ocs]);

  const origenById = useMemo(() => {
    const m = new Map<number, Origen>();
    origenes.forEach((o) => m.set(o.codigo_origen, o));
    return m;
  }, [origenes]);

  const compById = useMemo(() => {
    const m = new Map<number, Componente>();
    componentes.forEach((c) => m.set(c.codigo_componente, c));
    return m;
  }, [componentes]);

  const selectedOcs = useMemo(
    () =>
      ocs.filter((oc) =>
        selectedOcIds.includes(oc.codigo_origen_componente),
      ),
    [ocs, selectedOcIds],
  );

  const loadCausasForOc = useCallback(
    async (ocId: number) => {
      setLoadingOcIds((prev) => new Set(prev).add(ocId));
      try {
        let lista = extractList<CausaDefecto>(
          await causaDefectoService.getCausasDefectoByCodigoOrigenComponente(
            ocId,
          ),
        ).filter((c) => c.estado === "A");

        if (lista.length === 0) {
          const all = await causaDefectoService.getAll();
          lista = ((all.data || []) as CausaDefecto[]).filter(
            (c) => c.estado === "A" && c.codigo_origen_componente === ocId,
          );
        }

        setCausasByOc((prev) => ({ ...prev, [ocId]: lista }));
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar las causas.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoadingOcIds((prev) => {
          const next = new Set(prev);
          next.delete(ocId);
          return next;
        });
      }
    },
    [toast],
  );

  // Cargar causas solo de los OC seleccionados
  const selectedKey = selectedOcIds.slice().sort((a, b) => a - b).join(",");
  useEffect(() => {
    const ids = selectedKey
      ? selectedKey.split(",").map((x) => Number(x))
      : [];
    if (ids.length === 0) return;
    for (const id of ids) {
      void loadCausasForOc(id);
    }
  }, [selectedKey, loadCausasForOc]);

  const toggleOc = (id: number) => {
    setSelectedOcIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async (ocId: number) => {
    const nombre = (draftByOc[ocId] || "").trim();
    if (!nombre) return;
    setSavingOcIds((prev) => new Set(prev).add(ocId));
    try {
      await causaDefectoService.save({
        codigo_causa_defecto: 0,
        codigo_origen_componente: ocId,
        nombre_causa_defecto: nombre,
        estado: "A",
      });
      toast({
        title: "Causa agregada",
        description: `"${nombre}" se asoció al vínculo.`,
        variant: "success",
      });
      setDraftByOc((prev) => ({ ...prev, [ocId]: "" }));
      await loadCausasForOc(ocId);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo crear la causa.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSavingOcIds((prev) => {
        const next = new Set(prev);
        next.delete(ocId);
        return next;
      });
    }
  };

  const handleUnlink = async (ocId: number, causa: CausaDefecto) => {
    try {
      await causaDefectoService.save({
        ...causa,
        estado: "I",
        usuario_modificacion: getUsuarioSession(),
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({
        title: "Causa desactivada",
        description: `"${causa.nombre_causa_defecto}" se desasoció.`,
        variant: "success",
      });
      await loadCausasForOc(ocId);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo desactivar.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">Paso 5 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Causas de defecto
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Primero selecciona uno o más vínculos origen–componente. Solo para
          esos aparecen las secciones donde agregas causas.
        </p>
      </div>

      {ocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay <code>origen_componente</code> en este ATM. Vuelve al paso 4
            y guarda vínculos.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Seleccionar vínculos</p>
              <Badge variant="secondary">
                {selectedOcIds.length} seleccionado(s)
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {ocs.map((oc) => {
                const sel = selectedOcIds.includes(
                  oc.codigo_origen_componente,
                );
                return (
                  <Button
                    key={oc.codigo_origen_componente}
                    type="button"
                    size="sm"
                    variant={sel ? "default" : "outline"}
                    onClick={() => toggleOc(oc.codigo_origen_componente)}
                    className={cn(
                      "h-auto py-2 whitespace-normal text-left",
                      sel && "ring-1 ring-primary",
                    )}
                    aria-pressed={sel}
                  >
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {sel && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span>
                        {origenById.get(oc.codigo_origen)?.nombre_origen ??
                          `Origen #${oc.codigo_origen}`}
                      </span>
                      <span aria-hidden="true" className="opacity-80">
                        {"\u27FF"}
                      </span>
                      <span className="font-medium">
                        {compById.get(oc.codigo_componente)
                          ?.nombre_componente ??
                          `Comp #${oc.codigo_componente}`}
                      </span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {selectedOcs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Selecciona al menos un origen–componente para ver su sección de
                causas.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {selectedOcs.map((oc) => {
                const ocId = oc.codigo_origen_componente;
                const origen = origenById.get(oc.codigo_origen);
                const comp = compById.get(oc.codigo_componente);
                const causas = causasByOc[ocId] ?? [];
                const draft = draftByOc[ocId] ?? "";
                const isLoading = loadingOcIds.has(ocId);
                const isSaving = savingOcIds.has(ocId);

                return (
                  <Card key={ocId} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                      <CardTitle className="text-sm font-semibold flex flex-wrap items-center gap-1.5">
                        <span>
                          {origen?.nombre_origen ??
                            `Origen #${oc.codigo_origen}`}
                        </span>
                        <span
                          aria-hidden="true"
                          className="opacity-70 font-normal"
                        >
                          {"\u27FF"}
                        </span>
                        <span>
                          {comp?.nombre_componente ??
                            `Comp #${oc.codigo_componente}`}
                        </span>
                        <Badge
                          variant="outline"
                          className="ml-auto font-normal"
                        >
                          OC #{ocId}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={draft}
                          onChange={(e) =>
                            setDraftByOc((prev) => ({
                              ...prev,
                              [ocId]: e.target.value,
                            }))
                          }
                          placeholder="Nombre de la nueva causa"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleCreate(ocId);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1 shrink-0"
                          disabled={!draft.trim() || isSaving}
                          onClick={() => void handleCreate(ocId)}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          Agregar
                        </Button>
                      </div>

                      {isLoading && causas.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Cargando causas...
                        </div>
                      ) : causas.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">
                          Sin causas en este vínculo.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {causas.map((c) => (
                            <li
                              key={c.codigo_causa_defecto}
                              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {c.nombre_causa_defecto}
                                </p>
                                <Badge variant="outline" className="mt-1">
                                  #{c.codigo_causa_defecto}
                                </Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => void handleUnlink(ocId, c)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
