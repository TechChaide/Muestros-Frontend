"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Copy,
  Edit3,
  Eye,
  ListTree,
  Lock,
  Sparkles,
  Table as TableIcon,
} from "lucide-react";
import type { Subcomponentes } from "@/types/interfaces";
import { subcomponentesService } from "@/services/seguridades/subcomponentes.service";
import type { ExistingTable } from "./tables-catalog";

/** Columnas fijas de `registro` que el inspector ve en captura. */
const FIXED_COLUMNS: ReadonlyArray<{
  key: string;
  label: string;
  resolve: (t: ExistingTable) => string;
}> = [
  {
    key: "departamento",
    label: "Departamento",
    resolve: (t) => t.area?.nombre_area ?? "—",
  },
  {
    key: "motivo",
    label: "Motivo",
    resolve: (t) => t.motivo?.nombre_tipo_motivo ?? "—",
  },
  {
    key: "origen",
    label: "Origen",
    resolve: () => "(captura)",
  },
  {
    key: "componente",
    label: "Componente",
    resolve: (t) => t.componente?.nombre_componente ?? "—",
  },
  {
    key: "causa_defecto",
    label: "Causa defecto",
    resolve: () => "(captura)",
  },
  {
    key: "maquina",
    label: "Máquina",
    resolve: () => "(captura)",
  },
  {
    key: "material",
    label: "Material",
    resolve: () => "(captura)",
  },
  {
    key: "comodin",
    label: "Comodín",
    resolve: () => "(captura)",
  },
];

interface TableViewProps {
  table: ExistingTable;
  onBack: () => void;
  onEdit: (table: ExistingTable) => void;
  onReplicate: (table: ExistingTable) => void;
}

/**
 * Vista de solo lectura de una tabla configurada.
 * Una sola fila horizontal: columnas fijas de `registro` + columnas
 * dinámicas de `asociacion`. Si una dinámica tiene subcomponentes,
 * se muestra un combobox (preview).
 */
