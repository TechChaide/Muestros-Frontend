"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Plus,
  Table as TableIcon,
  ChevronLeft,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  Area,
  AreaTipoMotivo,
  Asociacion,
  Componente,
  ElementoAsociacion,
  TipoMedicion,
  TipoMotivo,
} from "@/types/interfaces";
import { elementoAsociacionService } from "@/services/seguridades/elementoAsociacion.service";
import { asociacionService } from "@/services/seguridades/asociacion.service";
import { tipoMedicionService } from "@/services/seguridades/tipoMedicion.service";
import StepperHeader, { type StepDef } from "./stepper-header";
import StepNavigation from "./step-navigation";
import Step1SelectArea from "./step1-select-area";
import Step2SelectMotivo from "./step2-select-motivo";
import Step3SelectComponente from "./step3-select-componente";
import Step4BuildTable from "./step4-build-table";
import Step5ConfirmTable from "./step5-confirm-table";
import TablePreview, { type ColumnDef } from "./table-preview"
import type { ExistingTable } from "./tables-catalog";
import VersionBadge from "./version-badge";
import SaveProgressModal, {
  type SaveProgressState,
} from "./save-progress-modal";
import {
  formatDateForSQLServer,
  getCodigoEmpleadoFromStorage,
} from "./sql-helpers";
const STEPS: readonly StepDef[] = [
  { id: 1, title: "Área", description: "Selecciona el área" },
  { id: 2, title: "Motivo", description: "Motivo aplicable" },
  { id: 3, title: "Componentes", description: "Uno o más componentes" },
  { id: 4, title: "Tabla", description: "Diseña la tabla" },
  { id: 5, title: "Confirmar", description: "Revisa y guarda" },
] as const;

type StepId = 1 | 2 | 3 | 4 | 5;

/**
 * Firma única de una tabla = nombre (normalizado) + secuencia ordenada de
 * codigo_elemento_asociacion. Dos tablas con la misma firma se consideran
 * duplicadas (mismo nombre y mismos campos de asociación en el mismo orden).
 */
function tableSignature(
  nombre: string,
  elementCodes: number[]
): string {
  return `${nombre.trim().toLowerCase()}::${elementCodes.join(",")}`;
}

type ExistingSignature = { signature: string; key: string };

interface TableWizardProps {
  /** Cuando se define, el wizard arranca en modo edición con la tabla precargada */
  editingTable?: ExistingTable | null;
  /**
   * Área preseleccionada al CREAR una tabla. Cuando viene del catálogo
   * (botón "Asociar nueva tabla") el wizard arranca en el paso 2 con el
   * área ya fijada; el usuario solo elige motivo, componente y columnas.
   */
  presetArea?: Area | null;
  /** Volver al catálogo (sólo en modo edición) */
  onBackToCatalog?: () => void;
  /** Callback cuando termina de guardar exitosamente */
  onSaved?: () => void;
}

