"use client";

/**
 * Card de máquinas aplicables al área seleccionada.
 *
 * Sigue el mismo patrón visual que el flujo CONSULTA/ESCANEO del
 * `step5-capturar-paroM`:
 *
 *   1. TABLA con radios
 *      Una fila por máquina de `getMaquinasMantenimiento`.
 *      El inspector marca la fila que aplica a su paro y, al hacerlo,
 *      se copia el nombre al input fijo "Máquina" (bloqueado).
 *
 *   2. CARD DE DETALLE (debajo de la tabla)
 *      Una vez seleccionada una máquina, se renderiza un card con
 *      TODAS sus propiedades como campos drag & drop. Cada propiedad
 *      se puede arrastrar al input "Máquina" de la parte fija.
 *
 * El id del draggable sigue el formato:
 *   `maquina:<campo>:<id_maq>`
 *
 * De esta forma, `handleDragEndOrden` en step5 distingue claramente
 * un drag de orden (`orden:<...>`) de un drag de máquina
 * (`maquina:<...>`).
 *
 * Eventos que recibe del padre:
 *   - `onMaquinasChange(maquinas)` → expone la lista cargada para que
 *     el handler de drop pueda resolver `id_maq → fila → valor`.
 *   - `onMaquinaSeleccionadaChange(maquina)` → expone la fila que el
 *     usuario eligió, por si el padre la quiere persistir/mostrar.
 */

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Database,
  GripVertical,
  Hammer,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Maquina, MaquinasMantenimiento } from "@/types/interfaces";
import { serviciosMuestreosService } from "@/services/seguridades/serviciosMuestreos.service";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Campos del objeto `Maquina` que se muestran como drag & drop en el
 * card de detalle. El `key` debe coincidir con la propiedad REAL del
 * objeto que devuelve el SP `getMaquinasParos`.
 *
 * IMPORTANTE: el `key` también forma parte del id del draggable
 * (`maquina:<key>:<id_maq>`), así que cualquier cambio aquí debe
 * replicarse en el handler de drop del step5.
 */
const maquinaFields: Array<{
  key: keyof Maquina;
  label: string;
}> = [
  { key: "id_maq", label: "ID" },
  { key: "maquina", label: "Máquina" },
  { key: "componente", label: "Componente" },
  { key: "actividad", label: "Actividad" },
  { key: "regional", label: "Regional" },
];

/**
 * Tamaño de página del paginador. Permite al inspector elegir cuántos
 * registros ver por hoja (5 / 10 / 15 / 25), igual que en la tabla
 * CONSULTA del step5-capturar-paroM.
 */
const PAGE_SIZE_OPTIONS = [5, 10, 15, 25] as const;
const DEFAULT_PAGE_SIZE = 5;

/**
 * Prefijo del id de los draggables de máquinas. Lo centralizamos para
 * que `DraggableMaquinaField` y `handleDragEndOrden` (en step5) usen
 * exactamente el mismo origen y evitar magic strings.
 */
export const DRAG_MAQUINA_PREFIX = "maquina";

/**
 * Lista de variantes del nombre del campo "componente" que el backend
 * puede devolver. El nombre canónico actual es `componente`, pero el
 * SP `getMaquinasParos` ha devuelto typos en despliegues anteriores
 * (`componenete`, `componenente`).
 *
 * Para no romper el render si el backend vuelve a cambiar el nombre,
 * usamos un lookup tolerante que prueba cada variante y devuelve la
 * primera que tenga un valor no vacío.
 *
 * Si tu backend ya está estable en `componente`, podés quitar las
 * demás variantes — está pensado para que funcione sin tocar el
 * código cada vez que el backend cambia el nombre del campo.
 */
const COMPONENTE_KEY_VARIANTS = [
  "componente",
  "componenete",
  "componenente",
] as const;

/**
 * Devuelve el valor del campo "componente" de una máquina probando
 * todas las variantes conocidas. Si ninguna tiene valor, devuelve "".
 *
 * Esto evita que la celda salga vacía en pantalla solo porque el
 * backend cambió una letra del nombre.
 *
 * Se exporta para que el handler de drop en `step5-capturar-paroM`
 * pueda leer el campo sin duplicar la lista de variantes.
 */