export default function TableView({
  table,
  onBack,
  onEdit,
  onReplicate,
}: TableViewProps) {
  const orderedDynamic = table.columns;
  const elementosKey = orderedDynamic
    .map((c) => c.codigo_elemento_asociacion)
    .join(",");

  /** codigo_elemento_asociacion → subcomponentes activos */
  const [subsByElemento, setSubsByElemento] = useState<
    Record<number, Subcomponentes[]>
  >({});
  const [subsLoading, setSubsLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const codigos = [
      ...new Set(
        elementosKey
          .split(",")
          .map((x) => Number(x))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];

    if (codigos.length === 0) {
      setSubsByElemento({});
      setSubsLoading({});
      return;
    }

    const loadingInit: Record<number, boolean> = {};
    for (const codigo of codigos) loadingInit[codigo] = true;
    setSubsLoading(loadingInit);
    setSubsByElemento({});

    for (const codigo of codigos) {
      subcomponentesService
        .getSubcomponentesByCodigoElementoAsociacion(codigo)
        .then((res) => {
          if (cancelled) return;
          const subs = ((res.data || []) as Subcomponentes[]).filter(
            (s) => s.estado === "A",
          );
          setSubsByElemento((m) => ({ ...m, [codigo]: subs }));
        })
        .catch(() => {
          if (cancelled) return;
          setSubsByElemento((m) => ({ ...m, [codigo]: [] }));
        })
        .finally(() => {
          if (cancelled) return;
          setSubsLoading((m) => ({ ...m, [codigo]: false }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [table.key, elementosKey]);

  const comboCount = orderedDynamic.filter((c) => {
    const subs = subsByElemento[c.codigo_elemento_asociacion];
    return Array.isArray(subs) && subs.length > 0;
  }).length;

  return (
    <div className="flex flex-col gap-4 pt-3 min-w-0">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Vista de tabla</span>
              <Badge variant="secondary" className="shrink-0">
                v{table.latestVersion}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configuración de captura: campos fijos de{" "}
              <code className="font-mono text-xs">registro</code> + columnas
              dinámicas de{" "}
              <code className="font-mono text-xs">asociacion</code>, en una
              sola fila. Las dinámicas con subcomponentes se muestran como
              combobox.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBack}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onEdit(table)}
            >
              <Edit3 className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => onReplicate(table)}
              disabled={!table.componente || !table.atm}
            >
              <Copy className="h-4 w-4" />
              Replicar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <MetaChip label="Nombre" value={table.nombre} />
            <MetaChip
              label="Área"
              value={table.area?.nombre_area ?? "—"}
            />
            <MetaChip
              label="Motivo"
              value={table.motivo?.nombre_tipo_motivo ?? "—"}
            />
            <MetaChip
              label="Componente"
              value={table.componente?.nombre_componente ?? "—"}
            />
            <MetaChip
              label="Tipo medición"
              value={
                table.tipoMedicion?.nombre_tipo_medicion ??
                (table.codigo_tipo_medicion
                  ? `cód. ${table.codigo_tipo_medicion}`
                  : "—")
              }
            />
            <MetaChip
              label="Columnas dinámicas"
              value={`${table.columnCount}${comboCount > 0 ? ` · ${comboCount} combo` : ""}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <TableIcon className="h-4 w-4 text-primary" />
            Esquema de captura (una fila)
            <Badge variant="outline" className="gap-1 font-normal">
              <Lock className="h-3 w-3" />
              {FIXED_COLUMNS.length} fijas
            </Badge>
            <Badge
              variant="outline"
              className="gap-1 font-normal border-primary/40 text-primary"
            >
              <Sparkles className="h-3 w-3" />
              {orderedDynamic.length} dinámicas
            </Badge>
            {comboCount > 0 && (
              <Badge variant="outline" className="gap-1 font-normal">
                <ListTree className="h-3 w-3" />
                {comboCount} con subcomponentes
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Solo lectura / preview. Los combobox muestran las opciones
            reales de subcomponentes; el resto son placeholders de captura.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {FIXED_COLUMNS.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "whitespace-nowrap bg-muted/50 text-[11px] uppercase tracking-wide",
                        "border-r border-border/60 min-w-[120px]",
                      )}
                    >
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Lock className="h-3 w-3 shrink-0" />
                        {col.label}
                      </span>
                    </TableHead>
                  ))}
                  {orderedDynamic.map((col, idx) => {
                    const subs =
                      subsByElemento[col.codigo_elemento_asociacion];
                    const hasCombo =
                      Array.isArray(subs) && subs.length > 0;
                    return (
                      <TableHead
                        key={col.uid}
                        className={cn(
                          "whitespace-nowrap bg-primary/5 text-[11px] uppercase tracking-wide",
                          "min-w-[160px]",
                          idx < orderedDynamic.length - 1 &&
                            "border-r border-primary/20",
                        )}
                      >
                        <span className="inline-flex items-center gap-1 text-primary">
                          {hasCombo ? (
                            <ListTree className="h-3 w-3 shrink-0" />
                          ) : (
                            <Sparkles className="h-3 w-3 shrink-0" />
                          )}
                          {col.etiqueta || col.nombreElemento}
                        </span>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  {FIXED_COLUMNS.map((col) => {
                    const value = col.resolve(table);
                    const isPlaceholder = value.startsWith("(");
                    return (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "align-middle border-r border-border/60 text-sm",
                          isPlaceholder && "text-muted-foreground italic",
                        )}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                  {orderedDynamic.map((col, idx) => {
                    const codigo = col.codigo_elemento_asociacion;
                    const loading = subsLoading[codigo] ?? true;
                    const subs = subsByElemento[codigo] ?? [];
                    const hasCombo = !loading && subs.length > 0;

                    return (
                      <TableCell
                        key={col.uid}
                        className={cn(
                          "align-middle min-w-[160px]",
                          idx < orderedDynamic.length - 1 &&
                            "border-r border-primary/20",
                        )}
                        title={
                          col.nombreElemento
                            ? `Elemento: ${col.nombreElemento}`
                            : undefined
                        }
                      >
                        {loading ? (
                          <Skeleton className="h-8 w-full" />
                        ) : hasCombo ? (
                          <Select>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue
                                placeholder={`Elegir (${subs.length})`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {subs.map((s) => (
                                <SelectItem
                                  key={s.codigo_subcomponente}
                                  value={String(s.codigo_subcomponente)}
                                >
                                  {s.descripcion}
                                  {s.puesto_trabajo
                                    ? ` · ${s.puesto_trabajo}`
                                    : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            (valor muestra)
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {orderedDynamic.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground text-center py-4">
              Esta tabla no tiene columnas dinámicas configuradas.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-muted border" />
              Fijas (<code className="font-mono">registro</code>)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-primary/15 border border-primary/30" />
              Dinámicas input
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ListTree className="h-3.5 w-3.5 text-primary" />
              Dinámicas con subcomponentes (combobox)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5 min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium truncate text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