export default function TableWizard({
  editingTable = null,
  presetArea = null,
  onBackToCatalog,
  onSaved,
}: TableWizardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const isEditMode = !!editingTable;

  // En modo edición el wizard se enfoca en el paso de Tabla (paso 4),
  // que es donde el usuario realmente modifica contenido. Los pasos 1-3
  // quedan deshabilitados porque área/motivo/componente ya están fijados
  // por la tabla original.
  const [currentStep, setCurrentStep] = useState<StepId>(
    isEditMode ? 4 : presetArea ? 2 : 1
  );

  // Selección de los pasos 1, 2 y 3
  const [selectedArea, setSelectedArea] = useState<Area | null>(
    editingTable?.area ?? presetArea ?? null
  );
  const [selectedAtm, setSelectedAtm] = useState<AreaTipoMotivo | null>(
    editingTable?.atm ?? null
  );
  const [selectedMotivo, setSelectedMotivo] = useState<TipoMotivo | null>(
    editingTable?.motivo ?? null
  );
  const [selectedComponentes, setSelectedComponentes] = useState<Componente[]>(
    editingTable?.componente ? [editingTable.componente] : []
  );

  // Paso 4: estado de la tabla virtual
  const [columns, setColumns] = useState<ColumnDef[]>(
    editingTable ? editingTable.columns.map((c) => ({ ...c })) : []
  );
  const [tableName, setTableName] = useState<string>(editingTable?.nombre ?? "");
  const [selectedTipoMedicion, setSelectedTipoMedicion] =
    useState<TipoMedicion | null>(editingTable?.tipoMedicion ?? null);

  // Catálogo de elementos
  const [elements, setElements] = useState<ElementoAsociacion[]>([]);

  // Firmas de tablas activas existentes (para impedir duplicados).
  const [existingSignatures, setExistingSignatures] = useState<
    ExistingSignature[]
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgressState>({
    open: false,
    current: 0,
    total: 0,
    label: "",
  });

  // Confirmación de cancelación (aplica al botón "Cancelar" del stepper y al
  // botón "Reiniciar" cuando hay cambios sin guardar en el wizard).
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Cargar catálogo de elementos y tipos de medición
  useEffect(() => {
    let cancelled = false;
    const fetchCatalogs = async () => {
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
        // Si editamos y el catálogo trae el tipo, rehidratar por si el
        // ExistingTable aún no tenía el objeto (solo el código).
        if (editingTable?.codigo_tipo_medicion) {
          const found = ((tmRes.data || []) as TipoMedicion[]).find(
            (t) =>
              t.codigo_tipo_medicion === editingTable.codigo_tipo_medicion &&
              t.estado === "A"
          );
          if (found) setSelectedTipoMedicion(found);
        }
      } catch {
        // Manejado en cada paso
      }
    };
    fetchCatalogs();
    return () => {
      cancelled = true;
    };
  }, [editingTable]);

  // Cargar firmas de tablas activas para validar duplicados en el guardado.
  useEffect(() => {
    let cancelled = false;
    const fetchSignatures = async () => {
      try {
        const res = await asociacionService.getAll();
        if (cancelled) return;
        const activas = ((res.data || []) as Asociacion[]).filter(
          (a) => a.estado === "A"
        );
        // Agrupar por (ATM + tabla + tipo_medicion + componente + versión).
        const grupos = new Map<string, Asociacion[]>();
        for (const a of activas) {
          const tm = Number(a.codigo_tipo_medicion) || 0;
          const gkey = `${a.codigo_area_tipo_motivo}__${a.tabla
            .toLowerCase()
            .trim()}__${tm}__${a.codigo_componente}__${a.tabla_version}`;
          if (!grupos.has(gkey)) grupos.set(gkey, []);
          grupos.get(gkey)!.push(a);
        }
        const sigs: ExistingSignature[] = [];
        for (const [, items] of grupos) {
          const sorted = [...items].sort((a, b) => a.orden - b.orden);
          const first = sorted[0];
          const tm = Number(first.codigo_tipo_medicion) || 0;
          const nombre = first.tabla;
          const key = `${first.codigo_area_tipo_motivo}__${nombre
            .toLowerCase()
            .trim()}__${tm}__${first.codigo_componente}`;
          sigs.push({
            key,
            signature: tableSignature(
              nombre,
              sorted.map((i) => i.codigo_elemento_asociacion)
            ),
          });
        }
        setExistingSignatures(sigs);
      } catch {
        // Si falla, no bloqueamos el guardado (el backend puede validar).
      }
    };
    fetchSignatures();
    return () => {
      cancelled = true;
    };
  }, []);

  // ===== Handlers de selección =====
  const handleSelectArea = useCallback((area: Area) => {
    setSelectedArea(area);
    setSelectedAtm(null);
    setSelectedMotivo(null);
    setSelectedComponentes([]);
    setColumns([]);
    setTableName("");
  }, []);

  const handleSelectMotivo = useCallback(
    (atm: AreaTipoMotivo, motivo: TipoMotivo) => {
      setSelectedAtm(atm);
      setSelectedMotivo(motivo);
      setSelectedComponentes([]);
      setColumns([]);
      setTableName((prev) =>
        prev && prev.length > 0
          ? prev
          : `tabla_${motivo.nombre_tipo_motivo
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "")}`
      );
    },
    []
  );

  const handleToggleComponente = useCallback(
    (componente: Componente) => {
      setSelectedComponentes((prev) => {
        const exists = prev.some(
          (c) => c.codigo_componente === componente.codigo_componente
        );
        if (isEditMode) {
          return exists ? prev : [componente];
        }
        if (exists) {
          return prev.filter(
            (c) => c.codigo_componente !== componente.codigo_componente
          );
        }
        return [...prev, componente];
      });
    },
    [isEditMode]
  );

  // ===== Cálculo de versión a guardar =====
  // Regla:
  //  - Si NO estamos editando: tabla_version = 1
  //  - Si editamos y la cantidad de columnas coincide con la versión vigente
  //    → se reutiliza el mismo tabla_version (edición in-place).
  //  - Si editamos y la cantidad de columnas es distinta
  //    → nueva versión = latestVersion + 1
  const targetVersion = useMemo(() => {
    if (!isEditMode || !editingTable) return 1;
    const originalCount = editingTable.columnCount;
    if (columns.length === originalCount) return editingTable.latestVersion;
    return editingTable.latestVersion + 1;
  }, [isEditMode, editingTable, columns.length]);

  const isNewVersion = useMemo(() => {
    if (!isEditMode || !editingTable) return false;
    return targetVersion > editingTable.latestVersion;
  }, [isEditMode, editingTable, targetVersion]);

  // ===== Validaciones =====
  const canGoNext = useMemo(() => {
    if (currentStep === 1) return !!selectedArea;
    if (currentStep === 2) return !!selectedMotivo && !!selectedAtm;
    if (currentStep === 3) return selectedComponentes.length > 0;
    if (currentStep === 4)
      return (
        columns.length > 0 &&
        tableName.trim().length > 0 &&
        !!selectedTipoMedicion
      );
    return true;
  }, [
    currentStep,
    selectedArea,
    selectedMotivo,
    selectedAtm,
    selectedComponentes.length,
    columns.length,
    tableName,
    selectedTipoMedicion,
  ]);

  const handleNext = () => {
    if (!canGoNext) return;
    if (currentStep < 5) setCurrentStep((s) => (s + 1) as StepId);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as StepId);
  };

  /** Detecta si el usuario hizo cambios sin guardar respecto al estado inicial */
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditMode) {
      // En creación: cualquier selección o columna es un cambio
      return (
        !!selectedArea ||
        !!selectedMotivo ||
        selectedComponentes.length > 0 ||
        columns.length > 0 ||
        tableName.trim().length > 0 ||
        !!selectedTipoMedicion
      );
    }
    // En edición: si cambió el # de columnas es un cambio estructural,
    // si cambió etiquetas u orden también
    if (!editingTable) return false;
    if (columns.length !== editingTable.columnCount) return true;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const orig = editingTable.columns[i];
      if (!orig) return true;
      if (col.codigo_elemento_asociacion !== orig.codigo_elemento_asociacion)
        return true;
      if (col.etiqueta.trim() !== orig.etiqueta.trim()) return true;
    }
    if (tableName.trim() !== editingTable.nombre.trim()) return true;
    const originalTm =
      editingTable.codigo_tipo_medicion ||
      editingTable.tipoMedicion?.codigo_tipo_medicion ||
      0;
    if (
      (selectedTipoMedicion?.codigo_tipo_medicion ?? 0) !== originalTm
    ) {
      return true;
    }
    return false;
  }, [
    isEditMode,
    editingTable,
    selectedArea,
    selectedMotivo,
    selectedComponentes.length,
    columns,
    tableName,
    selectedTipoMedicion,
  ]);

  /**
   * Lo que hace "Cancelar":
   *  - Limpia el state interno del wizard (siempre).
   *  - Si el padre pasó `onBackToCatalog`, vuelve al catálogo
   *    (aplica tanto en creación como en edición).
   */
  const performCancel = useCallback(() => {
    setSelectedArea(null);
    setSelectedAtm(null);
    setSelectedMotivo(null);
    setSelectedComponentes([]);
    setColumns([]);
    setTableName("");
    setSelectedTipoMedicion(null);
    setCurrentStep(1);
    setShowCancelDialog(false);
    if (onBackToCatalog) {
      onBackToCatalog();
    }
  }, [onBackToCatalog]);

  /** Solicita cancelación. Si no hay cambios, ejecuta directo; si hay, confirma. */
  const requestCancel = useCallback(() => {
    if (!hasUnsavedChanges) {
      performCancel();
      return;
    }
    setShowCancelDialog(true);
  }, [hasUnsavedChanges, performCancel]);

  // ===== Guardado final =====
  const handleSubmit = async () => {
    if (!selectedMotivo || !selectedAtm || selectedComponentes.length === 0)
      return;
    if (columns.length === 0 || !tableName.trim()) return;
    if (!selectedTipoMedicion) {
      toast({
        title: "Tipo de medición requerido",
        description: "Selecciona un tipo de medición antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    const currentSignature = tableSignature(
      tableName,
      columns.map((c) => c.codigo_elemento_asociacion)
    );

    if (isEditMode && editingTable) {
      const editingKey = `${editingTable.atm?.codigo_area_tipo_motivo ?? ""}__${editingTable.nombre
        .toLowerCase()
        .trim()}__${editingTable.codigo_tipo_medicion || 0}__${
        editingTable.componente?.codigo_componente ?? 0
      }`;
      const isDuplicate = existingSignatures.some((s) => {
        if (s.key === editingKey) return false;
        if (s.signature !== currentSignature) return false;
        // Misma ATM+tabla+tipo+componente distinta firma ya cubierta;
        // aquí solo bloqueamos otra tabla con misma firma en misma clave lógica.
        const parts = s.key.split("__");
        const editParts = editingKey.split("__");
        return (
          parts[0] === editParts[0] &&
          parts[2] === editParts[2] &&
          parts[3] === editParts[3]
        );
      });
      if (isDuplicate) {
        toast({
          title: "Tabla duplicada",
          description:
            "Ya existe una tabla activa con el mismo nombre y tipo de medición para este componente.",
          variant: "destructive",
        });
        return;
      }
    } else {
      const conflicting = selectedComponentes.filter((comp) => {
        const key = `${selectedAtm.codigo_area_tipo_motivo}__${tableName
          .toLowerCase()
          .trim()}__${selectedTipoMedicion.codigo_tipo_medicion}__${
          comp.codigo_componente
        }`;
        return existingSignatures.some((s) => s.key === key);
      });
      if (conflicting.length > 0) {
        toast({
          title: "Tabla duplicada",
          description: `Ya existe esa tabla (mismo nombre y tipo) para: ${conflicting
            .map((c) => c.nombre_componente)
            .join(", ")}.`,
          variant: "destructive",
        });
        return;
      }
    }

    const editComponente =
      selectedComponentes[0] ?? editingTable?.componente ?? null;

    // Total de operaciones para la barra de progreso.
    let totalOps = 0;
    if (isEditMode && editingTable && !isNewVersion) {
      const vigentesCount = editingTable.versions.filter(
        (v) => v.tabla_version === editingTable.latestVersion
      ).length;
      totalOps = columns.length + Math.max(0, vigentesCount - columns.length);
    } else if (isEditMode && editingTable) {
      const prevCount = editingTable.versions.filter(
        (v) => v.tabla_version === editingTable.latestVersion
      ).length;
      totalOps = columns.length + prevCount;
    } else {
      totalOps = columns.length * selectedComponentes.length;
    }

    setIsSubmitting(true);
    setSaveProgress({
      open: true,
      current: 0,
      total: Math.max(1, totalOps),
      label: "Preparando guardado…",
    });

    let opsDone = 0;
    const bump = (label: string) => {
      opsDone += 1;
      setSaveProgress({
        open: true,
        current: opsDone,
        total: Math.max(1, totalOps),
        label,
      });
    };

    try {
      const now = new Date();
      const usuarioModificacion = isEditMode
        ? getCodigoEmpleadoFromStorage() || "admin"
        : undefined;
      const fechaModificacion = isEditMode
        ? formatDateForSQLServer(now)
        : undefined;

      if (isEditMode && editingTable && !isNewVersion && editComponente) {
        const vigentes = [...editingTable.versions]
          .filter((v) => v.tabla_version === editingTable.latestVersion)
          .sort((a, b) => a.orden - b.orden);

        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const prev = vigentes[i];
          const payload = {
            codigo_asociacion: prev?.codigo_asociacion ?? 0,
            codigo_elemento_asociacion: col.codigo_elemento_asociacion,
            codigo_componente: editComponente.codigo_componente,
            codigo_area_tipo_motivo: selectedAtm.codigo_area_tipo_motivo,
            codigo_tipo_medicion: selectedTipoMedicion.codigo_tipo_medicion,
            tabla: tableName.trim(),
            tabla_version: targetVersion,
            orden: i + 1,
            etiqueta: col.etiqueta.trim() || `columna_${i + 1}`,
            estado: "A",
            ...(fechaModificacion && { fecha_modificacion: fechaModificacion }),
            ...(usuarioModificacion && {
              usuario_modificacion: usuarioModificacion,
            }),
          } as const;
          await asociacionService.save(payload as unknown as any);
          bump(`Actualizando columna ${i + 1}/${columns.length}…`);
        }

        for (let i = columns.length; i < vigentes.length; i++) {
          const excedente = vigentes[i];
          await asociacionService.save({
            ...excedente,
            codigo_tipo_medicion:
              excedente.codigo_tipo_medicion ||
              selectedTipoMedicion.codigo_tipo_medicion,
            estado: "I",
            ...(fechaModificacion && { fecha_modificacion: fechaModificacion }),
            ...(usuarioModificacion && {
              usuario_modificacion: usuarioModificacion,
            }),
          } as unknown as any);
          bump(`Desactivando columna excedente…`);
        }

        toast({
          title: "Tabla actualizada",
          description: `Se actualizaron ${columns.length} asociaciones (versión ${targetVersion}).`,
          variant: "success",
        });
      } else {
        // Creación (N componentes) o nueva versión (1 componente).
        const targets =
          isEditMode && editComponente
            ? [editComponente]
            : selectedComponentes;

        for (const comp of targets) {
          for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const payload = {
              codigo_asociacion: 0,
              codigo_elemento_asociacion: col.codigo_elemento_asociacion,
              codigo_componente: comp.codigo_componente,
              codigo_area_tipo_motivo: selectedAtm.codigo_area_tipo_motivo,
              codigo_tipo_medicion: selectedTipoMedicion.codigo_tipo_medicion,
              tabla: tableName.trim(),
              tabla_version: targetVersion,
              orden: i + 1,
              etiqueta: col.etiqueta.trim() || `columna_${i + 1}`,
              estado: "A",
            } as const;
            await asociacionService.save(payload as unknown as any);
            bump(
              targets.length > 1
                ? `${comp.nombre_componente}: columna ${i + 1}/${columns.length}`
                : `Guardando columna ${i + 1}/${columns.length}…`
            );
          }
        }

        if (isEditMode && editingTable) {
          const versionesAnteriores = [...editingTable.versions].filter(
            (v) => v.tabla_version === editingTable.latestVersion
          );

          for (const anterior of versionesAnteriores) {
            await asociacionService.save({
              ...anterior,
              codigo_tipo_medicion:
                anterior.codigo_tipo_medicion ||
                selectedTipoMedicion.codigo_tipo_medicion,
              estado: "I",
              ...(fechaModificacion && {
                fecha_modificacion: fechaModificacion,
              }),
              ...(usuarioModificacion && {
                usuario_modificacion: usuarioModificacion,
              }),
            } as unknown as any);
            bump("Desactivando versión anterior…");
          }
        }

        toast({
          title: isEditMode ? "Nueva versión creada" : "Tabla creada",
          description: isEditMode
            ? `Se generó la versión ${targetVersion} y se desactivó la versión ${editingTable?.latestVersion}.`
            : `Se generaron ${columns.length} columna(s) × ${targets.length} componente(s) (versión ${targetVersion}).`,
          variant: "success",
        });
      }

      router.refresh();
      onSaved?.();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo guardar la tabla.";
      toast({ title: "Error al guardar", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setSaveProgress((p) => ({ ...p, open: false }));
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-3 min-w-0">
      {/* Cabecera del wizard */}
      <Card className="relative overflow-visible">
        {/* Insignia de versión anclada visualmente a la esquina superior derecha del Card */}
        <VersionBadge
          version={targetVersion}
          variant={isEditMode ? "edit" : "create"}
          className="absolute top-3 right-4 z-10"
        />

        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pr-20">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              {isEditMode ? "Editar tabla" : "Diseño de tablas"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? `Modifica los campos o el orden de "${editingTable?.nombre}".`
                : "Construye una tabla virtual asociando columnas a un área, motivo y uno o más componentes."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditMode && onBackToCatalog && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToCatalog}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Volver al catálogo
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={requestCancel}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Banner informativo en modo edición */}
      {isEditMode && editingTable && (
        <Card
          className={
            isNewVersion
              ? "border-amber-300 bg-amber-50/40"
              : "border-red-200 bg-red-50/40"
          }
        >
          <CardContent className="p-4 flex items-start gap-3">
            {isNewVersion ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <TableIcon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm space-y-1 flex-1">
              <p className="font-semibold">
                {isNewVersion
                  ? `Estás creando una nueva versión (v${targetVersion})`
                  : `Editando en la misma versión (v${targetVersion})`}
              </p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-1">
                <span>
                  Tabla actual:{" "}
                  <span className="font-medium text-foreground">
                    {editingTable.nombre}
                  </span>
                </span>
                <span>·</span>
                <span>versión vigente</span>
                <Badge variant="secondary" className="align-middle">
                  v{editingTable.latestVersion}
                </Badge>
                <span>
                  con {editingTable.columnCount} columna
                  {editingTable.columnCount === 1 ? "" : "s"}.
                </span>
                <span>
                  {isNewVersion
                    ? `Como cambiaste el número de columnas (${columns.length}), se creará una nueva versión.`
                    : `Como mantienes el mismo número de columnas (${columns.length}), puedes reordenar y renombrar sin crear una nueva versión.`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stepper */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
            <StepperHeader
              steps={STEPS}
              currentStep={currentStep}
              variant={isEditMode ? "edit" : "create"}
            />

            {/* min-w-0: sin esto, el track 1fr del grid no puede encogerse
                por debajo de su contenido, lo que hace que una tabla ancha
                en el Paso 5 rompa el layout. Es el arreglo clave del overflow. */}
            <section className="flex flex-col gap-6 p-6 min-w-0">
              {currentStep === 1 && (
                <Step1SelectArea
                  selectedArea={selectedArea}
                  onSelect={handleSelectArea}
                />
              )}

              {currentStep === 2 && (
                <Step2SelectMotivo
                  area={selectedArea}
                  selectedAtmId={selectedAtm?.codigo_area_tipo_motivo ?? null}
                  selectedMotivo={selectedMotivo}
                  onSelect={handleSelectMotivo}
                />
              )}

              {currentStep === 3 && (
                <Step3SelectComponente
                  area={selectedArea}
                  motivo={selectedMotivo}
                  atm={selectedAtm}
                  selectedComponentes={selectedComponentes}
                  onToggle={handleToggleComponente}
                  allowMultiple={!isEditMode}
                />
              )}

              {currentStep === 4 && (
                <Step4BuildTable
                  motivo={selectedMotivo}
                  columns={columns}
                  onChangeColumns={setColumns}
                  tableName={tableName}
                  onChangeTableName={setTableName}
                  selectedTipoMedicion={selectedTipoMedicion}
                  onChangeTipoMedicion={setSelectedTipoMedicion}
                />
              )}

              {currentStep === 5 && (
                <Step5ConfirmTable
                  area={selectedArea}
                  motivo={selectedMotivo}
                  atm={selectedAtm}
                  componentes={selectedComponentes}
                  tipoMedicion={selectedTipoMedicion}
                  columns={columns}
                  tableName={tableName}
                  elements={elements}
                />
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={STEPS.length}
                canGoNext={canGoNext}
                isSubmitting={isSubmitting}
                isLastStep={currentStep === 5}
                canSubmit={hasUnsavedChanges}
                onBack={handleBack}
                onNext={handleNext}
                onCancel={requestCancel}
                onSubmit={handleSubmit}
              />
            </section>
          </div>
        </CardContent>
      </Card>

      {/* Vista rápida horizontal de la tabla (sólo en paso 4; en paso 5
          ya se muestra dentro del resumen de confirmación) */}
      {currentStep === 4 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Vista de la tabla (esquema horizontal)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <TablePreview
              columns={columns}
              elements={elements}
              editable={false}
              orientation="horizontal"
            />
          </CardContent>
        </Card>
      )}

      {/* Diálogo de confirmación de cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar y volver al catálogo?</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode
                ? `Estás editando la tabla "${editingTable?.nombre}". Si cancelas, perderás todos los cambios realizados y volverás al catálogo de tablas.`
                : "Si cancelas, perderás todas las selecciones y columnas agregadas hasta el momento y volverás al catálogo de tablas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={performCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, volver al catálogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SaveProgressModal progress={saveProgress} />
    </div>
  );
}