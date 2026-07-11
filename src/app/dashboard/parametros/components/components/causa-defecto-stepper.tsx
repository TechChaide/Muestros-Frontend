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
  Save,
  Search,
  Tag,
  Plus,
  Trash2,
  Pencil,
  Unlink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type {
  CausaDefecto,
  Componente,
  Origen,
  OrigenComponente,
} from "@/types/interfaces";
import { origenComponenteService } from "@/services/seguridades/origenComponente.service";
import { origenService } from "@/services/seguridades/origen.service";
import { causaDefectoService } from "@/services/seguridades/causaDefecto.service";

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
  { id: 1, title: "Orígenes", description: "Selecciona los orígenes del componente" },
  { id: 2, title: "Causas", description: "Causas de defecto" },
  { id: 3, title: "Confirmar", description: "Revisa y guarda" },
] as const;

interface Props {
  componente: Componente;
  onClose: () => void;
}

// Causa pendiente de crear en el paso 2 (híbrido)
interface PendingCausa {
  tempId: string;
  nombre_causa_defecto: string;
  estado: string;
}

export default function CausaDefectoStepper({ componente, onClose }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [origenesDelComponente, setOrigenesDelComponente] = useState<Origen[]>(
    []
  );
  const [selectedOrigenIds, setSelectedOrigenIds] = useState<number[]>([]);
  const [causasAll, setCausasAll] = useState<CausaDefecto[]>([]);
  const [causasAllOrigenComponente, setCausasAllOrigenComponente] = useState<
    CausaDefecto[]
  >([]);
  const [selectedCausaIds, setSelectedCausaIds] = useState<number[]>([]);
  const [pendingCausas, setPendingCausas] = useState<PendingCausa[]>([]);
  const [newCausaNombre, setNewCausaNombre] = useState("");
  const [filter, setFilter] = useState("");

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [causaToEdit, setCausaToEdit] = useState<CausaDefecto | null>(null);
  const [editNombre, setEditNombre] = useState("");

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [origenesRes, ocRes, causasRes] = await Promise.all([
        origenService.getAll(),
        origenComponenteService.getAll(),
        causaDefectoService.getAll(),
      ]);

      // IDs de orígenes ya asociados al componente
      const ocsDelComponente = (
        (ocRes.data || []) as OrigenComponente[]
      ).filter(
        (oc) =>
          oc.codigo_componente === componente.codigo_componente && oc.estado === "A"
      );
      const idsOrigenes = new Set(ocsDelComponente.map((o) => o.codigo_origen));

      // Objetos Origen resultantes (para mostrar en las cards)
      const allOrigenes = (origenesRes.data || []) as Origen[];
      const origenesAsoc = allOrigenes.filter(
        (o) => idsOrigenes.has(o.codigo_origen) && o.estado === "A"
      );
      setOrigenesDelComponente(origenesAsoc);

      // CausaDefecto globales (activas) - se mostrarán como cards en paso 2
      const causasActivas = ((causasRes.data || []) as CausaDefecto[]).filter(
        (c) => c.estado === "A"
      );
      setCausasAll(causasActivas);

      // Causas ya linkeadas a cualquier OrigenComponente (para preseleccionar)
      const causasYaLink = ((causasRes.data || []) as CausaDefecto[]).filter(
        (c) => c.estado === "A" && c.codigo_origen_componente != null
      );
      setCausasAllOrigenComponente(causasYaLink);
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

  const toggleOrigen = (id: number) => {
    setSelectedOrigenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCausa = (id: number) => {
    setSelectedCausaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddPendingCausa = () => {
    const n = newCausaNombre.trim();
    if (!n) {
      toast({
        title: "Validación",
        description: "Ingresa el nombre de la causa de defecto.",
        variant: "destructive",
      });
      return;
    }
    setPendingCausas((prev) => [
      ...prev,
      {
        tempId: `tmp-${Math.random().toString(36).slice(2, 9)}`,
        nombre_causa_defecto: n,
        estado: "A",
      },
    ]);
    setNewCausaNombre("");
  };

  const handleRemovePendingCausa = (tempId: string) => {
    setPendingCausas((prev) => prev.filter((c) => c.tempId !== tempId));
  };

  const handleOpenEdit = (causa: CausaDefecto) => {
    setCausaToEdit(causa);
    setEditNombre(causa.nombre_causa_defecto);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!causaToEdit || !editNombre.trim()) return;
    try {
      const usuarioSession =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name || "admin";
      await causaDefectoService.save({
        ...causaToEdit,
        nombre_causa_defecto: editNombre.trim(),
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({ title: "Editado", description: "Causa actualizada.", variant: "success" });
      setEditDialogOpen(false);
      fetchAll();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo editar.",
        variant: "destructive",
      });
    }
  };

  const handleUnlink = async (causa: CausaDefecto) => {
    try {
      const usuarioSession =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name || "admin";
      await causaDefectoService.save({
        ...causa,
        codigo_origen_componente: null as unknown as number,
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({ title: "Desasociada", description: "La causa fue desasociada.", variant: "success" });
      fetchAll();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo desasociar.",
        variant: "destructive",
      });
    }
  };

  const causasFiltradas = useMemo(() => {
    if (!filter.trim()) return causasAll;
    const f = filter.toLowerCase();
    return causasAll.filter((c) =>
      c.nombre_causa_defecto.toLowerCase().includes(f)
    );
  }, [causasAll, filter]);

  // Total de OrigenComponente que se crearán/reutilizarán:
  //   por cada origen seleccionado, una asociación a cada causa seleccionada + cada causa pendiente
  const totalCombinaciones = (selectedCausaIds.length + pendingCausas.length);

  const canGoNext = useMemo(() => {
    if (currentStep === 1) return selectedOrigenIds.length > 0;
    if (currentStep === 2) return totalCombinaciones > 0;
    return true;
  }, [currentStep, selectedOrigenIds.length, totalCombinaciones]);

  const handleNext = () => {
    if (canGoNext && currentStep < 3) {
      setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleSave = async () => {
    if (selectedOrigenIds.length === 0 || totalCombinaciones === 0) return;
    setIsSaving(true);
    try {
      // Por cada (origen_seleccionado, causa_existente) -> guardar CausaDefecto con codigo_origen_componente = OC del origen
      // Como causaDefectoService.save usa POST que crea/reemplaza por codigo_origen_componente,
      // pero actualmente la PK es codigo_causa_defecto, aquí la lógica es:
      //   - Si la causa existe y aún no tiene codigo_origen_componente, lo seteamos.
      //   - Si es nueva (pendiente), la creamos con codigo_origen_componente directamente.
      // Para no perder la causaDefecto original al editar, lo más simple es:
      //   Para cada causa pendiente, crear una nueva CausaDefecto (codigo_origen_componente = OC del origen).
      //   Para cada causa existente seleccionada, guardamos la asociación solo si todavía no la tiene.

      // Necesitamos conocer los codigo_origen_componente (pk de OC). Como ya los filtramos arriba,
      // y solo tenemos origenesDelComponente con OC activos, podemos llamar de nuevo al servicio para mapear.

      // Cargamos el listado completo de OC para mapear origen -> OC.
      const ocRes = await origenComponenteService.getAll();
      const ocPorOrigen: Record<number, OrigenComponente> = {};
      ((ocRes.data || []) as OrigenComponente[]).forEach((oc) => {
        if (
          oc.codigo_componente === componente.codigo_componente &&
          oc.codigo_origen in ocPorOrigen === false
        ) {
          ocPorOrigen[oc.codigo_origen] = oc;
        }
      });

      let count = 0;
      const usuarioSession =
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name) || "admin";

      // Causas seleccionadas (existentes)
      for (const origenId of selectedOrigenIds) {
        const oc = ocPorOrigen[origenId];
        if (!oc) continue;
        for (const causaId of selectedCausaIds) {
          const c = causasAll.find((x) => x.codigo_causa_defecto === causaId);
          if (!c) continue;
          // Si la causa seleccionada ya tiene un codigo_origen_componente y es distinto del que necesitamos,
          // omite: una causa sólo puede pertenecer a una combinación OC.
          if (
            c.codigo_origen_componente != null &&
            c.codigo_origen_componente !== oc.codigo_origen_componente
          ) {
            continue;
          }
          await causaDefectoService.save({
            codigo_causa_defecto: c.codigo_causa_defecto,
            nombre_causa_defecto: c.nombre_causa_defecto,
            estado: "A",
            usuario_modificacion: usuarioSession,
            fecha_modificacion: formatDateForSQLServer(new Date()),
            codigo_origen_componente: oc.codigo_origen_componente,
          });
          count++;
        }
      }

      // Causas pendientes (nuevas) -> crear una nueva por cada origen seleccionado.
      // En creación NO se envían usuario_modificacion / fecha_modificacion.
      for (const origenId of selectedOrigenIds) {
        const oc = ocPorOrigen[origenId];
        if (!oc) continue;
        for (const nueva of pendingCausas) {
          await causaDefectoService.save({
            codigo_causa_defecto: 0,
            nombre_causa_defecto: nueva.nombre_causa_defecto,
            estado: "A",
            codigo_origen_componente: oc.codigo_origen_componente,
          });
          count++;
        }
      }

      toast({
        title: "Causas asociadas",
        description: `${count} asociación(es) creada/actualizada(s) en CausaDefecto.`,
        variant: "success",
      });
      router.refresh();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo guardar las causas.";
      toast({
        title: "Error al guardar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
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
                Las causas de defecto se asocian a través de{" "}
                <strong>OrigenComponente</strong>. Selecciona los orígenes del
                componente y luego las causas aplicables (puedes crear nuevas).
              </p>
            </div>
          </aside>

          <section className="flex flex-col gap-6 p-6">
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

            {/* Paso 1: orígenes del componente */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Orígenes del componente
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecciona los orígenes asociados al componente para los
                    cuales vas a registrar causas de defecto.
                  </p>
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Cargando orígenes del componente...
                  </p>
                ) : origenesDelComponente.length === 0 ? (
                  <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    Este componente no tiene orígenes asociados aún. Crea la
                    asociación usando "Asociar Origen de defectos".
                  </div>
                ) : (
                  <div
                    role="radiogroup"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {origenesDelComponente.map((o) => {
                      const isSelected = selectedOrigenIds.includes(o.codigo_origen);
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
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {selectedOrigenIds.length} de {origenesDelComponente.length}{" "}
                  origen(es) seleccionados
                </div>
              </div>
            )}

            {/* Paso 2: causas existentes + nuevas (híbrido) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Causas de defecto
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecciona causas existentes o crea nuevas. Se asignarán a
                    cada origen elegido.
                  </p>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Filtrar causas existentes..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>

                {/* Cards de causas existentes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Existentes
                  </h3>
                  {causasFiltradas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay causas activas registradas.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {causasFiltradas.map((c) => {
                        const isSelected = selectedCausaIds.includes(
                          c.codigo_causa_defecto
                        );
                        const yaLink = c.codigo_origen_componente != null;
                        return (
                          <button
                            key={c.codigo_causa_defecto}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            disabled={yaLink}
                            onClick={() => toggleCausa(c.codigo_causa_defecto)}
                            className={[
                              "text-left rounded-md border p-4 transition-all",
                              yaLink
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:border-primary/50 hover:shadow-sm cursor-pointer",
                              "focus:outline-none focus:ring-2 focus:ring-primary/40",
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "bg-card",
                            ].join(" ")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <p className="font-semibold text-sm leading-tight truncate">
                                  {c.nombre_causa_defecto}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  #{c.codigo_causa_defecto}
                                </p>
                              </div>
                              {isSelected ? (
                                <Badge className="bg-primary text-primary-foreground shrink-0">
                                  <Check className="h-3 w-3 mr-1" />
                                  Elegida
                                </Badge>
                              ) : yaLink ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEdit(c);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlink(c);
                                    }}
                                  >
                                    <Unlink className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="px-2 py-0.5 bg-slate-100 text-slate-600 shrink-0"
                                >
                                  Elegir
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Crear nuevas causas */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Crear nuevas
                  </h3>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Nombre de la causa
                      </label>
                      <Input
                        value={newCausaNombre}
                        onChange={(e) => setNewCausaNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPendingCausa();
                          }
                        }}
                        placeholder="Ej: Materia prima vencida"
                      />
                    </div>
                    <Button type="button" onClick={handleAddPendingCausa} variant="outline">
                      <Plus className="mr-1 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>

                  {pendingCausas.length > 0 && (
                    <ul className="divide-y rounded-md border">
                      {pendingCausas.map((p) => (
                        <li
                          key={p.tempId}
                          className="flex items-center justify-between px-4 py-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {p.nombre_causa_defecto}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemovePendingCausa(p.tempId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Total a aplicar: {totalCombinaciones} causa(s) ×{" "}
                  {selectedOrigenIds.length} origen(es) ={" "}
                  {totalCombinaciones * selectedOrigenIds.length} asociación(es)
                </div>
              </div>
            )}

            {/* Paso 3: confirmar */}
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
                      Componente
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {componente.nombre_componente}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Orígenes
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedOrigenIds.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Causas (existentes + nuevas)
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {totalCombinaciones}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {causasAll
                    .filter((c) => selectedCausaIds.includes(c.codigo_causa_defecto))
                    .map((c) => (
                      <div
                        key={c.codigo_causa_defecto}
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{c.nombre_causa_defecto}</p>
                        <p className="text-xs text-muted-foreground">Existente</p>
                      </div>
                    ))}
                  {pendingCausas.map((p) => (
                    <div
                      key={p.tempId}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{p.nombre_causa_defecto}</p>
                      <p className="text-xs text-muted-foreground">Nueva</p>
                    </div>
                  ))}
                </div>
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
    </Card>

    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar causa de defecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Nombre</label>
          <Input
            value={editNombre}
            onChange={(e) => setEditNombre(e.target.value)}
            placeholder="Nombre de la causa"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} disabled={!editNombre.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