export function readComponente(
  m: Maquina | Record<string, unknown>
): string {
  const obj = m as unknown as Record<string, unknown>;
  for (const k of COMPONENTE_KEY_VARIANTS) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

const DEPARTAMENTO_KEY_VARIANTS = [
  "departamento",
  "DEPARTAMENTO",
  "area",
  "Area",
  "nombre_area",
  "origen",
  "Origen",
  "actividad",
] as const;

/** Lee el departamento/área de una máquina (nombres variables del SP). */
export function readDepartamento(
  m: Maquina | Record<string, unknown>
): string {
  const obj = m as unknown as Record<string, unknown>;
  for (const k of DEPARTAMENTO_KEY_VARIANTS) {
    const v = obj[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

const ALL_FILTER = "__all__";

const REGIONAL_EQUIV: Record<string, string[]> = {
  uio: ["uio", "quito"],
  quito: ["uio", "quito"],
  gye: ["gye", "guayaquil"],
  guayaquil: ["gye", "guayaquil"],
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function valuesMatch(a: string, b: string): boolean {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const eqA = REGIONAL_EQUIV[na] ?? [na];
  const eqB = REGIONAL_EQUIV[nb] ?? [nb];
  return eqA.some((x) => eqB.includes(x));
}

function uniqueSorted(values: string[]): string[] {
  const set = new Set(
    values.map((v) => v.trim()).filter((v) => v.length > 0),
  );
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function pickDefaultOption(
  options: string[],
  preferred?: string | null,
): string {
  const p = (preferred ?? "").trim();
  if (!p) return ALL_FILTER;
  const found = options.find((o) => valuesMatch(o, p));
  return found ?? p;
}

interface MaquinasCardProps {
  /**
   * Regional del área elegida en el paso 1. Prellena el select;
   * el usuario puede cambiarlo.
   */
  defaultRegional?: string | null;
  /**
   * Departamento (nombre de área) del paso 1. Prellena el select;
   * el usuario puede cambiarlo.
   */
  defaultDepartamento?: string | null;
  /**
   * @deprecated Usar `defaultDepartamento`. Se mantiene por compatibilidad.
   */
  nombreArea?: string | null;
  onMaquinasChange?: (maquinas: Maquina[]) => void;
  onMaquinaSeleccionadaChange?: (maquina: Maquina | null) => void;
}

/**
 * Tarjeta arrastrable de un campo individual del objeto `Maquina`
 * (por ejemplo, el valor "Máquina" o "Componente").
 *
 * Mismas reglas para móvil que `DraggableField` del flujo CONSULTA:
 *  - `touch-action: none` en el elemento con `listeners` (crítico).
 *  - `user-select: none` para evitar selección de texto en Android/iOS.
 *  - `listeners` en el mismo elemento que `setNodeRef` (toda la tarjeta
 *    es arrastrable, no solo el handle).
 *
 * Se renderiza SOLO en el card de detalle (debajo de la tabla), una vez
 * que el inspector eligió una fila con el radio.
 */
function DraggableMaquinaField({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : 1,
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-primary/5 px-2 py-1.5 text-xs",
        "border-primary/30 transition-shadow select-none",
        "hover:bg-primary/10 hover:border-primary/60 hover:shadow-sm",
        isDragging
          ? "shadow-lg ring-2 ring-primary/50 cursor-grabbing bg-primary/15"
          : "cursor-grab"
      )}
    >
      <GripVertical
        className="h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-primary/80 font-semibold">
          {label}
        </p>
        <p className="font-mono truncate text-foreground" title={value || "—"}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/**
 * Card principal.
 *
 * Comportamiento:
 *  - Si no hay `nombreArea`, muestra un placeholder amigable.
 *  - Si hay `nombreArea`, dispara el fetch (con cleanup por si el
 *    usuario cambia de área a mitad de carga).
 *  - Muestra skeleton durante la carga, errores con botón "Reintentar"
 *    y la tabla cuando hay resultados.
 *  - Cuando NO hay máquinas, muestra un empty-state explícito.
 *
 * Cada fila de la tabla es una "mini-tarjeta" con los campos
 * arrastrables (igual que el card de orden en CONSULTA).
 */
export function MaquinasCard({
  defaultRegional = null,
  defaultDepartamento = null,
  nombreArea = null,
  onMaquinasChange,
  onMaquinaSeleccionadaChange,
}: MaquinasCardProps) {
  const [maquinas, setMaquinas] = React.useState<Maquina[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Versión incremental que usamos en el `useEffect` para detectar
  // cambios de `nombreArea` y abortar fetches viejos (evita el bug
  // clásico de "respuesta tardía que pisa la respuesta nueva").
  const requestSeqRef = React.useRef(0);

  const load = React.useCallback(async () => {
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await serviciosMuestreosService.getMaquinasMantenimiento();
      if (seq !== requestSeqRef.current) return;
      const filas = (res?.data ?? []) as MaquinasMantenimiento[];
      setMaquinas(filas as Maquina[]);
      setSelectedId(null);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      const msg =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las máquinas de mantenimiento.";
      setErrorMsg(msg);
      toast({
        title: "Error al cargar máquinas",
        description: msg,
        variant: "destructive",
      });
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  /**
   * Notificamos al padre cada vez que cambia la lista para que pueda
   * resolver el `id_maq` del draggable durante el drop. Usamos un
   * `useEffect` separado para no acoplar la carga con el callback.
   */
  React.useEffect(() => {
    onMaquinasChange?.(maquinas);
  }, [maquinas, onMaquinasChange]);

  /**
   * Cada vez que cambia `selectedId`, buscamos la fila completa en la
   * lista y la enviamos al padre. `null` cuando no hay selección.
   */
  React.useEffect(() => {
    const fila =
      selectedId == null
        ? null
        : maquinas.find((m) => m.id_maq === selectedId) ?? null;
    onMaquinaSeleccionadaChange?.(fila);
  }, [selectedId, maquinas, onMaquinaSeleccionadaChange]);

  const selectedMaquina = React.useMemo(
    () =>
      selectedId == null
        ? null
        : maquinas.find((m) => m.id_maq === selectedId) ?? null,
    [selectedId, maquinas]
  );

  // ===== Paginador (mismo patrón que la tabla CONSULTA del step5) =====
  /**
   * `filter` permite buscar por máquina o componente (case-insensitive).
   * `page` y `rowsPerPage` controlan la paginación cliente.
   *
   * Cuando el usuario cambia el filtro o el área, reseteamos `page` a 1
   * para evitar quedarse en una página fuera de rango.
   */
  const [filter, setFilter] = React.useState("");
  const [filterRegional, setFilterRegional] = React.useState(ALL_FILTER);
  const [filterDepartamento, setFilterDepartamento] =
    React.useState(ALL_FILTER);
  const [page, setPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] =
    React.useState<number>(DEFAULT_PAGE_SIZE);
  const filtersReadyRef = React.useRef(false);

  const preferredDepartamento = defaultDepartamento || nombreArea || "";

  const regionalOptions = React.useMemo(
    () => uniqueSorted(maquinas.map((m) => String(m.regional ?? ""))),
    [maquinas],
  );

  const departamentoOptions = React.useMemo(
    () => uniqueSorted(maquinas.map((m) => readDepartamento(m))),
    [maquinas],
  );

  React.useEffect(() => {
    if (filtersReadyRef.current || maquinas.length === 0) return;
    filtersReadyRef.current = true;
    setFilterRegional(pickDefaultOption(regionalOptions, defaultRegional));
    setFilterDepartamento(
      pickDefaultOption(departamentoOptions, preferredDepartamento),
    );
    setPage(1);
  }, [
    maquinas,
    regionalOptions,
    departamentoOptions,
    defaultRegional,
    preferredDepartamento,
  ]);

  React.useEffect(() => {
    setPage(1);
  }, [maquinas]);

  const filteredMaquinas = React.useMemo(() => {
    const text = filter.trim().toLowerCase();
    return maquinas.filter((m) => {
      if (
        filterRegional !== ALL_FILTER &&
        !valuesMatch(String(m.regional ?? ""), filterRegional)
      ) {
        return false;
      }
      if (
        filterDepartamento !== ALL_FILTER &&
        !valuesMatch(readDepartamento(m), filterDepartamento)
      ) {
        return false;
      }
      if (!text) return true;
      const maq = String(m.maquina ?? "").toLowerCase();
      const comp = readComponente(m).toLowerCase();
      return maq.includes(text) || comp.includes(text);
    });
  }, [maquinas, filter, filterRegional, filterDepartamento]);

  const totalRows = filteredMaquinas.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedMaquinas = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredMaquinas.slice(start, start + rowsPerPage);
  }, [filteredMaquinas, page, rowsPerPage]);

  /**
   * Si la fila seleccionada quedó fuera de la página actual tras
   * filtrar/paginar, mantenemos `selectedId` pero igualamos el card
   * de detalle (que sigue mostrando la fila completa, porque se
   * resuelve desde `maquinas`, no desde `paginatedMaquinas`).
   * Esto evita el bug clásico de "selección desaparece al filtrar".
   */

  // ─────────────────────────────── Render ───────────────────────────────

  // 1. Cargando.
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Cargando máquinas de mantenimiento…</span>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 2. Error.
  if (errorMsg) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="flex items-center justify-between gap-3 py-4 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 3. Sin resultados.
  if (maquinas.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
          <Hammer className="h-5 w-5 shrink-0" />
          <span>No hay máquinas de mantenimiento registradas.</span>
        </CardContent>
      </Card>
    );
  }

  // 5. Tabla con radios + card de detalle drag & drop.
  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hammer className="h-3.5 w-3.5" />
            <span>
              <strong>{maquinas.length}</strong> máquina
              {maquinas.length === 1 ? "" : "s"} de mantenimiento — marca
              una fila para llenar el campo <strong>Máquina</strong>.
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            className="gap-1"
            aria-label="Recargar máquinas"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recargar
          </Button>
        </div>

        {/* Buscador + filtros regional / departamento. */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Regional</Label>
              <Select
                value={filterRegional}
                onValueChange={(v) => {
                  setFilterRegional(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas las regionales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todas</SelectItem>
                  {regionalOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                  {filterRegional !== ALL_FILTER &&
                    !regionalOptions.some((o) =>
                      valuesMatch(o, filterRegional),
                    ) && (
                      <SelectItem value={filterRegional}>
                        {filterRegional}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Select
                value={filterDepartamento}
                onValueChange={(v) => {
                  setFilterDepartamento(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>Todos</SelectItem>
                  {departamentoOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                  {filterDepartamento !== ALL_FILTER &&
                    !departamentoOptions.some((o) =>
                      valuesMatch(o, filterDepartamento),
                    ) && (
                      <SelectItem value={filterDepartamento}>
                        {filterDepartamento}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Buscar por máquina o componente..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {totalRows === maquinas.length
                ? `${maquinas.length} máquina(s) en total`
                : `${totalRows} de ${maquinas.length} coinciden`}
            </span>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <RadioGroup
            value={selectedId == null ? "" : String(selectedId)}
            onValueChange={(v) => {
              const n = Number(v);
              if (Number.isFinite(n)) setSelectedId(n);
            }}
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[40px]" />
                  <TableHead>Máquina</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Actividad</TableHead>
                  <TableHead>Regional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMaquinas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-16 text-center text-xs text-muted-foreground"
                    >
                      Ninguna máquina coincide con el filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMaquinas.map((m) => {
                    const idStr = String(m.id_maq);
                    const isSelected = selectedId === m.id_maq;
                    return (
                      <TableRow
                        key={idStr}
                        className={cn(
                          "cursor-pointer",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => setSelectedId(m.id_maq)}
                      >
                        <TableCell>
                          <RadioGroupItem
                            value={idStr}
                            aria-label={`Seleccionar máquina ${m.maquina ?? idStr}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {m.maquina ?? ""}
                        </TableCell>
                        <TableCell>{readComponente(m)}</TableCell>
                        <TableCell>{readDepartamento(m)}</TableCell>
                        <TableCell>{m.actividad ?? ""}</TableCell>
                        <TableCell>{m.regional ?? ""}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </RadioGroup>
        </div>

        {/* ============ PAGINADOR ============ */}
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Items per page:</span>
            <select
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm">
            {totalRows === 0
              ? "0"
              : `${(page - 1) * rowsPerPage + 1} – ${Math.min(
                  page * rowsPerPage,
                  totalRows
                )} of ${totalRows}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Primera página"
            >
              <span className="sr-only">Primera página</span>
              &#x23ee;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <span className="sr-only">Página anterior</span>
              &#x2039;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              <span className="sr-only">Página siguiente</span>
              &#x203a;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Última página"
            >
              <span className="sr-only">Última página</span>
              &#x23ed;
            </button>
          </div>
        </div>

        {/* ============ CARD DE DETALLE (drag & drop) ============ */}
        {/*
          Mismo patrón que el "Detalle de la orden seleccionada" del
          flujo CONSULTA. Solo aparece cuando hay una máquina marcada
          en la tabla. Cada campo del objeto Maquina se renderiza como
          un `DraggableMaquinaField` que el usuario puede arrastrar al
          input "Máquina" de la parte fija.
        */}
        {/* 
        {selectedMaquina && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">
                  Detalle de la máquina seleccionada
                </p>
              </div>
              <Badge variant="secondary" className="font-mono">
                {String(selectedMaquina.id_maq)}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">
              Arrastra cualquier campo sobre el input{" "}
              <strong>Máquina</strong> de la parte fija para copiar su
              valor.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {maquinaFields.map((f) => {
                // Para el campo "componente" usamos el lookup tolerante
                // porque el backend puede devolver `componente`,
                // `componenete` o `componenente`. Para el resto,
                // accedemos por la propiedad tipada.
                const value =
                  f.key === "componente"
                    ? readComponente(selectedMaquina)
                    : String(
                        (selectedMaquina as unknown as Record<string, unknown>)[
                          f.key
                        ] ?? ""
                      );
                return (
                  <DraggableMaquinaField
                    key={f.key}
                    id={`${DRAG_MAQUINA_PREFIX}:${f.key}:${selectedMaquina.id_maq}`}
                    label={f.label}
                    value={value}
                  />
                );
              })}
            </div>
          </div>
        )}
          */}
      </CardContent>
    </Card>
  );
}