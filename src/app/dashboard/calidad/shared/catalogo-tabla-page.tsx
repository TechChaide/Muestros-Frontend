"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit, FileSpreadsheet, Loader2, MoreHorizontal, RefreshCw, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  cambioDesdeValores,
  claveFila,
  descargarCatalogo,
  describirClave,
  detectarCambios,
  formatValor,
  interpretarEdicion,
  leerCatalogoExcel,
  valoresVisibles,
  type CambioCatalogo,
  type ColumnaCatalogo,
  type ErrorArchivo,
  type CambioAplicar,
  type FilaCatalogo,
} from "./catalogo-tabla";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

type CatalogoTablaPageProps = {
  titulo: string;
  descripcion: string;
  placeholderBusqueda: string;
  nombreTabla: string;
  nombreArchivo: string;
  etiquetaConteo: string;
  columnas: ColumnaCatalogo[];
  campoRequerido: string;
  /** Campos que identifican cada registro; el primero debe ser campoRequerido. */
  camposClave?: string[];
  mensajeRequerido: string;
  camposBusqueda: string[];
  tituloFila: (valores: Record<string, string | number | null>) => string;
  tituloAlta: (valores: Record<string, string | number | null>) => string;
  listar: () => Promise<FilaCatalogo[]>;
  aplicar: (cambios: CambioAplicar[]) => Promise<{ actualizados: number; insertados: number; eliminados: number }>;
};

