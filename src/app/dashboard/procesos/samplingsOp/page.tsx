"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, Ruler } from "lucide-react";
import type { Area, MuestreoTablaVirtual } from "@/types/interfaces";
import { useToast } from "@/hooks/use-toast";
import { useAreaDesdeDepartamento } from "@/hooks/use-area-desde-departamento";
import { cn } from "@/lib/utils";
import StepperHeader, { type StepDef } from "../samplings/components/stepper-header";
import StepNavigation from "../samplings/components/step-navigation";
import Step2SelectMotivoMuestreo from "../samplings/components/step2-select-motivo-muestreo";
import Step3SelectComponenteMuestreo from "../samplings/components/step3-select-componente-muestreo";
import Step4SelectCausaMuestreo from "../samplings/components/step4-select-causa-muestreo";
import StepSelectOrigen from "@/components/step-select-origen";
import Step5MultiSesion from "../samplings/components/step5-multi-sesion";
import { type CapturaData } from "../samplings/components/step5-capturar-muestreo";
import PathHeader from "../samplings/components/path-header";
import {
  samplingOpRutaParcialStorage,
  samplingOpRutaStorage,
  clearAllSamplingOpStorage,
  type SamplingOpRuta,
} from "./sampling-op-storage";
import StepSelectTipoMedicion from "@/components/step-select-tipo-medicion";
import { useTipoMedicionFlujo } from "@/hooks/use-tipo-medicion-flujo";
import {
  esOpcionTablaMuestreoOperador,
  type TipoMedicionFlujoPolicy,
  type TipoMedicionOption,
  nextProcesoStep,
  prevProcesoStep,
  stepHintFor,
  visibleProcesoSteps,
} from "@/lib/tipo-medicion-tabla";
import { esMotivoMuestreoOperativo } from "@/lib/flujo-seleccion";

const TIPO_STEP = 4;
const TOTAL_STEPS = 6;

const STEPS: readonly StepDef[] = [
  { id: 1, title: "Motivo", description: "Tipo de motivo aplicable" },
  { id: 2, title: "Origen", description: "Origen del ATM" },
  { id: 3, title: "Componente", description: "Componente del origen" },
  { id: 4, title: "Tipo medición", description: "Dimensional o mixto" },
  { id: 5, title: "Causa", description: "Causa de defecto" },
  { id: 6, title: "Captura", description: "Tabla dimensional o mixta + campos fijos" },
] as const;

const HINT = { total: TOTAL_STEPS, tipoStepId: TIPO_STEP };

const OPERADOR_POLICY: TipoMedicionFlujoPolicy = {
  filtro: esOpcionTablaMuestreoOperador,
  allowSinTabla: false,
  autoSelectSingle: true,
};

/**
 * Vista de muestreos operativos (tipos dimensional y mixto).
 * `/dashboard/procesos/samplingsOp`
 *
 * El área se resuelve automáticamente cruzando el DEPARTAMENTO del
 * usuario con `nombre_ficha_social` de las áreas activas (igual que
 * `/defects` y `/captura`). Solo admite motivos operativos y tablas
 * Dimensional o Mixta.
 */
