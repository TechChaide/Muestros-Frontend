"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Copy,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
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
  Origen,
  OrigenComponente,
  TipoMedicion,
  TipoMotivo,
} from "@/types/interfaces";
import { asociacionService } from "@/services/seguridades/asociacion.service";
import { origenService } from "@/services/seguridades/origen.service";
import { origenComponenteService } from "@/services/seguridades/origenComponente.service";
import { componenteService } from "@/services/seguridades/componente.service";
import { elementoAsociacionService } from "@/services/seguridades/elementoAsociacion.service";
import { tipoMedicionService } from "@/services/seguridades/tipoMedicion.service";
import type { ElementoAsociacion } from "@/types/interfaces";
import { cn } from "@/lib/utils";
import StepperHeader, { type StepDef } from "./stepper-header";
import StepNavigation from "./step-navigation";
import Step1SelectArea from "./step1-select-area";
import Step2SelectMotivo from "./step2-select-motivo";
import Step4BuildTable from "./step4-build-table";
import TablePreview, { type ColumnDef } from "./table-preview";
import type { ExistingTable } from "./tables-catalog";

const STEPS: readonly StepDef[] = [
  { id: 1, title: "Origen", description: "Tabla a replicar" },
  { id: 2, title: "Campos", description: "Ajusta columnas y tipo" },
  { id: 3, title: "Destino", description: "Área y motivo destino" },
  { id: 4, title: "Componente", description: "Cablear en el flujo" },
  { id: 5, title: "Confirmar", description: "Revisa y guarda" },
] as const;

type StepId = 1 | 2 | 3 | 4 | 5;

type DestinoPhase = "area" | "motivo";

type WireMode = "existing" | "pick" | "create";

function extractList<T>(res: unknown): T[] {
  const respAny = res as Record<string, unknown>;
  const candidates =
    (respAny?.data as Record<string, unknown>)?.data ??
    respAny?.data ??
    respAny?.payload ??
    respAny?.body ??
    [];
  return Array.isArray(candidates) ? (candidates as T[]) : [];
}

interface ReplicateTableWizardProps {
  sourceTable: ExistingTable;
  onBackToCatalog: () => void;
  onSaved?: () => void;
}

