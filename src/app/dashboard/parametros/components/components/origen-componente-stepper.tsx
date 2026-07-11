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
  Check,
  ChevronLeft,
  ChevronRight,
  Link2Off,
  MoreHorizontal,
  Save,
  Search,
  Tag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  AreaTipoMotivo,
  Componente,
  Origen,
  OrigenComponente,
  TipoMotivo,
} from "@/types/interfaces";
import { origenService } from "@/services/seguridades/origen.service";
import { origenComponenteService } from "@/services/seguridades/origenComponente.service";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";

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

const STEPS = [
  { id: 1, title: "Orígenes", description: "Selecciona los orígenes" },
  { id: 2, title: "Confirmar", description: "Revisa y guarda" },
] as const;

interface Props {
  componente: Componente;
  onClose: () => void;
}

export default function OrigenComponenteStepper({ componente, onClose }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [origenes, setOrigenes] = useState<Origen[]>([]);
  const [atmList, setAtmList] = useState<AreaTipoMotivo[]>([]);
  const [tipoMotivos, setTipoMotivos] = useState<TipoMotivo[]>([]);
  const [existingAsoc, setExistingAsoc] = useState<OrigenComponente[]>([]);
  const [selectedOrigenIds, setSelectedOrigenIds] = useState<number[]>([]);
  const [filter, setFilter] = useState("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Carga única: orígenes (todos los activos), ATM (todos los activos),
  // TipoMotivo, y asociaciones pre-existentes de este componente.
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [origenesRes, atmRes, motivosRes, asocRes] = await Promise.all([
        origenService.getAll(),
        areaTipoMotivoService.getAll(),
        tipoMotivoService.getAll(),
        origenComponenteService.getAll(),
      ]);

      const origenesActivos = (origenesRes.data || []).filter(
        (o) => o.estado === "A"
      );
      setOrigenes(origenesActivos);

      setAtmList(
        ((atmRes.data || []) as AreaTipoMotivo[]).filter((a) => a.estado === "A")
      );
      setTipoMotivos((motivosRes.data || []).filter((m) => m.estado === "A"));

      const yaAsociados = ((asocRes.data || []) as OrigenComponente[]).filter(
        (oc) =>
          oc.codigo_componente === componente.codigo_componente &&
          oc.estado === "A"
      );
      setExistingAsoc(yaAsociados);
      setSelectedOrigenIds(yaAsociados.map((a) => a.codigo_origen));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo cargar los datos.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [componente.codigo_componente, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Para mostrar el motivo asociado a cada origen en la card
  const motivoPorAtm = useMemo(() => {
    const map: Record<number, string> = {};
    atmList.forEach((a) => {
      const m = tipoMotivos.find((tm) => tm.codigo_tipo_motivo === a.codigo_tipo_motivo);
      if (m) map[a.codigo_area_tipo_motivo] = m.nombre_tipo_motivo;
    });
    return map;
  }, [atmList, tipoMotivos]);

  const origenesFiltrados = useMemo(() => {
    if (!filter.trim()) return origenes;
    const f = filter.toLowerCase();
    return origenes.filter(
      (o) =>
        o.nombre_origen.toLowerCase().includes(f) ||
        (motivoPorAtm[o.codigo_area_tipo_motivo] || "")
          .toLowerCase()
          .includes(f)
    );
  }, [origenes, filter, motivoPorAtm]);

  const selectedOrigenes = useMemo(
    () => origenes.filter((o) => selectedOrigenIds.includes(o.codigo_origen)),
    [origenes, selectedOrigenIds]
  );

  const toggleOrigen = (id: number) => {
    setSelectedOrigenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canGoNext = currentStep === 1 ? selectedOrigenIds.length > 0 : true;

  const handleNext = () => {
    if (canGoNext && currentStep < 2) {
      setCurrentStep((s) => (s + 1) as 1 | 2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as 1 | 2);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const usuarioSession =
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name) || "admin";
      const now = formatDateForSQLServer(new Date());

      // 1) desactivar asociaciones que ya NO están seleccionadas
      const aDesactivar = existingAsoc.filter(
        (a) => !selectedOrigenIds.includes(a.codigo_origen)
      );
      for (const a of aDesactivar) {
        await origenComponenteService.save({
          ...a,
          estado: "I",
          usuario_modificacion: usuarioSession,
          fecha_modificacion: now,
        });
      }

      // 2) crear / mantener activas las seleccionadas
      // IMPORTANTE: cuando es nuevo (yaExiste === undefined) NO se envían
      // usuario_modificacion ni fecha_modificacion (los pone el backend al INSERT).
      // Solo se envían en edición.
      for (const id of selectedOrigenIds) {
        const yaExiste = existingAsoc.find((a) => a.codigo_origen === id);
        const payload: OrigenComponente = {
          codigo_origen_componente: yaExiste?.codigo_origen_componente ?? 0,
          codigo_origen: id,
          codigo_componente: componente.codigo_componente,
          estado: "A",
        };
        if (yaExiste) {
          payload.usuario_modificacion = usuarioSession;
          payload.fecha_modificacion = now;
        }
        await origenComponenteService.save(payload);
      }

      toast({
        title: "Orígenes asociados",
        description: `${selectedOrigenIds.length} origen(es) asociados al componente "${componente.nombre_componente}".`,
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

  // Desasocia un origen existente: envía OrigenComponente con estado "I"
  // + fecha_modificacion + usuario_modificacion (porque es edición).
  const handleUnlinkExisting = async (oc: OrigenComponente) => {
    const usuarioSession =
      (typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
        : user?.name) || "admin";
    try {
      await origenComponenteService.save({
        ...oc,
        estado: "I",
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({
        title: "Origen desasociado",
        description: `El origen fue desasociado del componente "${componente.nombre_componente}".`,
        variant: "success",
      });
      // Refrescar asociaciones existentes
      const asocRes = await origenComponenteService.getAll();
      const yaAsociados = ((asocRes.data || []) as OrigenComponente[]).filter(
        (a) =>
          a.codigo_componente === componente.codigo_componente &&
          a.estado === "A"
      );
      setExistingAsoc(yaAsociados);
      setSelectedOrigenIds(yaAsociados.map((a) => a.codigo_origen));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo desasociar el origen.";
      toast({
        title: "Error al desasociar",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Stepper lateral */}
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
                Los orígenes se asocian al componente a través de{" "}
                <strong>OrigenComponente</strong>. Las asociaciones
                existentes se mantienen; las nuevas se crean y las que
                desaparecen del paso 1 se desactivan.
              </p>
            </div>
          </aside>

          {/* Contenido */}
          <section className="flex flex-col gap-6 p-6">
            {/* Cabecera fija con info del componente */}
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Componente
              </span>
              <div className="mt-1">
                <span className="font-semibold">{componente.nombre_componente}</span>{" "}
                <span className="text-muted-foreground">
                  (cód. {componente.codigo_componente})
                </span>
              </div>
            </div>

            {/* Paso 1: selección de orígenes */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Selecciona orígenes
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Marca los orígenes que aplican al componente. Los ya
                    asociados aparecen preseleccionados.
                  </p>
                </div>

                {/* Resumen de asociaciones existentes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border bg-muted/30 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Orígenes disponibles
                    </p>
                    <p className="text-2xl font-bold mt-1 text-slate-900">
                      {origenes.length}
                    </p>
                  </div>
                  <div className="rounded-md border bg-green-50/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ya asociados a este componente
                    </p>
                    <p className="text-2xl font-bold mt-1 text-green-700">
                      {existingAsoc.length}
                    </p>
                  </div>
                  <div className="rounded-md border bg-primary/5 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Marcados en este paso
                    </p>
                    <p className="text-2xl font-bold mt-1 text-primary">
                      {selectedOrigenIds.length}
                    </p>
                  </div>
                </div>

                {/* Cards de orígenes ya asociados (look desactivado, con menú de acciones) */}
                {existingAsoc.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ya asociados a este componente
                      </h3>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                        {existingAsoc.length}
                      </Badge>
                    </div>
                    <div
                      role="list"
                      aria-label="Orígenes ya asociados al componente"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                    >
                      {existingAsoc
                        .map((a) => {
                          const o = origenes.find(
                            (x) => x.codigo_origen === a.codigo_origen
                          );
                          if (!o) return null;
                          const motivoTxt =
                            motivoPorAtm[o.codigo_area_tipo_motivo] || "Sin motivo";
                          return { oc: a, o, motivoTxt };
                        })
                        .filter(
                          (x): x is { oc: OrigenComponente; o: Origen; motivoTxt: string } =>
                            x !== null
                        )
                        .map(({ oc, o, motivoTxt }) => {
                          const isMarked = selectedOrigenIds.includes(o.codigo_origen);
                          return (
                            <div
                              key={oc.codigo_origen_componente}
                              role="listitem"
                              className={[
                                "rounded-md border p-4 transition-all",
                                isMarked
                                  ? "border-green-200 bg-green-50/40"
                                  : "border-slate-200 bg-slate-50/60 opacity-70",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight truncate">
                                    {o.nombre_origen}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    OC #{oc.codigo_origen_componente} · Origen #{o.codigo_origen}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isMarked ? (
                                    <Badge className="bg-green-600 text-white">
                                      Activo
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="bg-slate-200 text-slate-600"
                                    >
                                      Desactivado
                                    </Badge>
                                  )}
                                  <DropdownMenu>
                                    <TooltipProvider delayDuration={300}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <DropdownMenuTrigger asChild>
                                            <button
                                              type="button"
                                              aria-label="Acciones del origen asociado"
                                              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                          </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                          Acciones
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem
                                        onClick={() => handleUnlinkExisting(oc)}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Link2Off className="mr-2 h-4 w-4" />
                                        Desasociar origen
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground truncate">
                                <Tag className="inline h-3 w-3 mr-1" />
                                {motivoTxt}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filtrar por nombre de origen o motivo..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Cargando orígenes...
                  </p>
                ) : origenesFiltrados.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    No hay orígenes activos registrados.
                  </div>
                ) : (
                  <div
                    role="radiogroup"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {origenesFiltrados.map((o) => {
                      const isSelected = selectedOrigenIds.includes(o.codigo_origen);
                      const motivoTxt =
                        motivoPorAtm[o.codigo_area_tipo_motivo] || "Sin motivo";
                      return (
                        <button
                          key={o.codigo_origen}
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          onClick={() => toggleOrigen(o.codigo_origen)}
                          className={[
                            "text-left rounded-md border p-4 transition-all",
                            "hover:border-primary/50 hover:shadow-sm",
                            "focus:outline-none focus:ring-2 focus:ring-primary/40",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "bg-card",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">
                                {o.nombre_origen}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                Origen #{o.codigo_origen}
                              </p>
                            </div>
                            {isSelected ? (
                              <Badge className="bg-primary text-primary-foreground shrink-0">
                                <Check className="h-3 w-3 mr-1" />
                                Elegido
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 bg-slate-100 text-slate-600 shrink-0"
                              >
                                Elegir
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground truncate">
                            <Tag className="inline h-3 w-3 mr-1" />
                            {motivoTxt}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {selectedOrigenIds.length} origen(es) seleccionado(s) de{" "}
                  {origenes.length} disponibles
                </div>
              </div>
            )}

            {/* Paso 2: confirmar */}
            {currentStep === 2 && (
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
                      Componente
                    </p>
                    <p className="text-sm font-semibold mt-1">{componente.nombre_componente}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Orígenes a asociar
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedOrigenIds.length}
                    </p>
                  </div>
                </div>

                {selectedOrigenes.length > 0 && (
                  <div className="rounded-md border">
                    <ul className="divide-y">
                      {selectedOrigenes.map((o) => (
                        <li
                          key={o.codigo_origen}
                          className="flex items-center justify-between px-4 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{o.nombre_origen}</p>
                            <p className="text-xs text-muted-foreground">
                              {motivoPorAtm[o.codigo_area_tipo_motivo] ||
                                "Motivo no encontrado"}{" "}
                              (ATM #{o.codigo_area_tipo_motivo})
                            </p>
                          </div>
                          <Badge className="bg-green-600">Activo</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
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

              {currentStep < 2 ? (
                <Button type="button" onClick={handleNext} disabled={!canGoNext}>
                  Siguiente
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
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
  );
}