export default function SamplingsOpPage() {
  const {
    isLoading: isResolviendoArea,
    error: areaError,
    departamento,
    regional,
    areasMatch,
    selectedArea,
    setSelectedArea,
  } = useAreaDesdeDepartamento();

  const [selectedAreaTipoMotivo, setSelectedAreaTipoMotivo] = useState<
    { id: number; nombre: string } | null
  >(null);
  const [selectedOrigen, setSelectedOrigen] = useState<
    { id: number; nombre: string } | null
  >(null);
  const [selectedComponente, setSelectedComponente] = useState<
    { id: number; nombre: string; codigo_origen_componente: number } | null
  >(null);
  const [selectedCausa, setSelectedCausa] = useState<
    { id: number; nombre: string } | null
  >(null);
  const {
    selectedTipoMedicion,
    setSelectedTipoMedicion,
    tiposMedicionCount,
    skipTipoMedicion,
    skipRef,
    handleTiposMedicionLoaded,
    resetTipoMedicion,
  } = useTipoMedicionFlujo(
    selectedAreaTipoMotivo?.id ?? null,
    selectedComponente?.id ?? null,
    OPERADOR_POLICY,
  );

  const [tablaVirtual] = useState<MuestreoTablaVirtual[]>([]);
  const [pathSegments, setPathSegments] = useState<string[]>([]);
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [captura, setCaptura] = useState<CapturaData | null>(null);

  const tieneTipoEnPath =
    !!selectedTipoMedicion && !selectedTipoMedicion.sinTabla;

  const hint = (step: number) => stepHintFor(step, skipTipoMedicion, HINT);

  useEffect(() => {
    if (!selectedArea) {
      setPathSegments([]);
      return;
    }
    setPathSegments((prev) => {
      const next = prev.length > 0 ? [...prev] : [""];
      next[0] = selectedArea.nombre_area ?? "(Área)";
      return next;
    });
    samplingOpRutaParcialStorage.set({ codigo_area: selectedArea.codigo_area });
  }, [selectedArea]);

  const findFilaCompleta = useCallback(
    (ruta: Required<SamplingOpRuta>): MuestreoTablaVirtual | null => {
      return (
        tablaVirtual.find(
          (f) =>
            f.codigo_area === ruta.codigo_area &&
            f.codigo_area_tipo_motivo === ruta.codigo_area_tipo_motivo &&
            f.codigo_origen === ruta.codigo_origen &&
            f.codigo_componente === ruta.codigo_componente &&
            f.codigo_causa_defecto === ruta.codigo_causa_defecto,
        ) ?? null
      );
    },
    [tablaVirtual],
  );

  const resetFromMotivo = useCallback(
    (keepArea: Area | null) => {
      setSelectedAreaTipoMotivo(null);
      setSelectedOrigen(null);
      setSelectedComponente(null);
      setSelectedCausa(null);
      resetTipoMedicion();
      samplingOpRutaStorage.clear();
      if (keepArea) {
        samplingOpRutaParcialStorage.set({ codigo_area: keepArea.codigo_area });
        setPathSegments([keepArea.nombre_area ?? "(Área)"]);
      } else {
        samplingOpRutaParcialStorage.clear();
        setPathSegments([]);
      }
    },
    [resetTipoMedicion],
  );

  const handleSelectAreaMatch = useCallback(
    (area: Area) => {
      setSelectedArea(area);
      setCurrentStep(1);
      resetFromMotivo(area);
    },
    [resetFromMotivo, setSelectedArea],
  );

  const handleSelectMotivo = useCallback(
    (motivoId: number, nombreMotivo: string) => {
      setSelectedAreaTipoMotivo({ id: motivoId, nombre: nombreMotivo });
      setSelectedOrigen(null);
      setSelectedComponente(null);
      setSelectedCausa(null);
      skipRef.current = false;

      if (selectedArea) {
        samplingOpRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: motivoId,
        });
      }
      samplingOpRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[1] = nombreMotivo;
        return next.slice(0, 2);
      });
    },
    [selectedArea, skipRef],
  );

  const handleSelectOrigen = useCallback(
    (origenId: number, nombreOrigen: string) => {
      setSelectedOrigen({ id: origenId, nombre: nombreOrigen });
      setSelectedComponente(null);
      setSelectedCausa(null);
      skipRef.current = false;

      if (selectedArea && selectedAreaTipoMotivo) {
        samplingOpRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_origen: origenId,
        });
      }
      samplingOpRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[2] = nombreOrigen;
        return next.slice(0, 3);
      });
    },
    [selectedArea, selectedAreaTipoMotivo, skipRef],
  );

  const handleSelectComponente = useCallback(
    (
      componenteId: number,
      nombreComponente: string,
      codigoOrigenComponente: number,
    ) => {
      setSelectedComponente({
        id: componenteId,
        nombre: nombreComponente,
        codigo_origen_componente: codigoOrigenComponente,
      });
      setSelectedCausa(null);
      skipRef.current = false;

      if (selectedArea && selectedAreaTipoMotivo && selectedOrigen) {
        samplingOpRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_origen: selectedOrigen.id,
          codigo_origen_componente: codigoOrigenComponente,
          codigo_componente: componenteId,
        });
      }
      samplingOpRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[3] = nombreComponente;
        return next.slice(0, 4);
      });
    },
    [selectedArea, selectedAreaTipoMotivo, selectedOrigen, skipRef],
  );

  const handleSelectTipoMedicion = useCallback(
    (option: TipoMedicionOption) => {
      setSelectedTipoMedicion(option);
      setSelectedCausa(null);
      samplingOpRutaStorage.clear();

      if (option.sinTabla) {
        setPathSegments((prev) => prev.slice(0, 4));
        return;
      }

      setPathSegments((prev) => {
        const next = [...prev];
        next[4] = option.nombre_tipo_medicion;
        return next.slice(0, 5);
      });
    },
    [setSelectedTipoMedicion],
  );

  useEffect(() => {
    if (!selectedTipoMedicion || selectedTipoMedicion.sinTabla) return;
    setPathSegments((prev) => {
      if (!prev[3]) return prev;
      if (prev[4] === selectedTipoMedicion.nombre_tipo_medicion) return prev;
      const next = [...prev];
      next[4] = selectedTipoMedicion.nombre_tipo_medicion;
      return next;
    });
  }, [selectedTipoMedicion]);

  const handleSelectCausa = useCallback(
    (causaId: number, nombreCausa: string) => {
      setSelectedCausa({ id: causaId, nombre: nombreCausa });

      if (
        selectedArea &&
        selectedAreaTipoMotivo &&
        selectedOrigen &&
        selectedComponente
      ) {
        const rutaCompleta = {
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_origen: selectedOrigen.id,
          codigo_origen_componente: selectedComponente.codigo_origen_componente,
          codigo_componente: selectedComponente.id,
          codigo_causa_defecto: causaId,
        };
        samplingOpRutaParcialStorage.set(rutaCompleta);

        const fila = findFilaCompleta(rutaCompleta) ?? {
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_tipo_motivo: 0,
          codigo_origen: selectedOrigen.id,
          codigo_origen_componente: selectedComponente.codigo_origen_componente,
          codigo_componente: selectedComponente.id,
          codigo_causa_defecto: causaId,
          nombre_area: selectedArea.nombre_area,
          nombre_ficha_social: selectedArea.nombre_ficha_social,
          nombre_tipo_motivo: selectedAreaTipoMotivo.nombre,
          nombre_origen: selectedOrigen.nombre,
          nombre_componente: selectedComponente.nombre,
          nombre_causa_defecto: nombreCausa,
        };
        samplingOpRutaStorage.set(fila);
      }

      setPathSegments((prev) => {
        const next = [...prev];
        const causaIndex = tieneTipoEnPath ? 5 : 4;
        next[causaIndex] = nombreCausa;
        return next.slice(0, causaIndex + 1);
      });
    },
    [
      findFilaCompleta,
      selectedArea,
      selectedAreaTipoMotivo,
      selectedOrigen,
      selectedComponente,
      tieneTipoEnPath,
    ],
  );

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!selectedAreaTipoMotivo;
      case 2:
        return !!selectedOrigen;
      case 3:
        return !!selectedComponente;
      case 4:
        if (skipTipoMedicion) return true;
        if (tiposMedicionCount === null) return false;
        return !!selectedTipoMedicion;
      case 5:
        return !!selectedCausa;
      case 6:
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    selectedAreaTipoMotivo,
    selectedOrigen,
    selectedComponente,
    selectedCausa,
    selectedTipoMedicion,
    tiposMedicionCount,
    skipTipoMedicion,
  ]);

  const visibleSteps = useMemo(
    () => visibleProcesoSteps(STEPS, skipTipoMedicion, TIPO_STEP),
    [skipTipoMedicion],
  );
  const totalSteps = visibleSteps.length;
  const isLastStep = currentStep === TOTAL_STEPS;

  useEffect(() => {
    if (currentStep === TIPO_STEP && skipTipoMedicion) {
      setCurrentStep(TIPO_STEP + 1);
    }
  }, [currentStep, skipTipoMedicion]);

  const handleBack = () => {
    if (currentStep <= 1) return;
    setCurrentStep((s) =>
      prevProcesoStep(s, skipRef.current, TIPO_STEP),
    );
  };

  const advanceAfterSelect = useCallback(() => {
    setCurrentStep((s) =>
      nextProcesoStep(s, skipRef.current, TOTAL_STEPS, TIPO_STEP),
    );
  }, [skipRef]);

  const handleNext = () => {
    if (!canGoNext) return;
    setCurrentStep((s) =>
      nextProcesoStep(s, skipRef.current, TOTAL_STEPS, TIPO_STEP),
    );
  };

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setCaptura(null);
    resetFromMotivo(selectedArea);
    clearAllSamplingOpStorage();
    if (selectedArea) {
      samplingOpRutaParcialStorage.set({ codigo_area: selectedArea.codigo_area });
    }
  }, [resetFromMotivo, selectedArea]);

  const handleSubmit = useCallback(() => {
    const fila = samplingOpRutaStorage.get();
    const capturaPayload = captura;

    toast({
      title: "Muestreo operativo listo para registrar",
      description:
        `Área: ${selectedArea?.nombre_area ?? "-"} · ` +
        `Motivo: ${selectedAreaTipoMotivo?.nombre ?? "-"} · ` +
        `Origen: ${selectedOrigen?.nombre ?? "-"} · ` +
        `Componente: ${selectedComponente?.nombre ?? "-"} · ` +
        `Tipo: ${selectedTipoMedicion?.nombre_tipo_medicion ?? "-"} · ` +
        `Causa: ${selectedCausa?.nombre ?? "-"}`,
    });
    if (fila) {
      console.info("[samplingsOp] fila consolidada:", fila);
    }
    if (capturaPayload) {
      console.info("[samplingsOp] datos de captura:", capturaPayload);
    }
  }, [
    selectedArea,
    selectedAreaTipoMotivo,
    selectedOrigen,
    selectedComponente,
    selectedCausa,
    selectedTipoMedicion,
    captura,
    toast,
  ]);

  if (isResolviendoArea) {
    return (
      <div className="flex flex-col gap-4 pt-3 pb-10 px-2 sm:px-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (areaError || !selectedArea) {
    return (
      <div className="flex flex-col gap-4 pt-3 pb-10 px-2 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Ruler className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Muestreos operativos
        </h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">
                  No se pudo resolver el área
                </p>
                <p className="mt-1 text-muted-foreground">
                  {areaError ??
                    "No hay un área configurada para tu departamento."}
                </p>
                {departamento ? (
                  <p className="mt-2 text-muted-foreground">
                    Departamento:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {departamento}
                    </span>
                    . El cruce usa{" "}
                    <code className="font-mono text-xs">nombre_ficha_social</code>{" "}
                    de las áreas activas.
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pt-3 pb-10 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Ruler className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Muestreos operativos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          El área se toma de tu departamento. El motivo es el muestreo
          operativo y, al medir, solo Dimensional o Mixto.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 px-3 sm:px-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Departamento</span>
            <Badge variant="secondary">{departamento || "—"}</Badge>
            <span className="text-muted-foreground">Área</span>
            <Badge>{selectedArea.nombre_area}</Badge>
            {(regional || selectedArea.regional) ? (
              <>
                <span className="text-muted-foreground">Regional</span>
                <Badge variant="outline">{regional || selectedArea.regional}</Badge>
              </>
            ) : null}
          </div>
          {areasMatch.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {areasMatch.map((a) => {
                const active = a.codigo_area === selectedArea.codigo_area;
                return (
                  <button
                    key={a.codigo_area}
                    type="button"
                    onClick={() => handleSelectAreaMatch(a)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:border-primary/40",
                    )}
                  >
                    {a.nombre_area}
                  </button>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PathHeader
        segments={pathSegments}
        placeholder="Aún no se ha seleccionado ningún elemento"
      />

      <Card>
        <CardContent className="space-y-6 pt-2 px-3 sm:px-6">
          <StepperHeader steps={visibleSteps} currentStep={currentStep} />

          {currentStep === 1 && (
            <Step2SelectMotivoMuestreo
              selectedArea={selectedArea}
              selectedMotivoId={selectedAreaTipoMotivo?.id ?? null}
              onSelect={handleSelectMotivo}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={hint(1)}
              matchesMotivo={esMotivoMuestreoOperativo}
              description="Solo se muestran muestreos operativos de esta área."
            />
          )}

          {currentStep === 2 && (
            <StepSelectOrigen
              codigoArea={selectedArea.codigo_area}
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              selectedOrigenId={selectedOrigen?.id ?? null}
              onSelect={handleSelectOrigen}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={hint(2)}
            />
          )}

          {currentStep === 3 && (
            <Step3SelectComponenteMuestreo
              selectedArea={selectedArea}
              selectedAreaTipoMotivoId={selectedAreaTipoMotivo?.id ?? null}
              selectedOrigenId={selectedOrigen?.id ?? null}
              selectedComponenteId={selectedComponente?.id ?? null}
              onSelect={handleSelectComponente}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={hint(3)}
            />
          )}

          {currentStep === 4 && !skipTipoMedicion && (
            <StepSelectTipoMedicion
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              codigoComponente={selectedComponente?.id ?? null}
              selectedCodigoTipoMedicion={
                selectedTipoMedicion?.codigo_tipo_medicion ?? null
              }
              onSelect={handleSelectTipoMedicion}
              onAfterSelect={advanceAfterSelect}
              onOptionsLoaded={handleTiposMedicionLoaded}
              stepHint={hint(4)}
              policy={OPERADOR_POLICY}
              title="Selecciona el tipo de muestreo"
              description="Solo se muestran tipos Dimensional y Mixto vigentes para este componente."
              emptyMessage="Este componente no tiene una tabla Dimensional ni Mixta. Vuelve y elige otro, o configura esas asociaciones."
            />
          )}

          {currentStep === 5 && (
            <Step4SelectCausaMuestreo
              selectedArea={selectedArea}
              selectedAreaTipoMotivoId={selectedAreaTipoMotivo?.id ?? null}
              selectedOrigenId={selectedOrigen?.id ?? null}
              selectedComponenteId={selectedComponente?.id ?? null}
              selectedOrigenComponenteId={
                selectedComponente?.codigo_origen_componente ?? null
              }
              selectedCausaId={selectedCausa?.id ?? null}
              onSelect={handleSelectCausa}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={hint(5)}
            />
          )}

          {currentStep === 6 && (
            <Step5MultiSesion
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              codigoComponente={selectedComponente?.id ?? null}
              codigoTipoMedicion={
                selectedTipoMedicion?.codigo_tipo_medicion ?? null
              }
              codigoArea={selectedArea.codigo_area}
              responsables={selectedArea.respCtrlProd ?? ""}
              tablaVirtual={tablaVirtual}
              defaults={{
                departamento: selectedArea.nombre_area ?? "",
                motivo: selectedAreaTipoMotivo?.nombre ?? "",
                origen: selectedOrigen?.nombre ?? "",
                componente: selectedComponente?.nombre ?? "",
                causa_defecto: selectedCausa?.nombre ?? "",
                regional: regional || selectedArea.regional || "",
              }}
              filaConsolidada={
                selectedAreaTipoMotivo &&
                selectedOrigen &&
                selectedComponente &&
                selectedCausa
                  ? {
                      codigo_area: selectedArea.codigo_area,
                      codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
                      codigo_tipo_motivo: 0,
                      codigo_origen: selectedOrigen.id,
                      codigo_origen_componente:
                        selectedComponente.codigo_origen_componente,
                      codigo_componente: selectedComponente.id,
                      codigo_causa_defecto: selectedCausa.id,
                      nombre_area: selectedArea.nombre_area,
                      nombre_ficha_social: selectedArea.nombre_ficha_social,
                      nombre_tipo_motivo: selectedAreaTipoMotivo.nombre,
                      nombre_origen: selectedOrigen.nombre,
                      nombre_componente: selectedComponente.nombre,
                      nombre_causa_defecto: selectedCausa.nombre,
                    }
                  : null
              }
              onChange={setCaptura}
            />
          )}

          <StepNavigation
            currentStep={currentStep}
            totalSteps={totalSteps}
            canGoNext={canGoNext}
            isLastStep={isLastStep}
            hideSubmit={isLastStep}
            onBack={handleBack}
            onNext={handleNext}
            onCancel={handleReset}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
