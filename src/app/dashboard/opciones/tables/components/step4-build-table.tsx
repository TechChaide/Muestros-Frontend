"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Sparkles, Layers } from "lucide-react";
import type {
  ElementoAsociacion,
  TipoMedicion,
  TipoMotivo,
} from "@/types/interfaces";
import { elementoAsociacionService } from "@/services/seguridades/elementoAsociacion.service";
import { tipoMedicionService } from "@/services/seguridades/tipoMedicion.service";
import TablePreview, { type ColumnDef } from "./table-preview";

interface Step3BuildTableProps {
  motivo: TipoMotivo | null;
  columns: ColumnDef[];
  onChangeColumns: (columns: ColumnDef[]) => void;
  tableName: string;
  onChangeTableName: (name: string) => void;
  selectedTipoMedicion: TipoMedicion | null;
  onChangeTipoMedicion: (tipo: TipoMedicion | null) => void;
  /** Texto del paso (ej. "Paso 2 de 5"). */
  stepHint?: string;
  title?: string;
  description?: string;
  /** Si es false, oculta nombre y tipo de medición (ya definidos fuera). */
  showMetaFields?: boolean;
}

let uidCounter = 0;
const nextUid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  uidCounter += 1;
  return `col-${Date.now()}-${uidCounter}`;
};

export default function Step3BuildTable({
  motivo,
  columns,
  onChangeColumns,
  tableName,
  onChangeTableName,
  selectedTipoMedicion,
  onChangeTipoMedicion,
  stepHint = "Paso 4 de 5",
  title = "Construye la tabla",
  description,
  showMetaFields = true,
}: Step3BuildTableProps) {
  const { toast } = useToast();
  const [elements, setElements] = useState<ElementoAsociacion[]>([]);
  const [tiposMedicion, setTiposMedicion] = useState<TipoMedicion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [elRes, tmRes] = await Promise.all([
          elementoAsociacionService.getAll(),
          tipoMedicionService.getAll(),
        ]);
        if (cancelled) return;
        setElements(
          ((elRes.data || []) as ElementoAsociacion[]).filter(
            (el) => el.estado === "A"
          )
        );
        setTiposMedicion(
          ((tmRes.data || []) as TipoMedicion[]).filter((t) => t.estado === "A")
        );
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar los datos del diseñador.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filteredElements = useMemo(() => {
    if (!filter.trim()) return elements;
    const f = filter.toLowerCase();
    return elements.filter(
      (el) =>
        el.columna.toLowerCase().includes(f) ||
        el.descripcion.toLowerCase().includes(f)
    );
  }, [elements, filter]);

  const handleAdd = (el: ElementoAsociacion) => {
    onChangeColumns([
      ...columns,
      {
        uid: nextUid(),
        codigo_elemento_asociacion: el.codigo_elemento_asociacion,
        etiqueta: el.columna,
      },
    ]);
  };

  const handleRemove = (uid: string) => {
    onChangeColumns(columns.filter((c) => c.uid !== uid));
  };

  const handleReorder = (activeUid: string, overUid: string) => {
    if (activeUid === overUid) return;
    const oldIndex = columns.findIndex((c) => c.uid === activeUid);
    const newIndex = columns.findIndex((c) => c.uid === overUid);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...columns];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChangeColumns(next);
  };

  const handleRename = (uid: string, etiqueta: string) => {
    onChangeColumns(
      columns.map((c) => (c.uid === uid ? { ...c, etiqueta } : c))
    );
  };

  const resolvedDescription =
    description ??
    "Selecciona los elementos de asociación que formarán parte de la tabla. Puedes agregar el mismo elemento más de una vez; cada instancia es una columna independiente. Define un nombre, el tipo de medición y arrastra las columnas para reordenarlas.";

  return (
    <div className="space-y-6">
      <div>
        <span className="text-sm text-primary font-medium">{stepHint}</span>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {resolvedDescription}
        </p>
      </div>

      {showMetaFields && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="table-name"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Nombre de la tabla
          </Label>
          <Input
            id="table-name"
            value={tableName}
            onChange={(e) => onChangeTableName(e.target.value)}
            placeholder={`Ej. tabla_${motivo?.nombre_tipo_motivo?.toLowerCase().replace(/\s+/g, "_") ?? "tabla"}`}
          />
          <p className="text-xs text-muted-foreground">
            Este nombre se registrará en el campo{" "}
            <code className="font-mono">tabla</code> de la asociación.
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="tipo-medicion"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Tipo de medición
          </Label>
          <Select
            value={
              selectedTipoMedicion
                ? String(selectedTipoMedicion.codigo_tipo_medicion)
                : undefined
            }
            onValueChange={(value) => {
              const found =
                tiposMedicion.find(
                  (t) => String(t.codigo_tipo_medicion) === value
                ) ?? null;
              onChangeTipoMedicion(found);
            }}
          >
            <SelectTrigger id="tipo-medicion">
              <SelectValue placeholder="Seleccione un tipo de medición" />
            </SelectTrigger>
            <SelectContent>
              {tiposMedicion.map((t) => (
                <SelectItem
                  key={t.codigo_tipo_medicion}
                  value={String(t.codigo_tipo_medicion)}
                >
                  {t.nombre_tipo_medicion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            FK <code className="font-mono">codigo_tipo_medicion</code> en cada
            registro de asociación.
          </p>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 min-w-0">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Elementos disponibles
            </h3>
            <Badge variant="secondary">{elements.length}</Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filtrar..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Cargando...
            </p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredElements.map((el) => {
                const count = columns.filter(
                  (c) =>
                    c.codigo_elemento_asociacion ===
                    el.codigo_elemento_asociacion
                ).length;
                return (
                  <Card key={el.codigo_elemento_asociacion}>
                    <CardContent className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {el.columna}
                          </p>
                          {count > 0 && (
                            <Badge
                              variant="default"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              {count}×
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {el.descripcion}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdd(el)}
                        className="shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredElements.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No hay elementos que coincidan con el filtro.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Vista previa en vivo
            </h3>
            <Badge variant="outline">
              {columns.length} columna{columns.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-md border bg-muted/20 p-1">
            <TablePreview
              columns={columns}
              elements={elements}
              editable
              orientation="vertical"
              onReorder={handleReorder}
              onRemove={handleRemove}
              onRename={handleRename}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
