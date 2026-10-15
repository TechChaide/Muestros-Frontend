"use client";

/**
 * Catálogo de tablas por ÁREA.
 *
 * Modelo actual:
 *   - Cada `Asociacion` tiene `codigo_area_tipo_motivo` (FK a la combinación
 *     única área+motivo). Esto significa que una "tabla" sólo tiene sentido
 *     dentro de un área.
 *   - La unidad de agrupación visual es el ÁREA.
 *   - Por cada área se listan sus tablas (ya agrupadas por nombre lógico,
 *     deduplicadas a la última versión vigente).
 *   - Cada área expone un CTA: "Asociar nueva tabla" que abre el wizard
 *     precargando el área seleccionada.
 *
 * Las interfaces de los Step1/2/3 del wizard se mantienen idénticas; sólo
 * cambia la forma de entrar al wizard (ahora viene con el `area`
 * preseleccionado en lugar de venir "frío").
 */

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  Copy,
  Edit3,
  Layers,
  Link2,
  Loader2,
  Plus,
  Search,
  Table as TableIcon,
} from "lucide-react";
import type {
  Area,
  AreaTipoMotivo,
  Asociacion,
  Componente,
  ElementoAsociacion,
  TipoMedicion,
  TipoMotivo,
} from "@/types/interfaces";
import { asociacionService } from "@/services/seguridades/asociacion.service";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import { areaService } from "@/services/seguridades/area.service";
import { componenteService } from "@/services/seguridades/componente.service";
import { elementoAsociacionService } from "@/services/seguridades/elementoAsociacion.service";
import { tipoMedicionService } from "@/services/seguridades/tipoMedicion.service";

export interface ExistingTable {
  /** PK lógica (área+motivo+tabla normalizada) */
  key: string;
  nombre: string;
  latestVersion: number;
  columnCount: number;
  /** Metadatos ya hidratados del registro vigente */
  area: Area | null;
  motivo: TipoMotivo | null;
  atm: AreaTipoMotivo | null;
  componente: Componente | null;
  /** FK a `tipo_medicion` de la versión vigente. */
  codigo_tipo_medicion: number;
  tipoMedicion: TipoMedicion | null;
  /** Todas las versiones históricas de esta tabla */
  versions: Asociacion[];
  /** Columnas de la versión vigente */
  columns: Array<{
    uid: string;
    codigo_elemento_asociacion: number;
    etiqueta: string;
    nombreElemento: string;
  }>;
}

interface TablesCatalogProps {
  onCreateNew: (area?: Area) => void;
  onEditTable: (table: ExistingTable) => void;
  onReplicateTable: (table: ExistingTable) => void;
  onViewTable: (table: ExistingTable) => void;
  refreshKey: number;
}

let uidSeed = 0;
const nextCatalogUid = () => `cat-${Date.now()}-${++uidSeed}`;

