"use client";

import type { ElementoAsociacion } from "@/types/interfaces";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Hash, Pencil, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ColumnDef {
  /** Identificador único de la instancia de la columna (permite duplicados) */
  uid: string;
  /** código del elemento_asociacion al que apunta esta columna */
  codigo_elemento_asociacion: number;
  /** etiqueta = nombre visible de la columna en la tabla */
  etiqueta: string;
}

export type TablePreviewOrientation = "horizontal" | "vertical";

interface TablePreviewProps {
  /** Columnas ordenadas (el orden del array = posición en la tabla/lista) */
  columns: ColumnDef[];
  /** Catálogo completo de elementos disponibles, para resolver el nombre */
  elements: ElementoAsociacion[];
  /** Modo edición: muestra controles para reordenar/eliminar/renombrar */
  editable?: boolean;
  /**
   * Orientación del layout.
   *  - "horizontal" (default): tabla con scroll horizontal (usar para vista
   *    final/Paso 5 donde la tabla es la representación final).
   *  - "vertical": lista apilada con una fila por columna, drag & drop
   *    vertical (usar en el editor/Paso 4 para construir la tabla).
   */
  orientation?: TablePreviewOrientation;
  /** Drag & drop: reordenar columnas (recibe uid origen y uid destino) */
  onReorder?: (activeUid: string, overUid: string) => void;
  /** Elimina una columna (por uid) */
  onRemove?: (uid: string) => void;
  /** Edita la etiqueta de una columna (por uid) */
  onRename?: (uid: string, etiqueta: string) => void;
}

export default function TablePreview({
  columns,
  elements,
  editable = false,
  orientation = "horizontal",
  onReorder,
  onRemove,
  onRename,
}: TablePreviewProps) {
  const elementMap = new Map<number, ElementoAsociacion>();
  elements.forEach((el) => elementMap.set(el.codigo_elemento_asociacion, el));

  // DnD sensors (mouse + teclado)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder?.(String(active.id), String(over.id));
  };

  if (columns.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-slate-100 p-3 mb-3">
            <Hash className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Aún no has agregado columnas a la tabla
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {editable
              ? "Selecciona elementos del panel lateral para añadirlos como columnas."
              : "La tabla no contiene columnas."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {orientation === "vertical" ? (
        <VerticalPreview
          columns={columns}
          elementMap={elementMap}
          editable={editable}
          onRename={onRename}
          onRemove={onRemove}
        />
      ) : (
        <HorizontalPreview
          columns={columns}
          elementMap={elementMap}
          editable={editable}
          onRename={onRename}
          onRemove={onRemove}
        />
      )}
    </DndContext>
  );
}

// =====================================================================
// Vista VERTICAL — usada en el editor (Paso 4)
// =====================================================================

interface VerticalPreviewProps {
  columns: ColumnDef[];
  elementMap: Map<number, ElementoAsociacion>;
  editable: boolean;
  onRename?: (uid: string, etiqueta: string) => void;
  onRemove?: (uid: string) => void;
}