export default function ReplicateTableWizard({
  sourceTable,
  onBackToCatalog,
  onSaved,
}: ReplicateTableWizardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [destinoPhase, setDestinoPhase] = useState<DestinoPhase>("area");

  const [tableName, setTableName] = useState(sourceTable.nombre);
  const [columns, setColumns] = useState<ColumnDef[]>(
    sourceTable.columns.map((c) => ({
      uid: c.uid,
      codigo_elemento_asociacion: c.codigo_elemento_asociacion,
      etiqueta: c.etiqueta,
    })),
  );
  const [selectedTipoMedicion, setSelectedTipoMedicion] =
    useState<TipoMedicion | null>(sourceTable.tipoMedicion ?? null);

  const [destArea, setDestArea] = useState<Area | null>(null);
  const [destAtm, setDestAtm] = useState<AreaTipoMotivo | null>(null);
  const [destMotivo, setDestMotivo] = useState<TipoMotivo | null>(null);

  const [elements, setElements] = useState<ElementoAsociacion[]>([]);
  const [existingTableKeys, setExistingTableKeys] = useState<Set<string>>(
    new Set(),
  );

  const [origenesDestino, setOrigenesDestino] = useState<Origen[]>([]);
  const [componenteYaCableado, setComponenteYaCableado] = useState(false);
  const [origenesQueTienenComponente, setOrigenesQueTienenComponente] =
    useState<Origen[]>([]);
  const [loadingWire, setLoadingWire] = useState(false);

  const [wireMode, setWireMode] = useState<WireMode>("pick");
  const [selectedOrigenId, setSelectedOrigenId] = useState<number | null>(null);
  const [nuevoNombreOrigen, setNuevoNombreOrigen] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const sourceAtmId = sourceTable.atm?.codigo_area_tipo_motivo ?? null;
  const sourceComponente = sourceTable.componente;

  // Catálogo de elementos (nombres de columna) y tipos de medición
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [elRes, tmRes] = await Promise.all([
          elementoAsociacionService.getAll(),
          tipoMedicionService.getAll(),
        ]);
        if (cancelled) return;
        setElements(
          ((elRes.data || []) as ElementoAsociacion[]).filter(
            (el) => el.estado === "A",
          ),
        );
        if (!selectedTipoMedicion && sourceTable.codigo_tipo_medicion) {
          const found = ((tmRes.data || []) as TipoMedicion[])
            .filter((t) => t.estado === "A")
            .find(
              (t) =>
                t.codigo_tipo_medicion === sourceTable.codigo_tipo_medicion,
            );
          if (found) setSelectedTipoMedicion(found);
        }
      } catch {
        // no bloquea
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  // Firmas de tablas activas (ATM + nombre + tipo_medicion) para colisiones.
  // Mismo ATM está permitido si cambia el tipo de medición o el nombre.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await asociacionService.getAll();
        if (cancelled) return;
        const activas = ((res.data || []) as Asociacion[]).filter(
          (a) => a.estado === "A",
        );
        const keys = new Set<string>();
        for (const a of activas) {
          const tm = Number(a.codigo_tipo_medicion) || 0;
          keys.add(
            `${a.codigo_area_tipo_motivo}__${a.tabla.toLowerCase().trim()}__${tm}`,
          );
        }
        setExistingTableKeys(keys);
      } catch {
        // no bloquea
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const destTableKey = useMemo(() => {
    if (!destAtm || !selectedTipoMedicion) return null;
    return `${destAtm.codigo_area_tipo_motivo}__${tableName
      .toLowerCase()
      .trim()}__${selectedTipoMedicion.codigo_tipo_medicion}`;
  }, [destAtm, tableName, selectedTipoMedicion]);

  const hasNameCollision = useMemo(() => {
    if (!destTableKey) return false;
    return existingTableKeys.has(destTableKey);
  }, [destTableKey, existingTableKeys]);

  const isSameAtm = useMemo(() => {
    if (!destAtm || sourceAtmId == null) return false;
    return destAtm.codigo_area_tipo_motivo === sourceAtmId;
  }, [destAtm, sourceAtmId]);

  const isSameTipoMedicion = useMemo(() => {
    if (!selectedTipoMedicion || !sourceTable.codigo_tipo_medicion) {
      return false;
    }
    return (
      selectedTipoMedicion.codigo_tipo_medicion ===
      sourceTable.codigo_tipo_medicion
    );
  }, [selectedTipoMedicion, sourceTable.codigo_tipo_medicion]);

  const loadWireState = useCallback(
    async (atm: AreaTipoMotivo) => {
      if (!sourceComponente) return;
      setLoadingWire(true);
      try {
        const [compRes, origenRes, ocRes] = await Promise.all([
          componenteService.getComponentesByCodigoAreaTipoMotivo(
            atm.codigo_area_tipo_motivo,
          ),
          origenService.getOrigenesByCodigoAreaTipoMotivo(
            atm.codigo_area_tipo_motivo,
          ),
          origenComponenteService.getAll(),
        ]);

        let origenes = extractList<Origen>(origenRes).filter(
          (o) => o.estado === "A",
        );
        // Fallback si el endpoint especializado no trae lista usable
        if (origenes.length === 0) {
          const all = await origenService.getAll();
          origenes = ((all.data || []) as Origen[]).filter(
            (o) =>
              o.estado === "A" &&
              o.codigo_area_tipo_motivo === atm.codigo_area_tipo_motivo,
          );
        }

        const componentes = extractList<{
          codigo_componente: number;
          estado?: string;
        }>(compRes).filter((c) => c.estado !== "I");

        const yaEnFlujo = componentes.some(
          (c) => c.codigo_componente === sourceComponente.codigo_componente,
        );

        const allOc = ((ocRes.data || []) as OrigenComponente[]).filter(
          (oc) =>
            oc.estado === "A" &&
            oc.codigo_componente === sourceComponente.codigo_componente,
        );
        const origenIds = new Set(origenes.map((o) => o.codigo_origen));
        const ocsDelAtm = allOc.filter((oc) => origenIds.has(oc.codigo_origen));
        const origenesConComp = origenes.filter((o) =>
          ocsDelAtm.some((oc) => oc.codigo_origen === o.codigo_origen),
        );

        setOrigenesDestino(origenes);
        setComponenteYaCableado(yaEnFlujo || origenesConComp.length > 0);
        setOrigenesQueTienenComponente(origenesConComp);

        if (yaEnFlujo || origenesConComp.length > 0) {
          setWireMode("existing");
          setSelectedOrigenId(origenesConComp[0]?.codigo_origen ?? null);
        } else if (origenes.length > 0) {
          setWireMode("pick");
          setSelectedOrigenId(origenes[0].codigo_origen);
        } else {
          setWireMode("create");
          setSelectedOrigenId(null);
          setNuevoNombreOrigen(
            sourceTable.motivo?.nombre_tipo_motivo
              ? `Origen ${sourceTable.motivo.nombre_tipo_motivo}`
              : "Origen principal",
          );
        }
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo verificar el cableado del componente.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoadingWire(false);
      }
    },
    [sourceComponente, sourceTable.motivo, toast],
  );

  useEffect(() => {
    if (currentStep === 4 && destAtm) {
      void loadWireState(destAtm);
    }
  }, [currentStep, destAtm, loadWireState]);

  const handleSelectArea = (area: Area) => {
    setDestArea(area);
    setDestAtm(null);
    setDestMotivo(null);
    setDestinoPhase("motivo");
  };

  const handleSelectMotivo = (atm: AreaTipoMotivo, motivo: TipoMotivo) => {
    setDestAtm(atm);
    setDestMotivo(motivo);
  };

  const restoreSourceColumns = useCallback(() => {
    setColumns(
      sourceTable.columns.map((c) => ({
        uid: c.uid,
        codigo_elemento_asociacion: c.codigo_elemento_asociacion,
        etiqueta: c.etiqueta,
      })),
    );
  }, [sourceTable.columns]);

  const canGoNext = useMemo(() => {
    if (currentStep === 1) {
      return !!sourceComponente && !!sourceTable.atm;
    }
    if (currentStep === 2) {
      return (
        !!tableName.trim() &&
        columns.length > 0 &&
        !!selectedTipoMedicion
      );
    }
    if (currentStep === 3) {
      if (destinoPhase === "area") return !!destArea;
      return (
        !!destAtm &&
        !!destMotivo &&
        !hasNameCollision &&
        !!tableName.trim() &&
        !!selectedTipoMedicion
      );
    }
    if (currentStep === 4) {
      if (loadingWire) return false;
      if (componenteYaCableado || wireMode === "existing") return true;
      if (wireMode === "pick") return selectedOrigenId != null;
      if (wireMode === "create") return !!nuevoNombreOrigen.trim();
      return false;
    }
    if (currentStep === 5) {
      return (
        !!destAtm &&
        !!sourceComponente &&
        !!tableName.trim() &&
        columns.length > 0 &&
        !hasNameCollision &&
        !!selectedTipoMedicion
      );
    }
    return false;
  }, [
    currentStep,
    tableName,
    selectedTipoMedicion,
    sourceComponente,
    sourceTable.atm,
    columns.length,
    destinoPhase,
    destArea,
    destAtm,
    destMotivo,
    hasNameCollision,
    loadingWire,
    componenteYaCableado,
    wireMode,
    selectedOrigenId,
    nuevoNombreOrigen,
  ]);

  const handleNext = () => {
    if (currentStep === 3 && destinoPhase === "area" && destArea) {
      setDestinoPhase("motivo");
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((s) => (s + 1) as StepId);
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && destinoPhase === "motivo") {
      setDestinoPhase("area");
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((s) => (s - 1) as StepId);
    }
  };

  const resolveCreatedOrigenId = async (
    atmId: number,
    nombre: string,
    saveRes: unknown,
  ): Promise<number> => {
    const data = (saveRes as { data?: Origen | Origen[] })?.data;
    if (data && !Array.isArray(data) && data.codigo_origen > 0) {
      return data.codigo_origen;
    }
    if (Array.isArray(data)) {
      const found = data.find(
        (o) =>
          o.nombre_origen.trim().toLowerCase() === nombre.trim().toLowerCase() &&
          o.codigo_area_tipo_motivo === atmId,
      );
      if (found) return found.codigo_origen;
    }
    const all = await origenService.getAll();
    const match = ((all.data || []) as Origen[])
      .filter(
        (o) =>
          o.estado === "A" &&
          o.codigo_area_tipo_motivo === atmId &&
          o.nombre_origen.trim().toLowerCase() === nombre.trim().toLowerCase(),
      )
      .sort((a, b) => b.codigo_origen - a.codigo_origen)[0];
    if (!match) {
      throw new Error(
        "Se creó el origen pero no se pudo obtener su código. Revisa Parámetros.",
      );
    }
    return match.codigo_origen;
  };

  const handleSubmit = async () => {
    if (!destAtm || !sourceComponente) return;
    if (!selectedTipoMedicion) {
      toast({
        title: "Tipo de medición requerido",
        description: "Selecciona un tipo de medición antes de replicar.",
        variant: "destructive",
      });
      return;
    }
    if (hasNameCollision) {
      toast({
        title: "Tabla duplicada",
        description:
          "Ya existe una tabla con ese nombre y tipo de medición en el destino. Cambia el nombre o el tipo en el paso 1.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let needsOc =
        !componenteYaCableado && wireMode !== "existing";
      let origenIdForOc = selectedOrigenId;

      if (needsOc && wireMode === "create") {
        const nombre = nuevoNombreOrigen.trim();
        const saveRes = await origenService.save({
          codigo_origen: 0,
          codigo_area_tipo_motivo: destAtm.codigo_area_tipo_motivo,
          nombre_origen: nombre,
          estado: "A",
        });
        origenIdForOc = await resolveCreatedOrigenId(
          destAtm.codigo_area_tipo_motivo,
          nombre,
          saveRes,
        );
      }

      if (needsOc && origenIdForOc != null) {
        const allOc = await origenComponenteService.getAll();
        const existente = ((allOc.data || []) as OrigenComponente[]).find(
          (oc) =>
            oc.codigo_origen === origenIdForOc &&
            oc.codigo_componente === sourceComponente.codigo_componente,
        );

        if (existente) {
          if (existente.estado !== "A") {
            await origenComponenteService.save({
              ...existente,
              estado: "A",
            });
          }
        } else {
          await origenComponenteService.save({
            codigo_origen_componente: 0,
            codigo_origen: origenIdForOc,
            codigo_componente: sourceComponente.codigo_componente,
            estado: "A",
          });
        }
      }

      const nombreFinal = tableName.trim();
      if (!selectedTipoMedicion) {
        throw new Error("Selecciona un tipo de medición antes de replicar.");
      }
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        await asociacionService.save({
          codigo_asociacion: 0,
          codigo_elemento_asociacion: col.codigo_elemento_asociacion,
          codigo_componente: sourceComponente.codigo_componente,
          codigo_area_tipo_motivo: destAtm.codigo_area_tipo_motivo,
          codigo_tipo_medicion: selectedTipoMedicion.codigo_tipo_medicion,
          tabla: nombreFinal,
          tabla_version: 1,
          orden: i + 1,
          etiqueta: col.etiqueta.trim() || `columna_${i + 1}`,
          estado: "A",
        } as unknown as Asociacion);
      }

      toast({
        title: "Tabla replicada",
        description: needsOc
          ? `Se crearon ${columns.length} columnas y se cableó el componente en el destino.`
          : `Se crearon ${columns.length} columnas en el destino (el componente ya estaba en el flujo).`,
        variant: "success",
      });

      router.refresh();
      onSaved?.();
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo completar la réplica.";
      toast({ title: "Error al replicar", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-3 min-w-0">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Replicar tabla
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Copia una tabla a otro (o el mismo) área/motivo, ajustando
              columnas y tipo de medición, y cablea el componente en el flujo.
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
            <StepperHeader steps={STEPS} currentStep={currentStep} />

            <section className="flex flex-col gap-6 p-6 min-w-0">
              {/* Paso 1: resumen origen */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <span className="text-sm text-primary font-medium">
                      Paso 1 de 5
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Tabla origen
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Esta es la tabla base. En el siguiente paso podrás
                      agregar, quitar o reordenar campos antes de elegir el
                      destino.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <InfoRow
                      label="Área"
                      value={sourceTable.area?.nombre_area ?? "—"}
                    />
                    <InfoRow
                      label="Motivo"
                      value={sourceTable.motivo?.nombre_tipo_motivo ?? "—"}
                    />
                    <InfoRow
                      label="Componente"
                      value={sourceComponente?.nombre_componente ?? "—"}
                    />
                    <InfoRow
                      label="Versión origen"
                      value={`v${sourceTable.latestVersion}`}
                    />
                    <InfoRow
                      label="Nombre"
                      value={sourceTable.nombre}
                    />
                    <InfoRow
                      label="Tipo medición origen"
                      value={
                        sourceTable.tipoMedicion?.nombre_tipo_medicion ??
                        (sourceTable.codigo_tipo_medicion
                          ? `cód. ${sourceTable.codigo_tipo_medicion}`
                          : "—")
                      }
                    />
                    <InfoRow
                      label="Columnas origen"
                      value={String(sourceTable.columnCount)}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      Columnas actuales ({sourceTable.columns.length})
                    </p>
                    <TablePreview
                      columns={sourceTable.columns.map((c) => ({
                        uid: c.uid,
                        codigo_elemento_asociacion: c.codigo_elemento_asociacion,
                        etiqueta: c.etiqueta,
                      }))}
                      elements={elements}
                      editable={false}
                      orientation="horizontal"
                    />
                  </div>
                </div>
              )}

              {/* Paso 2: ajustar campos / nombre / tipo */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Partes de la tabla origen. Puedes modificar libremente
                      nombre, tipo de medición y columnas.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={restoreSourceColumns}
                    >
                      Restaurar columnas del origen
                    </Button>
                  </div>
                  <Step4BuildTable
                    motivo={sourceTable.motivo}
                    columns={columns}
                    onChangeColumns={setColumns}
                    tableName={tableName}
                    onChangeTableName={setTableName}
                    selectedTipoMedicion={selectedTipoMedicion}
                    onChangeTipoMedicion={setSelectedTipoMedicion}
                    stepHint="Paso 2 de 5"
                    title="Ajusta la tabla a replicar"
                    description="Agrega, quita, renombra o reordena columnas. También puedes cambiar el nombre y el tipo de medición de la copia."
                  />
                </div>
              )}

              {/* Paso 3: destino */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  {destinoPhase === "area" ? (
                    <Step1SelectArea
                      selectedArea={destArea}
                      onSelect={handleSelectArea}
                      stepHint="Paso 3 de 5 · Área destino"
                      description="Elige el área donde se creará la copia de la tabla."
                    />
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          Área:{" "}
                          <span className="font-medium text-foreground">
                            {destArea?.nombre_area}
                          </span>
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDestinoPhase("area");
                            setDestAtm(null);
                            setDestMotivo(null);
                          }}
                        >
                          Cambiar área
                        </Button>
                      </div>
                      <Step2SelectMotivo
                        area={destArea}
                        selectedAtmId={
                          destAtm?.codigo_area_tipo_motivo ?? null
                        }
                        selectedMotivo={destMotivo}
                        onSelect={handleSelectMotivo}
                        stepHint="Paso 3 de 5 · Motivo destino"
                        description={`Elige el motivo del área ${destArea?.nombre_area ?? ""} donde se replicará la tabla.`}
                      />
                    </>
                  )}

                  {destAtm && isSameAtm && (
                    <AlertBox variant="warn">
                      Destino = mismo área/motivo que el origen. Está permitido
                      si usas otro tipo de medición o un nombre de tabla
                      distinto.
                      {isSameTipoMedicion
                        ? " Ahora mismo el tipo de medición coincide con el origen."
                        : ""}
                    </AlertBox>
                  )}
                  {destAtm && hasNameCollision && (
                    <AlertBox variant="danger">
                      Ya existe una tabla llamada &quot;{tableName.trim()}&quot;
                      con este tipo de medición en el destino. Vuelve al paso 2
                      y cambia el nombre o el tipo de medición.
                    </AlertBox>
                  )}
                </div>
              )}

              {/* Paso 4: cablear componente */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <span className="text-sm text-primary font-medium">
                      Paso 4 de 5
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Cablear componente
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      El componente{" "}
                      <span className="font-medium text-foreground">
                        {sourceComponente?.nombre_componente}
                      </span>{" "}
                      debe estar asociado al destino vía origen →
                      origen_componente para que aparezca en captura.
                    </p>
                  </div>

                  {loadingWire ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando flujo en el destino...
                    </div>
                  ) : componenteYaCableado ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                      <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Componente ya asociado al flujo destino
                      </p>
                      {origenesQueTienenComponente.length > 0 ? (
                        <ul className="text-sm text-emerald-900/80 list-disc pl-5">
                          {origenesQueTienenComponente.map((o) => (
                            <li key={o.codigo_origen}>{o.nombre_origen}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-emerald-900/80">
                          El componente ya es seleccionable en este
                          área/motivo.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AlertBox variant="warn">
                        El componente no está cableado en el destino. Elige un
                        origen existente o crea uno nuevo; al guardar se creará
                        la asociación origen_componente.
                      </AlertBox>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={wireMode === "pick" ? "default" : "outline"}
                          disabled={origenesDestino.length === 0}
                          onClick={() => setWireMode("pick")}
                        >
                          Usar origen existente
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            wireMode === "create" ? "default" : "outline"
                          }
                          onClick={() => setWireMode("create")}
                          className="gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Crear origen nuevo
                        </Button>
                      </div>

                      {wireMode === "pick" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {origenesDestino.length === 0 ? (
                            <p className="text-sm text-muted-foreground col-span-full">
                              No hay orígenes en este destino. Crea uno nuevo.
                            </p>
                          ) : (
                            origenesDestino.map((o) => {
                              const selected =
                                selectedOrigenId === o.codigo_origen;
                              return (
                                <button
                                  key={o.codigo_origen}
                                  type="button"
                                  onClick={() =>
                                    setSelectedOrigenId(o.codigo_origen)
                                  }
                                  className={cn(
                                    "rounded-lg border p-3 text-left text-sm transition-colors",
                                    selected
                                      ? "border-primary bg-primary/5"
                                      : "hover:border-primary/40",
                                  )}
                                >
                                  <span className="font-medium">
                                    {o.nombre_origen}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}

                      {wireMode === "create" && (
                        <div className="space-y-2 max-w-md">
                          <Label htmlFor="nuevo-origen">
                            Nombre del nuevo origen
                          </Label>
                          <Input
                            id="nuevo-origen"
                            value={nuevoNombreOrigen}
                            onChange={(e) =>
                              setNuevoNombreOrigen(e.target.value)
                            }
                            placeholder="Ej. Línea principal"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paso 5: confirmar */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <span className="text-sm text-primary font-medium">
                      Paso 5 de 5
                    </span>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Confirmar réplica
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Se crearán las columnas en el destino. Las causas de
                      defecto no se copian.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <InfoRow
                      label="Desde"
                      value={`${sourceTable.area?.nombre_area ?? "—"} · ${sourceTable.motivo?.nombre_tipo_motivo ?? "—"}`}
                    />
                    <InfoRow
                      label="Hacia"
                      value={`${destArea?.nombre_area ?? "—"} · ${destMotivo?.nombre_tipo_motivo ?? "—"}`}
                    />
                    <InfoRow label="Tabla" value={tableName.trim()} />
                    <InfoRow
                      label="Tipo de medición"
                      value={
                        selectedTipoMedicion?.nombre_tipo_medicion ?? "—"
                      }
                    />
                    <InfoRow
                      label="Componente"
                      value={sourceComponente?.nombre_componente ?? "—"}
                    />
                    <InfoRow
                      label="Columnas"
                      value={String(columns.length)}
                    />
                    <InfoRow
                      label="Cableado"
                      value={
                        componenteYaCableado || wireMode === "existing"
                          ? "Ya existía en el destino"
                          : wireMode === "create"
                            ? `Crear origen "${nuevoNombreOrigen.trim()}" + origen_componente`
                            : `Asociar a origen existente + origen_componente`
                      }
                    />
                  </div>

                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
                    <Link2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>ATM destino:</span>
                      <Badge variant="outline" className="align-middle">
                        {destAtm?.codigo_area_tipo_motivo}
                      </Badge>
                      <span>· Versión nueva:</span>
                      <Badge variant="secondary" className="align-middle">
                        v1
                      </Badge>
                    </div>
                  </div>

                  <TablePreview
                    columns={columns}
                    elements={elements}
                    editable={false}
                    orientation="horizontal"
                  />
                </div>
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={STEPS.length}
                canGoNext={canGoNext}
                isSubmitting={isSubmitting}
                isLastStep={currentStep === 5}
                onBack={handleBack}
                onNext={handleNext}
                onCancel={() => setShowCancelDialog(true)}
                onSubmit={handleSubmit}
                submitLabel="Replicar tabla"
                nextLabel={
                  currentStep === 3 && destinoPhase === "area"
                    ? "Elegir motivo"
                    : "Siguiente"
                }
              />
            </section>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la réplica?</AlertDialogTitle>
            <AlertDialogDescription>
              Volverás al catálogo sin crear columnas ni asociaciones en el
              destino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBackToCatalog}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, volver al catálogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function AlertBox({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm flex items-start gap-2",
        variant === "warn"
          ? "border-amber-300 bg-amber-50/60 text-amber-950"
          : "border-red-300 bg-red-50/60 text-red-950",
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