export function CatalogoTablaPage({
  titulo,
  descripcion,
  placeholderBusqueda,
  nombreTabla,
  nombreArchivo,
  etiquetaConteo,
  columnas,
  campoRequerido,
  camposClave = [campoRequerido],
  mensajeRequerido,
  camposBusqueda,
  tituloFila,
  tituloAlta,
  listar,
  aplicar,
}: CatalogoTablaPageProps) {
  const { toast } = useToast();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [registros, setRegistros] = useState<FilaCatalogo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [soloCambios, setSoloCambios] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [errores, setErrores] = useState<ErrorArchivo[]>([]);
  const [cambios, setCambios] = useState<CambioCatalogo[]>([]);
  const [archivoNombre, setArchivoNombre] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filaEdicion, setFilaEdicion] = useState<FilaCatalogo | null>(null);
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [errorEdicion, setErrorEdicion] = useState("");

  const consultar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await listar();
      setRegistros(data);
      setCambios([]);
      setErrores([]);
      setArchivoNombre("");
      setSoloCambios(false);
      setPagina(1);
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo consultar el catálogo.";
      toast({ title: "Error", description: mensaje, variant: "destructive" });
      setRegistros([]);
    } finally {
      setCargando(false);
      setFilaEdicion(null);
    }
  }, [listar, toast]);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  const cambiosPorFila = useMemo(() => {
    const mapa = new Map<number, Map<string, CambioCatalogo["campos"][number]>>();
    for (const cambio of cambios) {
      if (cambio.tipo !== "update" || cambio.fila_origen == null) continue;
      mapa.set(cambio.fila_origen, new Map(cambio.campos.map((campo) => [campo.campo, campo])));
    }
    return mapa;
  }, [cambios]);

  const cambiosPorFilaCompletos = useMemo(() => {
    const mapa = new Map<number, CambioCatalogo>();
    for (const cambio of cambios) {
      if (cambio.fila_origen != null) mapa.set(cambio.fila_origen, cambio);
    }
    return mapa;
  }, [cambios]);

  const altas = cambios.filter((cambio) => cambio.tipo === "insert");
  const modificaciones = cambios.filter((cambio) => cambio.tipo === "update");
  const bajas = cambios.filter((cambio) => cambio.tipo === "delete");
  const filasConCambio = useMemo(() => {
    const ids = new Set<number>();
    for (const cambio of cambios) {
      if (cambio.fila_origen != null) ids.add(cambio.fila_origen);
    }
    return ids;
  }, [cambios]);

  const filasVisibles = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    return registros.filter((fila) => {
      if (soloCambios && !filasConCambio.has(fila.fila_origen)) return false;
      if (!texto) return true;
      const visible = valoresVisibles(columnas, fila, cambiosPorFilaCompletos.get(fila.fila_origen));
      return camposBusqueda.some((campo) =>
        String(visible[campo] ?? "").toLowerCase().includes(texto),
      );
    });
  }, [registros, filtro, soloCambios, filasConCambio, cambiosPorFilaCompletos, camposBusqueda, columnas]);

  const totalPaginas = Math.max(1, Math.ceil(filasVisibles.length / rowsPerPage));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = filasVisibles.slice(
    (paginaSegura - 1) * rowsPerPage,
    paginaSegura * rowsPerPage,
  );

  const onArchivo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const leido = leerCatalogoExcel(
        buffer,
        columnas,
        campoRequerido,
        mensajeRequerido,
        camposClave,
      );
      if (leido.errorEncabezado) {
        toast({ title: "Excel", description: leido.errorEncabezado, variant: "destructive" });
        return;
      }
      const diff = detectarCambios(
        columnas,
        registros,
        leido.filas,
        camposClave,
        leido.clavesPresentes ?? [],
      );
      const erroresArchivo = [...leido.errores, ...diff.errores];
      setErrores(erroresArchivo);
      setCambios(diff.cambios);
      setArchivoNombre(file.name);
      setSoloCambios(diff.cambios.length > 0);
      setPagina(1);
      if (diff.cambios.length === 0 && erroresArchivo.length === 0) {
        toast({
          title: "Sin diferencias",
          description: "El archivo coincide con el catálogo consultado.",
        });
      }
    } catch {
      toast({
        title: "Excel",
        description: "No se pudo leer el archivo.",
        variant: "destructive",
      });
    } finally {
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  const abrirEdicion = (fila: FilaCatalogo) => {
    const cambio = cambiosPorFilaCompletos.get(fila.fila_origen);
    const visible = valoresVisibles(columnas, fila, cambio);
    const siguiente: Record<string, string> = {};
    for (const columna of columnas) {
      const valor = visible[columna.key];
      siguiente[columna.key] = valor == null ? "" : String(valor);
    }
    setBorrador(siguiente);
    setErrorEdicion("");
    setFilaEdicion(fila);
  };

  const guardarEdicion = async () => {
    if (!filaEdicion) return;
    const interpretado = interpretarEdicion(columnas, campoRequerido, mensajeRequerido, borrador);
    if (interpretado.error || !interpretado.valores) {
      setErrorEdicion(interpretado.error || "No se pudo leer la edición.");
      return;
    }
    const clave = claveFila(interpretado.valores, camposClave);
    const repetido =
      clave !== claveFila(filaEdicion, camposClave) &&
      registros.some(
        (fila) =>
          fila.fila_origen !== filaEdicion.fila_origen && claveFila(fila, camposClave) === clave,
      );
    if (repetido) {
      setErrorEdicion(`Ya existe el ${describirClave(columnas, camposClave, interpretado.valores)}.`);
      return;
    }
    const cambio = cambioDesdeValores(columnas, filaEdicion, interpretado.valores);
    if (!cambio) {
      setFilaEdicion(null);
      toast({
        title: "Sin diferencias",
        description: "La edición coincide con el registro consultado.",
      });
      return;
    }
    const { fila_origen: _fila, ...original } = cambio.original ?? {};
    setGuardando(true);
    try {
      const resultado = await aplicar([
        {
          tipo: "update",
          original,
          valores: cambio.valores,
        },
      ]);
      setFilaEdicion(null);
      toast({
        title: "Registro actualizado",
        description: `${resultado.actualizados} modificado.`,
      });
      await consultar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar el registro.";
      setErrorEdicion(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarGuardado = async () => {
    if (cambios.length === 0 || errores.length > 0) return;
    setGuardando(true);
    try {
      const resultado = await aplicar(
        cambios.map((cambio) => ({
          tipo: cambio.tipo,
          original: cambio.original
            ? (() => {
                const { fila_origen: _fila, ...resto } = cambio.original;
                return resto;
              })()
            : undefined,
          valores: cambio.valores,
        })),
      );
      setModalAbierto(false);
      toast({
        title: "Catálogo actualizado",
        description: `${resultado.actualizados} modificados, ${resultado.insertados} nuevos, ${resultado.eliminados} eliminados.`,
      });
      await consultar();
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudieron guardar los cambios.";
      toast({ title: "Error", description: mensaje, variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{titulo}</CardTitle>
            <CardDescription>{descripcion}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void consultar()} disabled={cargando || guardando}>
              {cargando ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Consultar
            </Button>
            <Button
              variant="outline"
              onClick={() => descargarCatalogo(columnas, registros, nombreArchivo)}
              disabled={cargando || registros.length === 0}
            >
              <Download />
              Descargar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => archivoRef.current?.click()}
              disabled={cargando || registros.length === 0}
            >
              <Upload />
              Cargar Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalAbierto(true)}
              disabled={cambios.length === 0 || errores.length > 0 || guardando}
            >
              <Save />
              Ver cambios ({cambios.length})
            </Button>
            <input
              ref={archivoRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => void onArchivo(event.target.files?.[0])}
            />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={filtro}
              onChange={(event) => {
                setFiltro(event.target.value);
                setPagina(1);
              }}
              placeholder={placeholderBusqueda}
              className="max-w-md"
            />
            <Button
              type="button"
              variant={soloCambios ? "default" : "outline"}
              onClick={() => {
                setSoloCambios((actual) => !actual);
                setPagina(1);
              }}
              disabled={modificaciones.length === 0 && bajas.length === 0}
            >
              Solo cambios
            </Button>
            <span className="text-sm text-muted-foreground">
              {registros.length} {etiquetaConteo}
              {archivoNombre ? ` · ${archivoNombre}` : ""}
            </span>
            {modificaciones.length > 0 && (
              <Badge variant="outline">{modificaciones.length} modificados</Badge>
            )}
            {altas.length > 0 && <Badge variant="outline">{altas.length} nuevos</Badge>}
            {bajas.length > 0 && <Badge variant="outline">{bajas.length} eliminados</Badge>}
          </div>

          {errores.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">El archivo tiene observaciones. Corrígelas antes de guardar.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errores.slice(0, 8).map((error) => (
                  <li key={`${error.filaExcel}-${error.mensaje}`}>
                    Fila {error.filaExcel}: {error.mensaje}
                  </li>
                ))}
              </ul>
              {errores.length > 8 && (
                <p className="mt-2 text-muted-foreground">Y {errores.length - 8} más.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {bajas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registros eliminados en el archivo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {bajas.map((baja) => (
              <p key={`baja-${baja.fila_origen}`}>
                {tituloFila(baja.valores)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {altas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registros nuevos en el archivo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {altas.map((alta) => (
              <p key={`alta-${alta.filaExcel}`}>
                Fila {alta.filaExcel}: {tituloAlta(alta.valores)}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {cargando && registros.length === 0 ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="max-h-[62vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columnas.map((columna) => (
                        <TableHead key={columna.key} className="sticky top-0 z-10 whitespace-nowrap bg-background">
                          {columna.label}
                        </TableHead>
                      ))}
                      <TableHead className="sticky top-0 z-10 bg-background text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasPagina.map((fila) => {
                      const cambio = cambiosPorFilaCompletos.get(fila.fila_origen);
                      const celdas = cambiosPorFila.get(fila.fila_origen);
                      const visible = valoresVisibles(columnas, fila, cambio);
                      const eliminado = cambio?.tipo === "delete";
                      return (
                        <TableRow key={fila.fila_origen} className={cn(eliminado && "line-through opacity-60")}>
                          {columnas.map((columna) => {
                            const campo = celdas?.get(columna.key);
                            const texto = formatValor(visible[columna.key]);
                            return (
                              <TableCell
                                key={columna.key}
                                className={cn(
                                  "max-w-[220px] truncate whitespace-nowrap",
                                  campo && "bg-amber-100 font-medium text-amber-950",
                                )}
                                title={
                                  campo
                                    ? `${formatValor(campo.antes)} → ${formatValor(campo.despues)}`
                                    : texto
                                }
                              >
                                {texto}
                            </TableCell>
                          );
                          })}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => abrirEdicion(fila)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filasPagina.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={columnas.length + 1} className="h-24 text-center">
                          <FileSpreadsheet className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                          No hay registros para mostrar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-end gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Items per page:</span>
                  <select
                    className="rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={rowsPerPage}
                    onChange={(event) => {
                      setRowsPerPage(Number(event.target.value));
                      setPagina(1);
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
                  {filasVisibles.length === 0
                    ? "0"
                    : `${(paginaSegura - 1) * rowsPerPage + 1} – ${Math.min(
                        paginaSegura * rowsPerPage,
                        filasVisibles.length,
                      )} of ${filasVisibles.length}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setPagina(1)}
                    disabled={paginaSegura === 1}
                    aria-label="Primera página"
                  >
                    &#x23ee;
                  </button>
                  <button
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setPagina((actual) => Math.max(1, actual - 1))}
                    disabled={paginaSegura === 1}
                    aria-label="Página anterior"
                  >
                    &#x2039;
                  </button>
                  <button
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}
                    disabled={paginaSegura === totalPaginas}
                    aria-label="Página siguiente"
                  >
                    &#x203a;
                  </button>
                  <button
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
                    onClick={() => setPagina(totalPaginas)}
                    disabled={paginaSegura === totalPaginas}
                    aria-label="Última página"
                  >
                    &#x23ed;
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={filaEdicion != null}
        onOpenChange={(abierto) => {
          if (!abierto) setFilaEdicion(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar registro</DialogTitle>
            <DialogDescription>
              {filaEdicion ? tituloFila(borrador) : "Edita los campos del registro."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[55vh] grid-cols-1 gap-3 overflow-auto pr-1 sm:grid-cols-2">
            {columnas.map((columna) => (
              <div key={columna.key} className="space-y-1.5">
                <Label htmlFor={`edit-${columna.key}`}>{columna.label}</Label>
                <Input
                  id={`edit-${columna.key}`}
                  value={borrador[columna.key] ?? ""}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setBorrador((actual) => ({ ...actual, [columna.key]: valor }));
                  }}
                />
              </div>
            ))}
          </div>
          {errorEdicion && <p className="text-sm text-destructive">{errorEdicion}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilaEdicion(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarEdicion()} disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cambios que se van a guardar</DialogTitle>
            <DialogDescription>
              {modificaciones.length} modificaciones, {altas.length} registros nuevos y {bajas.length} eliminaciones en {nombreTabla}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-4 overflow-auto pr-1 text-sm">
            {cambios.map((cambio) => (
              <div
                key={`${cambio.tipo}-${cambio.fila_origen ?? "n"}-${cambio.filaExcel}`}
                className="rounded-md border p-3"
              >
                <p className="font-medium">
                  {cambio.tipo === "insert"
                    ? "Nuevo"
                    : cambio.tipo === "delete"
                      ? "Eliminación"
                      : "Modificación"}{" "}
                  · {tituloFila(cambio.valores)}
                </p>
                {cambio.tipo === "delete" ? (
                  <p className="mt-2">Se eliminará este registro.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {cambio.campos.map((campo) => (
                      <li key={campo.campo}>
                        {campo.label}: {formatValor(campo.antes)} → {formatValor(campo.despues)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarGuardado()} disabled={guardando}>
              {guardando && <Loader2 className="animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