function VerticalPreview({
  columns,
  elementMap,
  editable,
  onRename,
  onRemove,
}: VerticalPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <SortableContext
          items={columns.map((c) => c.uid)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="divide-y">
            {columns.map((col, idx) => {
              const el = elementMap.get(col.codigo_elemento_asociacion);
              return (
                <VerticalColumnRow
                  key={col.uid}
                  col={col}
                  idx={idx}
                  elementName={
                    el?.columna ?? `Elemento ${col.codigo_elemento_asociacion}`
                  }
                  elementDescription={el?.descripcion ?? null}
                  editable={editable}
                  onRename={onRename}
                  onRemove={onRemove}
                />
              );
            })}
          </ul>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

interface VerticalColumnRowProps {
  col: ColumnDef;
  idx: number;
  elementName: string;
  elementDescription: string | null;
  editable: boolean;
  onRename?: (uid: string, etiqueta: string) => void;
  onRemove?: (uid: string) => void;
}

function VerticalColumnRow({
  col,
  idx,
  elementName,
  elementDescription,
  editable,
  onRename,
  onRemove,
}: VerticalColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-2 px-3 py-3 bg-card",
        isDragging && "bg-primary/5 ring-2 ring-primary shadow-lg z-10"
      )}
    >
      {/* Handle de arrastre */}
      {editable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          title="Arrastra para reordenar"
          className={cn(
            "flex items-center justify-center w-8 rounded-md border bg-slate-50",
            "cursor-grab active:cursor-grabbing select-none",
            "text-muted-foreground hover:text-foreground hover:bg-slate-100"
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {/* Número de orden */}
      <div className="flex items-center justify-center w-10 shrink-0 rounded-md bg-primary/10 text-primary font-mono font-semibold text-sm">
        #{idx + 1}
      </div>

      {/* Contenido: nombre del elemento + etiqueta */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] uppercase tracking-wide"
          >
            {elementName}
          </Badge>
          {elementDescription && (
            <span className="text-xs text-muted-foreground truncate min-w-0">
              {elementDescription}
            </span>
          )}
        </div>

        {editable ? (
          <div className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
            <Input
              value={col.etiqueta}
              onChange={(e) => onRename?.(col.uid, e.target.value)}
              placeholder="Etiqueta de la columna"
              className="h-7 text-xs"
            />
          </div>
        ) : (
          <span className="text-sm font-semibold text-foreground truncate">
            {col.etiqueta}
          </span>
        )}
      </div>

      {/* Botón eliminar */}
      {editable && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
          onClick={() => onRemove?.(col.uid)}
          aria-label="Eliminar columna"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}

// =====================================================================
// Vista HORIZONTAL — usada en la vista final (Paso 5 / Vista rápida)
// =====================================================================

interface HorizontalPreviewProps {
  columns: ColumnDef[];
  elementMap: Map<number, ElementoAsociacion>;
  editable: boolean;
  onRename?: (uid: string, etiqueta: string) => void;
  onRemove?: (uid: string) => void;
}

function HorizontalPreview({
  columns,
  elementMap,
  editable,
  onRename,
  onRemove,
}: HorizontalPreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* El Card ya tiene un overflow-x-auto en el padre (Paso 5 / vista
            rápida); este div interno evita el "salto" inicial y mantiene
            el scroll horizontal localizado. */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <SortableContext
                  items={columns.map((c) => c.uid)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((col, idx) => (
                    <SortableHeaderCell
                      key={col.uid}
                      col={col}
                      idx={idx}
                      elementName={
                        elementMap.get(col.codigo_elemento_asociacion)?.columna ??
                        `Elemento ${col.codigo_elemento_asociacion}`
                      }
                      editable={editable}
                      onRename={onRename}
                      onRemove={onRemove}
                    />
                  ))}
                </SortableContext>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {columns.map((col) => (
                  <TableCell
                    key={col.uid}
                    className="text-center text-xs text-muted-foreground italic align-middle"
                  >
                    —
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface SortableHeaderCellProps {
  col: ColumnDef;
  idx: number;
  elementName: string;
  editable: boolean;
  onRename?: (uid: string, etiqueta: string) => void;
  onRemove?: (uid: string) => void;
}

function SortableHeaderCell({
  col,
  idx,
  elementName,
  editable,
  onRename,
  onRemove,
}: SortableHeaderCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        // w-[140px]: ancho fijo moderado para que las celdas sean
        // predecibles pero NO se desborden cuando hay muchas columnas.
        // min-w-[120px]: garantiza legibilidad mínima incluso con
        // etiquetas muy cortas.
        "text-center align-middle w-[140px] min-w-[120px] border-r last:border-r-0 p-0",
        isDragging && "bg-primary/5 ring-2 ring-primary/40"
      )}
    >
      <div className="flex items-stretch">
        {editable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar columna"
            title="Arrastra para reordenar"
            className={cn(
              "flex items-center justify-center px-1.5 border-r bg-slate-100/60",
              "cursor-grab active:cursor-grabbing select-none",
              "text-muted-foreground hover:text-foreground hover:bg-slate-200/80"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 flex flex-col items-center gap-2 py-1 px-3">
          <div className="flex items-center gap-1.5 w-full justify-center">
            <span className="text-[10px] font-mono text-muted-foreground">
              #{idx + 1}
            </span>
            <span
              className="text-[10px] uppercase tracking-wide text-muted-foreground truncate max-w-[140px]"
              title={elementName}
            >
              {elementName}
            </span>
          </div>

          {editable ? (
            <div className="flex items-center gap-1 w-full">
              <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
              <Input
                value={col.etiqueta}
                onChange={(e) => onRename?.(col.uid, e.target.value)}
                placeholder="Etiqueta"
                className="h-7 text-xs text-center font-semibold"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                onClick={() => onRemove?.(col.uid)}
                aria-label="Eliminar columna"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <span className="text-sm font-semibold text-foreground">
              {col.etiqueta}
            </span>
          )}
        </div>
      </div>
    </TableHead>
  );
}