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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  Tag,
  Plus,
  X,
  MoreHorizontal,
  Pencil,
  Link2Off,
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
  Area,
  AreaTipoMotivo,
  Origen,
  TipoMotivo,
} from "@/types/interfaces";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import { origenService } from "@/services/seguridades/origen.service";
import OrigenEditModal from "./origen-edit-modal";

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
  {
    id: 1,
    title: "Motivo",
    description: "Sobre qué motivo",
  },
  {
    id: 2,
    title: "Origen",
    description: "Define el origen",
  },
  {
    id: 3,
    title: "Confirmar",
    description: "Revisa y guarda",
  },
] as const;

interface OriginAssociationViewProps {
  area: Area | null;
  onClose: () => void;
}

export default function OriginAssociationView({ area, onClose }: OriginAssociationViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  // Paso 1: AreaTipoMotivo
  const [atmList, setAtmList] = useState<AreaTipoMotivo[]>([]);
  const [tipoMotivos, setTipoMotivos] = useState<TipoMotivo[]>([]);
  const [selectedAtmId, setSelectedAtmId] = useState<string>("");
  const [existingOrigenes, setExistingOrigenes] = useState<Origen[]>([]);

  // Paso 2: formulario del origen
  const [isLoadingAtm, setIsLoadingAtm] = useState(false);
  const [isLoadingOrigenes, setIsLoadingOrigenes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form para el origen
  const origenSchema = z.object({
    codigo_origen: z.number(),
    codigo_area_tipo_motivo: z.number(),
    nombre_origen: z.string().min(1, "El nombre del origen es requerido."),
    estado: z.string({ required_error: "El estado es requerido." }),
  });
  type OrigenForm = z.infer<typeof origenSchema>;

  const form = useForm<OrigenForm>({
    resolver: zodResolver(origenSchema),
    defaultValues: {
      codigo_origen: 0,
      codigo_area_tipo_motivo: 0,
      nombre_origen: "",
      estado: "A",
    },
  });

  // Helper: cargar AreaTipoMotivo + TipoMotivo al abrir el stepper
  const fetchAtmAndMotivos = useCallback(async () => {
    if (!area) return;
    setIsLoadingAtm(true);
    try {
      const [atmRes, motivosRes] = await Promise.all([
        areaTipoMotivoService.getAll(),
        tipoMotivoService.getAll(),
      ]);
      const atmDelArea = ((atmRes.data || []) as AreaTipoMotivo[]).filter(
        (a) => a.codigo_area === area.codigo_area && a.estado === "A"
      );
      setAtmList(atmDelArea);
      setTipoMotivos((motivosRes.data || []).filter((m) => m.estado === "A"));
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo cargar los motivos del área.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoadingAtm(false);
    }
  }, [area, toast]);

  useEffect(() => {
    if (area) fetchAtmAndMotivos();
  }, [area, fetchAtmAndMotivos]);

  // Carga única de todos los orígenes del backend. El filtrado por ATM se hace
  // en cliente para evitar un re-fetch cada vez que el usuario cambia de card.
  const [hasFetchedOrigenes, setHasFetchedOrigenes] = useState(false);

  useEffect(() => {
    if (hasFetchedOrigenes) return;
    const fetchAll = async () => {
      setIsLoadingOrigenes(true);
      try {
        const res = await origenService.getAll();
        setExistingOrigenes((res.data || []) as Origen[]);
        setHasFetchedOrigenes(true);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "No se pudo cargar los orígenes.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsLoadingOrigenes(false);
      }
    };
    fetchAll();
  }, [hasFetchedOrigenes, toast]);

  // Orígenes visibles (los del ATM seleccionado)
  const origenesDelAtm = useMemo(
    () =>
      existingOrigenes.filter(
        (o) => o.codigo_area_tipo_motivo === Number(selectedAtmId)
      ),
    [existingOrigenes, selectedAtmId]
  );

  const selectedAtm = useMemo(
    () => atmList.find((a) => String(a.codigo_area_tipo_motivo) === selectedAtmId) || null,
    [atmList, selectedAtmId]
  );

  const selectedMotivo = useMemo(() => {
    if (!selectedAtm) return null;
    return tipoMotivos.find((m) => m.codigo_tipo_motivo === selectedAtm.codigo_tipo_motivo) || null;
  }, [selectedAtm, tipoMotivos]);

  // useWatch (react-hook-form) avisa correctamente cuando un campo cambia,
  // a diferencia de form.watch() que no actualiza useMemo de forma confiable.
  const watchedNombreOrigen = useWatch({
    control: form.control,
    name: "nombre_origen",
  });

  // Validaciones entre pasos
  const canGoNext = useMemo(() => {
    if (currentStep === 1) return !!selectedAtmId;
    if (currentStep === 2) {
      return (watchedNombreOrigen || "").trim().length > 0;
    }
    return true;
  }, [currentStep, selectedAtmId, watchedNombreOrigen]);

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
    if (!selectedAtm) return;
    const values = form.getValues();
    if (!values.nombre_origen?.trim()) return;
    setIsSaving(true);
    try {
      // Construcción del payload según sea creación (codigo_origen=0)
      // o edición (codigo_origen con id real). Para CREACIÓN no se envían
      // fecha_modificacion ni usuario_modificacion (los pone el backend).
      const data: Origen = {
        codigo_origen: 0,
        codigo_area_tipo_motivo: selectedAtm.codigo_area_tipo_motivo,
        nombre_origen: values.nombre_origen.trim(),
        estado: values.estado,
      };
      await origenService.save(data);
      toast({
        title: "Origen asociado",
        description: `El origen "${data.nombre_origen}" fue asociado al motivo correctamente.`,
        variant: "success",
      });
      router.refresh();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo guardar el origen.";
      toast({
        title: "Error al guardar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ===== Edición / Quitar asociación =====
  const [editingOrigen, setEditingOrigen] = useState<Origen | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditOrigen = (origen: Origen) => {
    setEditingOrigen(origen);
    setIsEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditModalOpen(false);
    setEditingOrigen(null);
  };

  const handleOrigenSaved = () => {
    // Refrescar orígenes después de editar
    setHasFetchedOrigenes(false); // fuerzar re-fetch
    setEditingOrigen(null);
  };

  const handleUnlinkOrigen = async (origen: Origen) => {
    // Quitar asociación = desactivar el registro (estado = 'I') enviando fecha_modificacion y usuario_modificacion.
    const usuarioSession = (typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
      : user?.name) || "admin";
    try {
      const data: Origen = {
        codigo_origen: origen.codigo_origen,
        codigo_area_tipo_motivo: origen.codigo_area_tipo_motivo,
        nombre_origen: origen.nombre_origen,
        estado: "I",
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      };
      await origenService.save(data);
      toast({
        title: "Asociación removida",
        description: `El origen "${origen.nombre_origen}" fue desactivado.`,
        variant: "success",
      });
      setHasFetchedOrigenes(false); // re-fetch
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo quitar la asociación.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  if (!area) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          {/* Stepper lateral (mismo estilo que la imagen de referencia) */}
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
                          isActive || isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground",
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
                Los orígenes se asocian a un <strong>tipo de motivo</strong> del
                área, no directamente al área. Primero asocia motivos al área
                si no hay disponibles.
              </p>
            </div>
          </aside>

          {/* Contenido */}
          <section className="flex flex-col gap-6 p-6">
            {/* Cabecera fija con info del área */}
            <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Área
              </span>
              <p className="mt-1">
                <span className="font-semibold">{area.nombre_area}</span>{" "}
                <span className="text-muted-foreground">(cód. {area.codigo_area})</span>
              </p>
            </div>

            {/* Paso 1: elegir AreaTipoMotivo */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Selecciona el motivo
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Elige el tipo de motivo (del área) sobre el que se asociará el origen.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Selecciona un motivo
                  </label>

                  {isLoadingAtm ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Cargando motivos...
                    </p>
                  ) : atmList.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                      Esta área aún no tiene motivos asociados. Primero crea la
                      asociación desde la acción "Asociar Tipos de Motivo".
                    </div>
                  ) : (
                    <div
                      role="radiogroup"
                      aria-label="Motivos del área"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                    >
                      {atmList.map((a) => {
                        const isSelected =
                          selectedAtmId === String(a.codigo_area_tipo_motivo);
                        const motivo = tipoMotivos.find(
                          (m) => m.codigo_tipo_motivo === a.codigo_tipo_motivo
                        );
                        const motivoNombre =
                          motivo?.nombre_tipo_motivo ??
                          `Motivo #${a.codigo_tipo_motivo}`;
                        return (
                          <button
                            key={a.codigo_area_tipo_motivo}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              setSelectedAtmId(String(a.codigo_area_tipo_motivo))
                            }
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
                              <div className="space-y-1">
                                <p className="font-semibold text-sm leading-tight">
                                  {motivoNombre}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  ATM #{a.codigo_area_tipo_motivo} · motivo #
                                  {a.codigo_tipo_motivo}
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
                            {a.correo_notificacion && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                <Tag className="inline h-3 w-3 mr-1" />
                                {a.correo_notificacion}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Solo se muestran motivos asociados previamente al área (estado = A).
                  </p>
                </div>

                {/* Cards de orígenes ya asociados para el ATM seleccionado */}
                {selectedAtmId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold">
                          Orígenes ya asociados
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {origenesDelAtm.length} registro(s) encontrados para
                          este motivo
                        </p>
                      </div>
                    </div>

                    {isLoadingOrigenes ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Cargando orígenes...
                      </p>
                    ) : origenesDelAtm.length === 0 ? (
                      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                        Este motivo aún no tiene orígenes asociados. Puedes
                        crear uno nuevo en el siguiente paso.
                      </div>
                    ) : (
                      <div
                        role="list"
                        aria-label="Orígenes ya asociados"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                      >
                        {origenesDelAtm.map((o) => (
                          <div
                            key={o.codigo_origen}
                            role="listitem"
                            className="rounded-md border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all"
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
                              <div className="flex items-center gap-1 shrink-0">
                                <Badge
                                  variant={o.estado === "A" ? "default" : "destructive"}
                                  className={
                                    o.estado === "A"
                                      ? "bg-green-600 hover:bg-green-700"
                                      : ""
                                  }
                                >
                                  {o.estado === "A" ? "Activo" : "Inactivo"}
                                </Badge>
                                <DropdownMenu>
                                  <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            aria-label="Acciones del origen"
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
                                  <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                      onClick={() => handleEditOrigen(o)}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleUnlinkOrigen(o)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Link2Off className="mr-2 h-4 w-4" />
                                      Quitar asociación
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Paso 2: definir origen */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Información esencial
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Define el nombre del nuevo origen para el motivo seleccionado.
                  </p>
                </div>

                {/* Resumen del ATM + motivo seleccionados */}
                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm space-y-1">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Motivo seleccionado
                    </span>
                    <div className="mt-1">
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {selectedMotivo?.nombre_tipo_motivo ?? `#${selectedAtm?.codigo_tipo_motivo}`}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (currentStep === 2) handleNext();
                    }}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="nombre_origen"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Nombre del origen
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Cliente A" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Estado
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="A">
                                  <div className="flex items-center">
                                    Activo
                                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="I">
                                  <div className="flex items-center">
                                    Inactivo
                                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500"></span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* Paso 3: confirmar y guardar */}
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
                      Motivo
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedMotivo?.nombre_tipo_motivo ?? `#${selectedAtm?.codigo_tipo_motivo}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Nombre del origen
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {form.watch("nombre_origen")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Estado
                    </p>
                    <Badge
                      variant={form.watch("estado") === "A" ? "default" : "destructive"}
                      className={
                        form.watch("estado") === "A"
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }
                    >
                      {form.watch("estado") === "A" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
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
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Atrás
                  </>
                )}
              </Button>

              {currentStep < 3 ? (
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

      {/* Modal de edición de origen */}
      <OrigenEditModal
        open={isEditModalOpen}
        origen={editingOrigen}
        selectedAtm={selectedAtm}
        selectedMotivo={selectedMotivo}
        usuarioSession={
          (typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
            : null) || user?.name || "admin"
        }
        onClose={handleCloseEdit}
        onSaved={handleOrigenSaved}
      />
    </Card>
  );
}
