"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/user-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Mail,
  MapPin,
  MoreHorizontal,
  Save,
  Search,
  Settings2,
} from "lucide-react";
import type { Area, AreaTipoMotivo, TipoMotivo } from "@/types/interfaces";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import FuenteSelect from "@/components/fuente-select";
import FuenteAssignModal from "./fuente-assign-modal";
import OrigenesModal from "./origenes-modal";
import { normalizeCaso, normalizeValor, type FuenteSeleccion } from "@/lib/modos";

const formatDateForSQLServer = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

/** Fuente por defecto cuando un motivo aún no tiene configuración. */
const DEFAULT_FUENTE: FuenteSeleccion = {
  tipo_fuente: "MANUAL",
  valor: "",
  caso: "",
};

const STEPS = [
  { id: 1, title: "Motivos", description: "Selecciona los tipos de motivo" },
  { id: 2, title: "Notificación", description: "Define el correo" },
  { id: 3, title: "Confirmar", description: "Revisa y guarda" },
] as const;

interface TipoMotivoAssociationProps {
  area: Area | null;
  onClose: () => void;
}

export default function TipoMotivoAssociation({ area, onClose }: TipoMotivoAssociationProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [tipoMotivos, setTipoMotivos] = useState<TipoMotivo[]>([]);
  const [selectedMotivoIds, setSelectedMotivoIds] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [correoNotificacion, setCorreoNotificacion] = useState("");
  // Mantenemos las asociaciones previas para poder hacer el diff en handleSave
  // (INSERT vs UPDATE vs SOFT-DELETE).
  const [atmExistentes, setAtmExistentes] = useState<AreaTipoMotivo[]>([]);
  // Fuente de datos (tipo_fuente + caso) elegida por cada motivo.
  const [fuentePorMotivo, setFuentePorMotivo] = useState<
    Record<number, FuenteSeleccion>
  >({});
  // Modal para asignar la fuente a un motivo ya asociado (modo edición).
  const [assignAtm, setAssignAtm] = useState<AreaTipoMotivo | null>(null);
  // Modal para asociar orígenes (`origen.codigo_area_tipo_motivo`) a un ATM.
  const [origenesAtm, setOrigenesAtm] = useState<AreaTipoMotivo | null>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoadingMotivos, setIsLoadingMotivos] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar tipos de motivo activos + los ya asociados a esta área
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingMotivos(true);
      try {
        const [motivosRes, atmRes] = await Promise.all([
          tipoMotivoService.getAll(),
          areaTipoMotivoService.getAll(),
        ]);
        const motivosActivos = (motivosRes.data || []).filter((m) => m.estado === "A");
        const atm = ((atmRes.data || []) as AreaTipoMotivo[]).filter(
          (a) => a.codigo_area === area?.codigo_area && a.estado === "A"
        );
        setTipoMotivos(motivosActivos);
        setAtmExistentes(atm);
        setSelectedMotivoIds(atm.map((a) => a.codigo_tipo_motivo));
        // Precargar la fuente de datos ya configurada por motivo.
        const fuentes: Record<number, FuenteSeleccion> = {};
        for (const a of atm) {
          fuentes[a.codigo_tipo_motivo] = {
            tipo_fuente: a.tipo_fuente || DEFAULT_FUENTE.tipo_fuente,
            valor: normalizeValor(a.valor),
            caso: normalizeCaso(a.caso),
          };
        }
        setFuentePorMotivo(fuentes);
        // Tomamos el primer correo si ya existe (todos comparten el mismo generalmente)
        if (atm.length > 0) {
          setCorreoNotificacion(atm[0].correo_notificacion || "");
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "No se pudo cargar los datos.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoadingMotivos(false);
      }
    };
    if (area) fetchData();
  }, [area, toast]);

  const motivosFiltrados = useMemo(() => {
    if (!filter.trim()) return tipoMotivos;
    const f = filter.toLowerCase();
    return tipoMotivos.filter((m) => m.nombre_tipo_motivo.toLowerCase().includes(f));
  }, [tipoMotivos, filter]);

  const selectedMotivos = useMemo(
    () => tipoMotivos.filter((m) => selectedMotivoIds.includes(m.codigo_tipo_motivo)),
    [tipoMotivos, selectedMotivoIds]
  );

  const toggleMotivo = (id: number) => {
    setSelectedMotivoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getFuente = useCallback(
    (motivoId: number): FuenteSeleccion =>
      fuentePorMotivo[motivoId] ?? DEFAULT_FUENTE,
    [fuentePorMotivo]
  );

  const setFuente = useCallback((motivoId: number, value: FuenteSeleccion) => {
    setFuentePorMotivo((prev) => ({ ...prev, [motivoId]: value }));
  }, []);

  // Nombre de motivo por código, para la tabla de motivos ya asociados.
  const motivoNombreById = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of tipoMotivos) map.set(m.codigo_tipo_motivo, m.nombre_tipo_motivo);
    return map;
  }, [tipoMotivos]);

  /** Texto legible de la fuente configurada en un ATM. */
  const describeFuente = useCallback((atm: AreaTipoMotivo): string => {
    const tf = (atm.tipo_fuente || "").trim();
    if (!tf) return "Sin asignar";
    const caso = normalizeCaso(atm.caso);
    return caso ? `${tf} · ${caso}` : tf;
  }, []);

  /** Refresca el estado local tras guardar la fuente desde el modal. */
  const handleFuenteSaved = useCallback((updated: AreaTipoMotivo) => {
    setAtmExistentes((prev) =>
      prev.map((a) =>
        a.codigo_area_tipo_motivo === updated.codigo_area_tipo_motivo
          ? updated
          : a
      )
    );
    setFuentePorMotivo((prev) => ({
      ...prev,
      [updated.codigo_tipo_motivo]: {
        tipo_fuente: updated.tipo_fuente || "MANUAL",
        valor: normalizeValor(updated.valor),
        caso: normalizeCaso(updated.caso),
      },
    }));
  }, []);

  const canGoNext = useMemo(() => {
    if (currentStep === 1) return selectedMotivoIds.length > 0;
    if (currentStep === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return correoNotificacion.trim().length > 0 && emailRegex.test(correoNotificacion.trim());
    }
    return true;
  }, [currentStep, selectedMotivoIds.length, correoNotificacion]);

  const handleNext = () => {
    if (currentStep < 3 && canGoNext) {
      setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
    }
  };

  const handleSave = async () => {
    if (!area) return;
    setIsSaving(true);
    try {
      const correoTrim = correoNotificacion.trim();
      const usuarioSession =
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name) || "admin";
      const now = formatDateForSQLServer(new Date());
      const selectedSet = new Set(selectedMotivoIds);

      // 1) SOFT-DELETE: motivos que estaban asociados y ya NO están seleccionados.
      const aDesactivar = atmExistentes.filter(
        (a) => !selectedSet.has(a.codigo_tipo_motivo)
      );
      for (const atm of aDesactivar) {
        await areaTipoMotivoService.save({
          ...atm,
          correo_notificacion: correoTrim,
          estado: "I",
          usuario_modificacion: usuarioSession,
          fecha_modificacion: now,
        });
      }

      // 2) INSERT o UPDATE: para cada motivo seleccionado, si ya existía
      //    reutilizamos su PK (UPDATE) y solo le añadimos auditoría si el
      //    correo cambió. Si no existía, INSERT (codigo_area_tipo_motivo=0).
      let inserts = 0;
      let updates = 0;
      for (const motivoId of selectedMotivoIds) {
        const yaExiste = atmExistentes.find(
          (a) => a.codigo_tipo_motivo === motivoId
        );
        if (yaExiste) {
          const fuente = getFuente(motivoId);
          const correoCambio =
            (yaExiste.correo_notificacion || "") !== correoTrim;
          const fuenteCambio =
            (yaExiste.tipo_fuente || DEFAULT_FUENTE.tipo_fuente) !==
              fuente.tipo_fuente ||
            normalizeValor(yaExiste.valor) !== fuente.valor ||
            // `caso` ahora almacena el `valor` numérico del modo (no el texto),
            // por eso se compara contra `fuente.valor`.
            normalizeCaso(yaExiste.caso) !== fuente.valor;
          if (correoCambio || fuenteCambio) {
            await areaTipoMotivoService.save({
              ...yaExiste,
              correo_notificacion: correoTrim,
              tipo_fuente: fuente.tipo_fuente,
              valor: fuente.valor,
              caso: fuente.valor,
              estado: "A",
              usuario_modificacion: usuarioSession,
              fecha_modificacion: now,
            });
            updates++;
          }
        } else {
          const fuente = getFuente(motivoId);
          await areaTipoMotivoService.save({
            codigo_area_tipo_motivo: 0,
            codigo_area: area.codigo_area,
            codigo_tipo_motivo: motivoId,
            correo_notificacion: correoTrim,
            tipo_fuente: fuente.tipo_fuente,
            valor: fuente.valor,
            caso: fuente.valor,
            estado: "A",
          });
          inserts++;
        }
      }

      toast({
        title: "Tipos de motivo asociados",
        description:
          `${inserts} nuevo(s), ${updates} actualizado(s), ` +
          `${aDesactivar.length} desasociado(s).`,
        variant: "success",
      });
      router.refresh();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo guardar la asociación.";
      toast({
        title: "Error al guardar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!area) return null;

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Stepper lateral (mismo estilo que el de orígenes muestreables) */}
          <aside className="bg-slate-50 border-r p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {STEPS.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold border transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : isCompleted
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-muted-foreground border-slate-200",
                      ].join(" ")}
                    >
                      {step.id}
                    </div>
                    <div className="flex flex-col pt-1">
                      <span
                        className={[
                          "text-sm font-semibold leading-tight",
                          isActive || isCompleted ? "text-foreground" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {step.title}
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {step.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 leading-relaxed">
              <p>
                El correo de notificación se usará para enviar alertas cuando se
                registren muestreos en los motivos seleccionados.
              </p>
            </div>
          </aside>

          {/* Contenido */}
          <section className="flex flex-col gap-6 p-6">
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Área
              </span>
              <p className="mt-1">
                <span className="font-semibold">{area.nombre_area}</span>{" "}
                <span className="text-muted-foreground">(cód. {area.codigo_area})</span>
              </p>
            </div>

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Tipos de motivo
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecciona los tipos de motivo que aplican al área.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filtrar por nombre de motivo..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                {isLoadingMotivos ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Cargando motivos...
                  </p>
                ) : motivosFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hay tipos de motivo activos.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {motivosFiltrados.map((m) => {
                      const selected = selectedMotivoIds.includes(m.codigo_tipo_motivo);
                      return (
                        <button
                          key={m.codigo_tipo_motivo}
                          type="button"
                          onClick={() => toggleMotivo(m.codigo_tipo_motivo)}
                          className={[
                            "text-left rounded-md border p-3 transition-colors",
                            "hover:border-primary/50",
                            selected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "bg-card",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{m.nombre_tipo_motivo}</p>
                              <p className="text-xs text-muted-foreground">
                                Cód. {m.codigo_tipo_motivo}
                              </p>
                            </div>
                            {selected && (
                              <Badge variant="default" className="bg-primary">
                                <Check className="h-3 w-3 mr-1" />
                                Seleccionado
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {selectedMotivoIds.length} motivo(s) seleccionado(s).
                </div>

                {/* Motivos ya asociados: permiten asignar la fuente de datos
                    (nuevo campo) sin recorrer todo el asistente. */}
                {atmExistentes.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">
                        Motivos ya asociados
                      </h3>
                      <Badge variant="secondary" className="ml-auto">
                        {atmExistentes.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usa el menú de acciones para asignar la fuente de datos o
                      asociar orígenes de datos a cada motivo.
                    </p>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Área</TableHead>
                            <TableHead>Tipo de motivo</TableHead>
                            <TableHead>Fuente de datos</TableHead>
                            <TableHead className="w-[80px] text-right">
                              Acciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {atmExistentes.map((atm) => {
                            const nombre =
                              motivoNombreById.get(atm.codigo_tipo_motivo) ??
                              `Motivo ${atm.codigo_tipo_motivo}`;
                            const fuenteTxt = describeFuente(atm);
                            const sinAsignar = fuenteTxt === "Sin asignar";
                            return (
                              <TableRow key={atm.codigo_area_tipo_motivo}>
                                <TableCell className="font-medium">
                                  {area.nombre_area}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {nombre}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={sinAsignar ? "outline" : "secondary"}
                                    className="font-normal"
                                  >
                                    <Settings2 className="mr-1 h-3 w-3" />
                                    {fuenteTxt}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => setAssignAtm(atm)}
                                      >
                                        <Database className="mr-2 h-4 w-4" />
                                        Asignar fuente de datos
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setOrigenesAtm(atm)}
                                      >
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Asociar orígenes de datos
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Correo de notificación
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define la dirección que recibirá alertas de los motivos seleccionados.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Correo de notificación
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      type="email"
                      placeholder="notificaciones@empresa.com"
                      value={correoNotificacion}
                      onChange={(e) => setCorreoNotificacion(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este correo se asignará a todos los motivos seleccionados para esta área.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Confirmar y guardar
                  </h2>
                </div>

                <div className="rounded-md border p-4 space-y-3 bg-muted/30">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Área
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {area.nombre_area}{" "}
                      <span className="text-muted-foreground font-normal">
                        (cód. {area.codigo_area})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Correo de notificación
                    </p>
                    <p className="text-sm font-semibold mt-1">{correoNotificacion}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Motivos seleccionados
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedMotivoIds.length}
                    </p>
                  </div>
                </div>

                {selectedMotivos.length > 0 && (
                  <div className="rounded-md border">
                    <ul className="divide-y">
                      {selectedMotivos.map((m) => (
                        <li
                          key={m.codigo_tipo_motivo}
                          className="px-4 py-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{m.nombre_tipo_motivo}</p>
                              <p className="text-xs text-muted-foreground">
                                Área: {area.nombre_area} · cód. {area.codigo_area} — Motivo cód.{" "}
                                {m.codigo_tipo_motivo}
                              </p>
                            </div>
                            <Badge variant="default" className="bg-green-600 shrink-0">
                              Activo
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Fuente de datos
                            </label>
                            <FuenteSelect
                              value={getFuente(m.codigo_tipo_motivo)}
                              onChange={(v) => setFuente(m.codigo_tipo_motivo, v)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Footer con navegación */}
            <div className="flex items-center justify-between pt-6 mt-auto border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? onClose : handleBack}
                disabled={isSaving}
              >
                {currentStep === 1 ? (
                  "Cancelar"
                ) : (
                  <>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Atrás
                  </>
                )}
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext || isLoadingMotivos}
                >
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || selectedMotivoIds.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              )}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>

    <FuenteAssignModal
      open={assignAtm !== null}
      atm={assignAtm}
      motivoNombre={
        assignAtm
          ? motivoNombreById.get(assignAtm.codigo_tipo_motivo) ??
            `Motivo ${assignAtm.codigo_tipo_motivo}`
          : ""
      }
      onClose={() => setAssignAtm(null)}
      onSaved={handleFuenteSaved}
    />
    <OrigenesModal
      open={origenesAtm !== null}
      atm={origenesAtm}
      motivoNombre={
        origenesAtm
          ? motivoNombreById.get(origenesAtm.codigo_tipo_motivo) ??
            `Motivo ${origenesAtm.codigo_tipo_motivo}`
          : ""
      }
      onClose={() => setOrigenesAtm(null)}
    />
    </>
  );
}