export default function TablesCatalog({
  onCreateNew,
  onEditTable,
  onReplicateTable,
  onViewTable,
  refreshKey,
}: TablesCatalogProps) {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // Datos crudos
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [motivos, setMotivos] = useState<TipoMotivo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [atms, setAtms] = useState<AreaTipoMotivo[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [elementos, setElementos] = useState<ElementoAsociacion[]>([]);
  const [tiposMedicion, setTiposMedicion] = useState<TipoMedicion[]>([]);

  // ===== Carga inicial =====
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const [
          asocRes,
          motivosRes,
          areasRes,
          compRes,
          elementosRes,
          tiposMedicionRes,
        ] = await Promise.all([
          asociacionService.getAll(),
          tipoMotivoService.getAll(),
          areaService.getAll(),
          componenteService.getAll(),
          elementoAsociacionService.getAll(),
          tipoMedicionService.getAll(),
        ]);

        if (cancelled) return;

        setAsociaciones(
          ((asocRes.data || []) as Asociacion[]).filter((a) => a.estado === "A")
        );
        setMotivos(
          ((motivosRes.data || []) as TipoMotivo[]).filter(
            (m) => m.estado === "A"
          )
        );
        setAreas(
          ((areasRes.data || []) as Area[]).filter((a) => a.estado === "A")
        );
        setComponentes(
          ((compRes.data || []) as Componente[]).filter((c) => c.estado === "A")
        );
        setElementos(
          ((elementosRes.data || []) as ElementoAsociacion[]).filter(
            (e) => e.estado === "A"
          )
        );
        setTiposMedicion(
          ((tiposMedicionRes.data || []) as TipoMedicion[]).filter(
            (t) => t.estado === "A"
          )
        );

        // Cargamos los ATM de cada área (la promesa se hace por área).
        const allAtms: AreaTipoMotivo[] = [];
        for (const a of (areasRes.data || []) as Area[]) {
          try {
            const r = await areaTipoMotivoService.getTiposMotivoByCodigoArea(
              a.codigo_area
            );
            const respAny = r as unknown as Record<string, any>;
            const candidates: any[] =
              respAny?.data?.data ?? respAny?.data ?? respAny?.payload ?? [];
            if (Array.isArray(candidates)) {
              allAtms.push(...(candidates as AreaTipoMotivo[]));
            }
          } catch {
            /* seguimos con las demás áreas */
          }
        }
        if (!cancelled) {
          // Deduplicar por PK + filtrar activos
          const seen = new Set<number>();
          const dedup = allAtms.filter((x) => {
            if (seen.has(x.codigo_area_tipo_motivo)) return false;
            seen.add(x.codigo_area_tipo_motivo);
            return x.estado === "A";
          });
          setAtms(dedup);
        }
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catálogo de tablas.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [toast, refreshKey]);

  // ===== Mapas de resolución =====
  const motivoByCodigo = useMemo(
    () => new Map(motivos.map((m) => [m.codigo_tipo_motivo, m])),
    [motivos]
  );
  const areaByCodigo = useMemo(
    () => new Map(areas.map((a) => [a.codigo_area, a])),
    [areas]
  );
  const atmByCodigo = useMemo(
    () => new Map(atms.map((a) => [a.codigo_area_tipo_motivo, a])),
    [atms]
  );
  const componenteByCodigo = useMemo(
    () => new Map(componentes.map((c) => [c.codigo_componente, c])),
    [componentes]
  );
  const elementoByCodigo = useMemo(
    () => new Map(elementos.map((e) => [e.codigo_elemento_asociacion, e])),
    [elementos]
  );
  const tipoMedicionByCodigo = useMemo(
    () =>
      new Map(tiposMedicion.map((t) => [t.codigo_tipo_medicion, t])),
    [tiposMedicion]
  );

  // ===== Agrupación: Área → tabla lógica (motivo+ATM+tabla) =====
  /**
   * Construye todas las tablas existentes agrupadas por (ATM, tabla
   * normalizada). Ya que la FK correcta ahora es `codigo_area_tipo_motivo`,
   * dos tablas con el mismo nombre en motivos distintos NO se mezclan
   * (porque sus FKs de ATM son distintas).
   */
  const tablas: ExistingTable[] = useMemo(() => {
    type Group = {
      atm: AreaTipoMotivo | null;
      motivo: TipoMotivo | null;
      nombreLower: string;
      nombreOriginal: string;
      items: Asociacion[];
    };
    const byGroup = new Map<string, Group>();
    for (const a of asociaciones) {
      const atm = atmByCodigo.get(a.codigo_area_tipo_motivo) ?? null;
      const motivo = atm ? motivoByCodigo.get(atm.codigo_tipo_motivo) ?? null : null;
      const tm = Number(a.codigo_tipo_medicion) || 0;
      const key = `${a.codigo_area_tipo_motivo}__${a.tabla
        .toLowerCase()
        .trim()}__${tm}__${a.codigo_componente}`;
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          atm,
          motivo,
          nombreLower: a.tabla.toLowerCase().trim(),
          nombreOriginal: a.tabla,
          items: [],
        });
      }
      byGroup.get(key)!.items.push(a);
    }

    const out: ExistingTable[] = [];
    for (const [, g] of byGroup) {
      const items = [...g.items].sort((x, y) => {
        if (y.tabla_version !== x.tabla_version) {
          return y.tabla_version - x.tabla_version;
        }
        return x.orden - y.orden;
      });
      const vigente = items[0];
      const area = g.atm ? areaByCodigo.get(g.atm.codigo_area) ?? null : null;
      const vigenteComponente =
        componenteByCodigo.get(vigente.codigo_componente) ?? null;

      const columns = items
        .filter((a) => a.tabla_version === vigente.tabla_version)
        .sort((a, b) => a.orden - b.orden)
        .map((a) => {
          const el = elementoByCodigo.get(a.codigo_elemento_asociacion);
          return {
            uid: nextCatalogUid(),
            codigo_elemento_asociacion: a.codigo_elemento_asociacion,
            etiqueta: a.etiqueta,
            nombreElemento:
              el?.columna ?? `Elemento ${a.codigo_elemento_asociacion}`,
          };
        });

      const codigoTipoMedicion = Number(vigente.codigo_tipo_medicion) || 0;

      out.push({
        key: `${vigente.codigo_area_tipo_motivo}__${g.nombreLower}__${codigoTipoMedicion}__${vigente.codigo_componente}`,
        nombre: g.nombreOriginal,
        latestVersion: vigente.tabla_version,
        columnCount: columns.length,
        area,
        motivo: g.motivo,
        atm: g.atm,
        componente: vigenteComponente,
        codigo_tipo_medicion: codigoTipoMedicion,
        tipoMedicion: tipoMedicionByCodigo.get(codigoTipoMedicion) ?? null,
        versions: items,
        columns,
      });
    }

    out.sort((a, b) => {
      const aName = a.area?.nombre_area ?? "";
      const bName = b.area?.nombre_area ?? "";
      if (aName !== bName) return aName.localeCompare(bName);
      return a.nombre.localeCompare(b.nombre);
    });

    return out;
  }, [
    asociaciones,
    atmByCodigo,
    motivoByCodigo,
    areaByCodigo,
    componenteByCodigo,
    elementoByCodigo,
    tipoMedicionByCodigo,
  ]);

  // ===== Vista por ÁREA =====
  /**
   * Estructura final del catálogo:
   *   AreaGroup {
   *     area: Area,
   *     tablas: ExistingTable[], // tablas de esta área (filtradas)
   *     atmCount: number,        // motivos asociados (visual)
   *   }
   *
   * Reglas:
   *   - SIEMPRE se muestran todas las áreas activas (tengan o no tablas).
   *   - Las áreas sin tablas se renderizan con su grid vacía + CTA
   *     "Asociar nueva tabla" precargada al área.
   */
  const areasAgrupadas = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const out: Array<{ area: Area; tablas: ExistingTable[] }> = [];

    for (const a of areas) {
      // Filtrar tablas del área que matchean el texto
      const tablasDelArea = tablas.filter((t) => {
        const matchArea = t.atm?.codigo_area === a.codigo_area;
        if (!matchArea) return false;
        if (!f) return true;
        return (
          t.nombre.toLowerCase().includes(f) ||
          (t.motivo?.nombre_tipo_motivo.toLowerCase().includes(f) ?? false) ||
          (t.componente?.nombre_componente.toLowerCase().includes(f) ?? false)
        );
      });

      const matchAreaFiltro =
        !f ||
        a.nombre_area.toLowerCase().includes(f) ||
        (a.regional?.toLowerCase().includes(f) ?? false);

      if (!matchAreaFiltro && tablasDelArea.length === 0) continue;

      out.push({ area: a, tablas: tablasDelArea });
    }

    // Orden alfabético por nombre de área
    out.sort((x, y) =>
      x.area.nombre_area.localeCompare(y.area.nombre_area)
    );
    return out;
  }, [areas, tablas, filter]);

  const totalTablasMostradas = areasAgrupadas.reduce(
    (acc, g) => acc + g.tablas.length,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Catálogo de tablas por área
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Cada área muestra las tablas asociadas a sus motivos. Haz clic en
              una tarjeta para ver el esquema (fija + dinámica). Usa{" "}
              <strong>Asociar nueva tabla</strong> para crear una dentro de un
              área.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filtrar por área, motivo, componente o nombre de tabla..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {totalTablasMostradas} tabla
              {totalTablasMostradas === 1 ? "" : "s"}
            </Badge>
            <span>·</span>
            <span>
              {areasAgrupadas.length} área{areasAgrupadas.length === 1 ? "" : "s"}
            </span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando catálogo...
          </CardContent>
        </Card>
      ) : areasAgrupadas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-sm text-muted-foreground text-center">
            {filter
              ? "No hay áreas o tablas que coincidan con el filtro."
              : "Aún no hay áreas activas configuradas."}
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={areasAgrupadas.map((g) => `area-${g.area.codigo_area}`)}
          className="w-full space-y-3 mx-1"
        >
          {areasAgrupadas.map((group) => {
            const { area, tablas: tablasDelArea } = group;
            const totalColumnas = tablasDelArea.reduce(
              (acc, t) => acc + t.columnCount,
              0
            );
            return (
              <AccordionItem
                key={area.codigo_area}
                value={`area-${area.codigo_area}`}
                className="border-2 rounded-xl bg-card shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-slate-50/60 transition-colors rounded-t-xl">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Building2 className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-semibold truncate">
                      {area.nombre_area}
                    </span>
                    {area.regional && (
                      <Badge variant="outline" className="shrink-0">
                        {area.regional}
                      </Badge>
                    )}
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">
                        {tablasDelArea.length} tabla
                        {tablasDelArea.length === 1 ? "" : "s"}
                      </Badge>
                      {totalColumnas > 0 && (
                        <Badge variant="outline">
                          {totalColumnas} columna
                          {totalColumnas === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-1">
                  <div className="flex flex-col gap-3">
                    {/* CTA por área: Asociar nueva tabla precargada */}
                    <div className="flex items-center justify-between gap-2 px-2 pt-1">
                      <p className="text-xs text-muted-foreground">
                        {tablasDelArea.length === 0
                          ? "Esta área aún no tiene tablas. Crea la primera."
                          : "Agrega una nueva tabla a esta área."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        onClick={() => onCreateNew(area)}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Asociar nueva tabla
                      </Button>
                    </div>

                    {tablasDelArea.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-8 px-4 border border-dashed rounded-lg bg-muted/20">
                        <TableIcon className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Sin tablas asociadas todavía.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2 pb-2">
                        {tablasDelArea.map((t) => (
                          <Card
                            key={t.key}
                            role="button"
                            tabIndex={0}
                            className="hover:border-primary/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => onViewTable(t)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onViewTable(t);
                              }
                            }}
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p
                                    className="font-semibold text-sm truncate"
                                    title={t.nombre}
                                  >
                                    {t.nombre}
                                  </p>
                                  <Badge
                                    variant="default"
                                    className="bg-primary shrink-0"
                                  >
                                    v{t.latestVersion}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t.columnCount} columna
                                  {t.columnCount === 1 ? "" : "s"}
                                  <span className="mx-1">·</span>
                                  <span className="text-primary/80">
                                    Clic para ver
                                  </span>
                                </p>
                              </div>

                              <div className="text-xs space-y-0.5">
                                {t.motivo && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Motivo:
                                    </span>{" "}
                                    {t.motivo.nombre_tipo_motivo}
                                  </p>
                                )}
                                {t.componente && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Componente:
                                    </span>{" "}
                                    {t.componente.nombre_componente}
                                  </p>
                                )}
                                {t.tipoMedicion && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Tipo medición:
                                    </span>{" "}
                                    {t.tipoMedicion.nombre_tipo_medicion}
                                  </p>
                                )}
                                {t.versions.length > 1 && (
                                  <p className="text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Versiones:
                                    </span>{" "}
                                    {t.versions
                                      .map((v) => v.tabla_version)
                                      .filter(
                                        (v, i, arr) => arr.indexOf(v) === i
                                      )
                                      .sort((a, b) => b - a)
                                      .join(", ")}
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTable(t);
                                  }}
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onReplicateTable(t);
                                  }}
                                  disabled={!t.componente || !t.atm}
                                  title={
                                    !t.componente || !t.atm
                                      ? "La tabla necesita área/motivo y componente para replicarse"
                                      : "Replicar tabla en otro área/motivo"
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Replicar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}