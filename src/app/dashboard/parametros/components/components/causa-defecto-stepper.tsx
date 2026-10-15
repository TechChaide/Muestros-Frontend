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
  MoreHorizontal,
  Building2,
  Boxes,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  Area,
  AreaTipoMotivo,
  CausaDefecto,
  Componente,
  Origen,
  OrigenComponente,
  TipoMotivo,
} from "@/types/interfaces";
import { origenComponenteService } from "@/services/seguridades/origenComponente.service";
import { origenService } from "@/services/seguridades/origen.service";
import { causaDefectoService } from "@/services/seguridades/causaDefecto.service";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import { tipoMotivoService } from "@/services/seguridades/tipoMotivo.service";
import { areaService } from "@/services/seguridades/area.service";

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

  const [origenesDelComponente, setOrigenesDelComponente] = useState<Origen[]>([]);
  const [todosOrigenes, setTodosOrigenes] = useState<Origen[]>([]);
  const [selectedOrigenIds, setSelectedOrigenIds] = useState<number[]>([]);
  // Causas del OC del origen seleccionado (cargadas con el endpoint específico).
  const [causasDelOrigen, setCausasDelOrigen] = useState<CausaDefecto[]>([]);
  const [isLoadingCausas, setIsLoadingCausas] = useState(false);
  const [selectedCausaIds, setSelectedCausaIds] = useState<number[]>([]);
  const [pendingCausas, setPendingCausas] = useState<PendingCausa[]>([]);
  const [areasList, setAreasList] = useState<Area[]>([]);
  const [atmList, setAtmList] = useState<AreaTipoMotivo[]>([]);
  const [tipoMotivos, setTipoMotivos] = useState<TipoMotivo[]>([]);
  // Mapa OC por PK (codigo_origen_componente) — necesario para resolver el
  // origen de cada causa y para encontrar el OC del origen seleccionado.
  const [ocPorCodigo, setOcPorCodigo] = useState<Record<number, OrigenComponente>>({});
  // Mapa OC por origen del componente: codigo_origen → OrigenComponente.
  // Permite encontrar rápidamente el OC al seleccionar un origen en paso 1.
  const [ocPorOrigen, setOcPorOrigen] = useState<Record<number, OrigenComponente>>({});
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
      // Solo cargamos metadatos: orígenes, OCs, ATMs, áreas y motivos.
      // Las causas se cargan dinámicamente al seleccionar un origen (paso 1)
      // usando getCausasDefectoByCodigoOrigenComponente.
      const [origenesRes, ocRes, atmRes, motivosRes, areasRes] =
        await Promise.all([
          origenService.getAll(),
          origenComponenteService.getAll(),
          areaTipoMotivoService.getAll(),
          tipoMotivoService.getAll(),
          areaService.getAll(),
        ]);

      const ocsDelComponente = (
        (ocRes.data || []) as OrigenComponente[]
      ).filter(
        (oc) =>
          oc.codigo_componente === componente.codigo_componente && oc.estado === "A"
      );
      const idsOrigenes = new Set(ocsDelComponente.map((o) => o.codigo_origen));

      // Mapa global OC por PK
      const allOcsActivos = ((ocRes.data || []) as OrigenComponente[]).filter(
        (oc) => oc.estado === "A"
      );
      const ocPorCodigoMap: Record<number, OrigenComponente> = {};
      allOcsActivos.forEach((oc) => { ocPorCodigoMap[oc.codigo_origen_componente] = oc; });
      setOcPorCodigo(ocPorCodigoMap);

      // Mapa OC por origen (solo los del componente) para lookup rápido
      const ocPorOrigenMap: Record<number, OrigenComponente> = {};
      ocsDelComponente.forEach((oc) => { ocPorOrigenMap[oc.codigo_origen] = oc; });
      setOcPorOrigen(ocPorOrigenMap);

      const allOrigenes = (origenesRes.data || []) as Origen[];
      const allOrigenesActivos = allOrigenes.filter((o) => o.estado === "A");
      setTodosOrigenes(allOrigenesActivos);
      setOrigenesDelComponente(
        allOrigenesActivos.filter((o) => idsOrigenes.has(o.codigo_origen))
      );

      setAtmList(((atmRes.data || []) as AreaTipoMotivo[]).filter((a) => a.estado === "A"));
      setTipoMotivos(((motivosRes.data || []) as TipoMotivo[]).filter((m) => m.estado === "A"));
      setAreasList(((areasRes.data || []) as Area[]).filter((a) => a.estado === "A"));

      // Limpiar selección al recargar
      setSelectedOrigenIds([]);
      setSelectedCausaIds([]);
      setCausasDelOrigen([]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo cargar los datos.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [componente.codigo_componente, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /**
   * Cuando el usuario selecciona un origen en el paso 1:
   *  1. Busca el OC del origen (codigo_origen_componente)
   *  2. Llama al endpoint eficiente para traer SOLO las causas de ese OC
   *  3. Pre-selecciona todas esas causas (ya estaban asociadas)
   */
  useEffect(() => {
    if (selectedOrigenIds.length === 0) {
      setCausasDelOrigen([]);
      setSelectedCausaIds([]);
      return;
    }
    const origenId = selectedOrigenIds[0];
    const oc = ocPorOrigen[origenId];
    if (!oc) {
      setCausasDelOrigen([]);
      setSelectedCausaIds([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingCausas(true);
      try {
        const res = await causaDefectoService.getCausasDefectoByCodigoOrigenComponente(
          oc.codigo_origen_componente
        );
        if (cancelled) return;
        // El endpoint devuelve BodyResponse<CausaDefecto> donde `data` puede
        // ser un array o un objeto único dependiendo del backend.
        const rawData = (res as unknown as { data: unknown }).data;
        const causas = (Array.isArray(rawData) ? rawData : rawData ? [rawData] : []) as CausaDefecto[];
        const causasActivas = causas.filter((c) => c.estado === "A");
        setCausasDelOrigen(causasActivas);
        setSelectedCausaIds(causasActivas.map((c) => c.codigo_causa_defecto));
      } catch {
        if (!cancelled) {
          setCausasDelOrigen([]);
          setSelectedCausaIds([]);
        }
      } finally {
        if (!cancelled) setIsLoadingCausas(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrigenIds]);

  const toggleOrigen = (id: number) => {
    // Selección única (radio): elegir un origen deselecciona el anterior.
    setSelectedOrigenIds((prev) =>
      prev.includes(id) ? [] : [id]
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
      /*
        Soft-delete real: NO tocamos `codigo_origen_componente` (esa es la FK
        que identifica la asociación). Solo bajamos a estado='I'. Si en el
        futuro queremos re-asociar la misma causa a otro OC, basta con
        volver a guardar con estado='A' y el FK correcto.
      */
      const payload = {
        ...causa,
        estado: "I",
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      };
      await causaDefectoService.save(payload);

      toast({
        title: "Desasociada",
        description: "Causa desasociada correctamente.",
        variant: "success",
      });
      // Recargamos solo las causas del origen actual (más eficiente que fetchAll)
      const origenId = selectedOrigenIds[0];
      const oc = origenId != null ? ocPorOrigen[origenId] : null;
      if (oc) {
        const res = await causaDefectoService.getCausasDefectoByCodigoOrigenComponente(
          oc.codigo_origen_componente
        );
        const rawData = (res as unknown as { data: unknown }).data;
        const causas = (Array.isArray(rawData) ? rawData : rawData ? [rawData] : []) as CausaDefecto[];
        const causasActivas = causas.filter((c) => c.estado === "A");
        setCausasDelOrigen(causasActivas);
        setSelectedCausaIds(causasActivas.map((c) => c.codigo_causa_defecto));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo desasociar.",
        variant: "destructive",
      });
    }
  };

  /*
    Eliminación / desactivar de causa a nivel global queda FUERA de este
    stepper a propósito: hoy "Eliminar" haría exactamente lo mismo que
    "Desasociar" (ambos son estado='I' sobre la misma fila). El botón
    Eliminar se reintroducirá cuando el backend exponga un flag
    `es_plantilla` (o tabla separada) que permita distinguir
    "borrar del sistema" vs "quitar asociación con este OC".
  */

  const causasFiltradas = useMemo(() => {
    if (!filter.trim()) return causasDelOrigen;
    const f = filter.toLowerCase();
    return causasDelOrigen.filter((c) =>
      c.nombre_causa_defecto.toLowerCase().includes(f)
    );
  }, [causasDelOrigen, filter]);

  // ===== Mapas de resolución para mostrar contexto en cada card de causa =====
  /** areaPorCodigo: codigo_area → Area */
  const areaPorCodigo = useMemo(() => {
    const m = new Map<number, Area>();
    areasList.forEach((a) => m.set(a.codigo_area, a));
    return m;
  }, [areasList]);

  /** atmPorId: codigo_area_tipo_motivo → AreaTipoMotivo */
  const atmPorId = useMemo(() => {
    const m = new Map<number, AreaTipoMotivo>();
    atmList.forEach((a) => m.set(a.codigo_area_tipo_motivo, a));
    return m;
  }, [atmList]);

  /** motivoPorAtm: codigo_area_tipo_motivo → nombre_tipo_motivo */
  const motivoPorAtm = useMemo(() => {
    const map: Record<number, string> = {};
    atmList.forEach((a) => {
      const m = tipoMotivos.find(
        (tm) => tm.codigo_tipo_motivo === a.codigo_tipo_motivo
      );
      if (m) map[a.codigo_area_tipo_motivo] = m.nombre_tipo_motivo;
    });
    return map;
  }, [atmList, tipoMotivos]);

  /** origenPorCodigo: codigo_origen → Origen (de TODOS los orígenes, no solo los del componente) */
  const origenPorCodigo = useMemo(() => {
    const m = new Map<number, Origen>();
    todosOrigenes.forEach((o) => m.set(o.codigo_origen, o));
    return m;
  }, [todosOrigenes]);

  /**
   * Dado un CausaDefecto ya linkeado, devuelve un objeto con su
   * contexto completo (origen, área, motivo, atm, oc). Si la causa no
   * está linkeada o su OC está huérfano, devuelve `null`.
   */
  const contextoCausa = useMemo(() => {
    type Contexto = {
      oc: OrigenComponente;
      origen: Origen | null;
      atm: AreaTipoMotivo | null;
      motivo: string;
      area: Area | null;
    };
    const map: Record<number, Contexto | null> = {};
    causasDelOrigen.forEach((c) => {
      if (c.codigo_origen_componente == null) { map[c.codigo_causa_defecto] = null; return; }
      const oc = ocPorCodigo[c.codigo_origen_componente];
      if (!oc) { map[c.codigo_causa_defecto] = null; return; }
      const origen = origenPorCodigo.get(oc.codigo_origen) ?? null;
      const atm = origen != null ? atmPorId.get(origen.codigo_area_tipo_motivo) ?? null : null;
      const motivo = atm != null ? motivoPorAtm[atm.codigo_area_tipo_motivo] ?? "—" : "—";
      const area = atm != null ? areaPorCodigo.get(atm.codigo_area) ?? null : null;
      map[c.codigo_causa_defecto] = { oc, origen, atm, motivo, area };
    });
    return map;
  }, [causasDelOrigen, ocPorCodigo, origenPorCodigo, atmPorId, motivoPorAtm, areaPorCodigo]);

  const totalCombinaciones = selectedCausaIds.length + pendingCausas.length;

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
    const origenId = selectedOrigenIds[0];
    const oc = ocPorOrigen[origenId];
    if (!oc) { setIsSaving(false); return; }

    try {
      const usuarioSession =
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : user?.name) || "admin";
      const now = formatDateForSQLServer(new Date());
      const selectedCausaIdsSet = new Set(selectedCausaIds);

      // 1) SOFT-DELETE: causas del OC actual que fueron desmarcadas
      const aDesactivar = causasDelOrigen.filter(
        (c) => !selectedCausaIdsSet.has(c.codigo_causa_defecto)
      );
      for (const c of aDesactivar) {
        await causaDefectoService.save({
          ...c,
          estado: "I",
          usuario_modificacion: usuarioSession,
          fecha_modificacion: now,
        });
      }

      let inserts = 0;

      // 2) INSERT de causas nuevas (pendingCausas) para el OC seleccionado
      for (const nueva of pendingCausas) {
        await causaDefectoService.save({
          codigo_causa_defecto: 0,
          nombre_causa_defecto: nueva.nombre_causa_defecto,
          estado: "A",
          codigo_origen_componente: oc.codigo_origen_componente,
        });
        inserts++;
      }

      toast({
        title: "Causas guardadas",
        description:
          `${inserts} nueva(s) creada(s), ` +
          `${aDesactivar.length} desasociada(s).`,
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
                    aria-label="Orígenes del componente"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {origenesDelComponente.map((o) => {
                      const isSelected = selectedOrigenIds.includes(o.codigo_origen);
                      // Resuelve Área y Motivo del origen via ATM
                      const atm = atmPorId.get(o.codigo_area_tipo_motivo);
                      const areaNombre = atm
                        ? (areaPorCodigo.get(atm.codigo_area)?.nombre_area ?? "—")
                        : "—";
                      const motivoNombre = atm
                        ? (motivoPorAtm[atm.codigo_area_tipo_motivo] ?? "—")
                        : "—";
                      return (
                        <button
                          key={o.codigo_origen}
                          type="button"
                          role="radio"
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
                            <div className="space-y-1 min-w-0 flex-1">
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
                          {/* Contexto: Área + Motivo del origen */}
                          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 shrink-0 text-primary" />
                              <span className="font-medium text-foreground/80">Área:</span>
                              <span className="truncate">{areaNombre}</span>
                            </p>
                            <p className="flex items-center gap-1 truncate">
                              <Tag className="h-3 w-3 shrink-0 text-primary" />
                              <span className="font-medium text-foreground/80">Motivo:</span>
                              <span className="truncate">{motivoNombre}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {selectedOrigenIds.length === 1
                    ? `1 origen seleccionado de ${origenesDelComponente.length}`
                    : `Ninguno seleccionado · elige un origen para continuar`}
                </div>
              </div>
            )}

            {/* Paso 2: causas del origen seleccionado (desde endpoint específico) */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <span className="text-sm text-primary font-medium">description</span>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Causas de defecto
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Causas asociadas al origen seleccionado. Desmarca las que
                    quieras desasociar o crea nuevas.
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
                  {isLoadingCausas ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Cargando causas del origen...
                    </p>
                  ) : causasFiltradas.length === 0 ? (
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
                        /*
                          Cuando la causa ya está linkeada (yaLink=true), el
                          contenedor se renderiza como <div> en lugar de
                          <button> para evitar HTML inválido ("button in
                          button") que hacía que los botones Pencil/Unlink
                          no recibieran clicks en algunos navegadores.
                        */
                        const containerClass = [
                          "text-left rounded-md border p-4 transition-all",
                          yaLink
                            ? "opacity-80"
                            : "hover:border-primary/50 hover:shadow-sm cursor-pointer",
                          "focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40",
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card",
                        ].join(" ");
                        const inner = (
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <p className="font-semibold text-sm leading-tight truncate">
                                {c.nombre_causa_defecto}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                #{c.codigo_causa_defecto}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isSelected ? (
                                <Badge className="bg-primary text-primary-foreground">
                                  <Check className="h-3 w-3 mr-1" />
                                  Elegida
                                </Badge>
                              ) : null}
                            {/*
                              Acciones para causas ya asociadas: Editar,
                              Desasociar y Eliminar en menú DropdownMenu
                              (un solo ícono "⋮"). Aparece SIEMPRE que la
                              causa esté linkeada, sin importar si está
                              preseleccionada, para que el usuario nunca
                              pierda acceso a estas acciones.
                              Mismo patrón que origen-componente-stepper;
                              evita HTML inválido (`<button>` dentro de
                              `<div>` interactivo) que era la causa raíz
                              por la que los clicks no llegaban antes.
                            */}
                            {yaLink ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="Acciones de la causa"
                                    title="Acciones"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleOpenEdit(c)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar texto
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleUnlink(c)}>
                                    <Unlink className="mr-2 h-4 w-4" />
                                    Desasociar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                                <Badge
                                  variant="secondary"
                                  className="px-2 py-0.5 bg-slate-100 text-slate-600"
                                >
                                  Elegir
                                </Badge>
                              )}
                            </div>
                          </div>
                        );

                        // Bloque de contexto (Área, Motivo, Origen, OC).
                        // Solo se muestra cuando la causa está linkeada a un
                        // OC del componente, o cuando el origen seleccionado
                        // tiene match con uno de los del componente.
                        const contexto = contextoCausa[c.codigo_causa_defecto];
                        const contextoBlock =
                          contexto && contexto.oc ? (
                            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                              {contexto.area && (
                                <p className="flex items-center gap-1 truncate">
                                  <Building2 className="h-3 w-3 shrink-0 text-primary" />
                                  <span className="font-medium text-foreground/80">
                                    Área:
                                  </span>
                                  <span className="truncate">
                                    {contexto.area.nombre_area}
                                  </span>
                                </p>
                              )}
                              {contexto.motivo && contexto.motivo !== "—" && (
                                <p className="flex items-center gap-1 truncate">
                                  <Tag className="h-3 w-3 shrink-0 text-primary" />
                                  <span className="font-medium text-foreground/80">
                                    Motivo:
                                  </span>
                                  <span className="truncate">{contexto.motivo}</span>
                                </p>
                              )}
                              {contexto.origen && (
                                <p className="flex items-center gap-1 truncate">
                                  <Boxes className="h-3 w-3 shrink-0 text-primary" />
                                  <span className="font-medium text-foreground/80">
                                    Origen:
                                  </span>
                                  <span className="truncate">
                                    {contexto.origen.nombre_origen}
                                  </span>
                                </p>
                              )}
                              <p className="flex items-center gap-1 truncate">
                                <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-mono text-[10px]">
                                  OC #{contexto.oc.codigo_origen_componente}
                                  {" · ATM #"}
                                  {contexto.atm?.codigo_area_tipo_motivo ?? "—"}
                                </span>
                              </p>
                            </div>
                          ) : (
                            // Causa sin asociación previa: mostrar el
                            // nombre del componente para que el usuario
                            // sepa que está creando una asociación nueva
                            // contra los orígenes que seleccione en el
                            // paso 1.
                            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1 truncate">
                                <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span className="font-medium text-foreground/80">
                                  Área:
                                </span>
                                <span className="truncate">
                                  {origenesDelComponente.find(
                                    (o) =>
                                      selectedOrigenIds.includes(o.codigo_origen)
                                  )?.nombre_origen
                                    ? "Hereda de origen seleccionado"
                                    : "Sin área"}
                                </span>
                              </p>
                            </div>
                          );
                        // Causa disponible: contenedor interactivo (button).
                        if (!yaLink) {
                          return (
                            <button
                              key={c.codigo_causa_defecto}
                              type="button"
                              role="checkbox"
                              aria-checked={isSelected}
                              onClick={() => toggleCausa(c.codigo_causa_defecto)}
                              className={containerClass}
                            >
                              {inner}
                              {contextoBlock}
                            </button>
                          );
                        }
                        // Causa ya linkeada: contenedor no interactivo (div).
                        // Los clicks a editar/desasociar se hacen en los
                        // botones explícitos dentro de inner.
                        return (
                          <div
                            key={c.codigo_causa_defecto}
                            className={containerClass}
                            aria-label={`Causa ${c.nombre_causa_defecto} ya asociada`}
                          >
                            {inner}
                            {contextoBlock}
                          </div>
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
                  {causasDelOrigen
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
