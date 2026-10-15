"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import type { Area, MuestreoTablaVirtual } from "@/types/interfaces";
import { useToast } from "@/hooks/use-toast";
import StepperHeader, { type StepDef } from "./components/stepper-header";
import StepNavigation from "./components/step-navigation";
import Step1SelectAreaMuestreo from "./components/step1-select-area-muestreo";
import Step2SelectMotivoMuestreo from "./components/step2-select-motivo-muestreo";
import Step3SelectComponenteMuestreo from "./components/step3-select-componente-muestreo";
import StepSelectOrigen from "@/components/step-select-origen";
import Step5CapturarMuestreo, {
  type CapturaData,
} from "./components/step5-capturar-muestreo";
import PathHeader from "./components/path-header";
import {
  samplingRutaParcialStorage,
  samplingRutaStorage,
  clearAllSamplingStorage,
} from "./sampling-storage";
import StepSelectTipoMedicion from "@/components/step-select-tipo-medicion";
import { useTipoMedicionFlujo } from "@/hooks/use-tipo-medicion-flujo";
import {
  type TipoMedicionOption,
  nextProcesoStep,
  prevProcesoStep,
  stepHintFor,
  visibleProcesoSteps,
} from "@/lib/tipo-medicion-tabla";

/**
 * Pasos del wizard. Sincronizar este array con la cantidad de
 * segmentos que pinta `<PathHeader>`.
 */
const STEPS: readonly StepDef[] = [
  { id: 1, title: "Área", description: "Área muestreable del inspector" },
  { id: 2, title: "Motivo", description: "Tipo de motivo aplicable" },
  { id: 3, title: "Origen", description: "Origen del ATM" },
  { id: 4, title: "Componente", description: "Componente muestreable" },
  { id: 5, title: "Tipo medición", description: "Tipo de medición / tabla" },
  { id: 6, title: "Captura", description: "Cantidad, causas y tabla" },
] as const;

/** Total interno del wizard de muestreos (sin el paso de causa). */
const SAMPLING_STEPS_TOTAL = STEPS.length;

/**
 * Vista principal para capturar muestreos de calidad.
 * `/dashboard/procesos/samplings`
 *
 * Flujo:
 *   1. Área
 *   2. Motivo (ATM vía areaTipoMotivo + tipoMotivo)
 *   3. Origen (origenService)
 *   4. Componente (origen_componente + componente)
 *   5. Tipo de medición (se omite si no hay tablas)
 *   6. Captura: cantidad y causas se eligen en cada fila
 */
export default function SamplingsPage() {
  // Estado del wizard
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [selectedAreaTipoMotivo, setSelectedAreaTipoMotivo] = useState<
    { id: number; nombre: string } | null
  >(null);
  const [selectedOrigen, setSelectedOrigen] = useState<
    { id: number; nombre: string } | null
  >(null);
  const [selectedComponente, setSelectedComponente] = useState<
    { id: number; nombre: string; codigo_origen_componente: number } | null
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
  );

  const [tablaVirtual] = useState<MuestreoTablaVirtual[]>([]);

  // Path acumulativo. Cada paso escribe su segmento en el índice (paso-1).
  const [pathSegments, setPathSegments] = useState<string[]>([]);

  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Estado del paso 5 (captura): datos del formulario controlado.
  const [captura, setCaptura] = useState<CapturaData | null>(null);

  // -------- Handlers de selección --------
  const handleSelectArea = useCallback(
    (area: Area | null) => {
      setSelectedArea(area);
      setSelectedAreaTipoMotivo(null);
      setSelectedOrigen(null);
      setSelectedComponente(null);
      skipRef.current = false;

      // Ruta parcial: solo area. Limpia la fila consolidada porque la
      // ruta ya no es la misma.
      if (area) {
        samplingRutaParcialStorage.set({ codigo_area: area.codigo_area });
      } else {
        samplingRutaParcialStorage.clear();
      }
      samplingRutaStorage.clear();

      setPathSegments((prev) => {
        if (!area) return [];
        const next = [...prev];
        next[0] = area.nombre_area ?? "(Área sin nombre)";
        return next.slice(0, 1);
      });
    },
    [],
  );

  const handleSelectMotivo = useCallback(
    (motivoId: number, nombreMotivo: string) => {
      setSelectedAreaTipoMotivo({ id: motivoId, nombre: nombreMotivo });
      setSelectedOrigen(null);
      setSelectedComponente(null);
      skipRef.current = false;

      if (selectedArea) {
        samplingRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: motivoId,
        });
      }
      samplingRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[1] = nombreMotivo;
        return next.slice(0, 2);
      });
    },
    [selectedArea],
  );

  const handleSelectOrigen = useCallback(
    (origenId: number, nombreOrigen: string) => {
      setSelectedOrigen({ id: origenId, nombre: nombreOrigen });
      setSelectedComponente(null);
      skipRef.current = false;

      if (selectedArea && selectedAreaTipoMotivo) {
        samplingRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_origen: origenId,
        });
      }
      samplingRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[2] = nombreOrigen;
        return next.slice(0, 3);
      });
    },
    [selectedArea, selectedAreaTipoMotivo],
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
      skipRef.current = false;

      if (selectedArea && selectedAreaTipoMotivo && selectedOrigen) {
        samplingRutaParcialStorage.set({
          codigo_area: selectedArea.codigo_area,
          codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
          codigo_origen: selectedOrigen.id,
          codigo_origen_componente: codigoOrigenComponente,
          codigo_componente: componenteId,
        });
      }
      samplingRutaStorage.clear();

      setPathSegments((prev) => {
        const next = [...prev];
        next[3] = nombreComponente;
        return next.slice(0, 4);
      });
    },
    [selectedArea, selectedAreaTipoMotivo, selectedOrigen],
  );

  const handleSelectTipoMedicion = useCallback(
    (option: TipoMedicionOption) => {
      setSelectedTipoMedicion(option);
      samplingRutaStorage.clear();

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

  // -------- Reglas para habilitar Siguiente --------
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 1:
        return !!selectedArea;
      case 2:
        return !!selectedAreaTipoMotivo;
      case 3:
        return !!selectedOrigen;
      case 4:
        return !!selectedComponente;
      case 5:
        if (skipTipoMedicion) return true;
        if (tiposMedicionCount === null) return false;
        return !!selectedTipoMedicion;
      case 6:
        return true;
      default:
        return false;
    }
  }, [
    currentStep,
    selectedArea,
    selectedAreaTipoMotivo,
    selectedOrigen,
    selectedComponente,
    selectedTipoMedicion,
    tiposMedicionCount,
    skipTipoMedicion,
  ]);

  const visibleSteps = useMemo(
    () => visibleProcesoSteps(STEPS, skipTipoMedicion),
    [skipTipoMedicion],
  );
  const totalSteps = visibleSteps.length;
  const isLastStep = currentStep === STEPS.length;

  useEffect(() => {
    if (currentStep === 5 && skipTipoMedicion) {
      setCurrentStep(6);
    }
  }, [currentStep, skipTipoMedicion]);

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => prevProcesoStep(s, skipRef.current));
    }
  };

  /**
   * Avanza al siguiente paso SIN consultar `canGoNext`.
   * Se usa desde `onAfterSelect`: la selección ya validó el valor;
   * `canGoNext` aún no se actualizó en ese tick (obligaría doble click).
   */
  const advanceAfterSelect = useCallback(() => {
    setCurrentStep((s) => nextProcesoStep(s, skipRef.current, SAMPLING_STEPS_TOTAL));
  }, [skipRef]);

  /** Botón "Siguiente": aquí sí exigimos selección (ya renderizada). */
  const handleNext = () => {
    if (!canGoNext) return;
    setCurrentStep((s) => nextProcesoStep(s, skipRef.current, SAMPLING_STEPS_TOTAL));
  };

  const handleReset = useCallback(() => {
    setSelectedArea(null);
    setSelectedAreaTipoMotivo(null);
    setSelectedOrigen(null);
    setSelectedComponente(null);
    resetTipoMedicion();
    setPathSegments([]);
    setCurrentStep(1);
    // Limpiamos toda la persistencia del wizard.
    clearAllSamplingStorage();
  }, [resetTipoMedicion]);

  // Acción final: por ahora muestra un toast con el consolidado. La
  // persistencia (POST a /api/registro + /api/detalle) se implementará
  // cuando llegue el paso de captura final.
  const handleSubmit = useCallback(() => {
    // La fila consolidada del paso 4 contiene los FKs consolidados.
    const fila = samplingRutaStorage.get();
    // El paso 5 expone los valores capturados por el usuario.
    const capturaPayload = captura;

    toast({
      title: "Muestreo listo para registrar",
      description:
        `Área: ${selectedArea?.nombre_area ?? "-"} · ` +
        `Motivo: ${selectedAreaTipoMotivo?.nombre ?? "-"} · ` +
        `Origen: ${selectedOrigen?.nombre ?? "-"} · ` +
        `Componente: ${selectedComponente?.nombre ?? "-"}`,
    });
    if (fila) {
      // eslint-disable-next-line no-console
      console.info("[samplings] fila consolidada:", fila);
    }
    if (capturaPayload) {
      // eslint-disable-next-line no-console
      console.info("[samplings] datos de captura:", capturaPayload);
    }
    // El POST real a /api/registro + /api/detalle se implementará
    // cuando confirmes el modelo. De momento solo persistimos en log.
  }, [
    selectedArea,
    selectedAreaTipoMotivo,
    selectedOrigen,
    selectedComponente,
    captura,
    toast,
  ]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 pt-3 pb-10 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Muestreos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Captura de muestreos de calidad. El inspector elige área, motivo,
          origen, componente y, ya en la captura, las causas de cada fila.
        </p>
      </div>

      <PathHeader segments={pathSegments} />

      <Card>
        <CardContent className="space-y-6 pt-2 px-3 sm:px-6">
          <StepperHeader steps={visibleSteps} currentStep={currentStep} />

          {currentStep === 1 && (
            <Step1SelectAreaMuestreo
              selectedArea={selectedArea}
              onSelect={handleSelectArea}
              onAfterSelect={advanceAfterSelect}
            />
          )}

          {currentStep === 2 && (
            <Step2SelectMotivoMuestreo
              selectedArea={selectedArea}
              selectedMotivoId={selectedAreaTipoMotivo?.id ?? null}
              onSelect={handleSelectMotivo}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
            />
          )}

          {currentStep === 3 && (
            <StepSelectOrigen
              codigoArea={selectedArea?.codigo_area ?? null}
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              selectedOrigenId={selectedOrigen?.id ?? null}
              onSelect={handleSelectOrigen}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={stepHintFor(3, skipTipoMedicion, { total: SAMPLING_STEPS_TOTAL })}
            />
          )}

          {currentStep === 4 && (
            <Step3SelectComponenteMuestreo
              selectedArea={selectedArea}
              selectedAreaTipoMotivoId={selectedAreaTipoMotivo?.id ?? null}
              selectedOrigenId={selectedOrigen?.id ?? null}
              selectedComponenteId={selectedComponente?.id ?? null}
              onSelect={handleSelectComponente}
              onAfterSelect={advanceAfterSelect}
              tablaVirtual={tablaVirtual}
              stepHint={stepHintFor(4, skipTipoMedicion, { total: SAMPLING_STEPS_TOTAL })}
            />
          )}

          {currentStep === 5 && !skipTipoMedicion && (
            <StepSelectTipoMedicion
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              codigoComponente={selectedComponente?.id ?? null}
              selectedCodigoTipoMedicion={
                selectedTipoMedicion?.codigo_tipo_medicion ?? null
              }
              onSelect={handleSelectTipoMedicion}
              onAfterSelect={advanceAfterSelect}
              onOptionsLoaded={handleTiposMedicionLoaded}
              stepHint={stepHintFor(5, skipTipoMedicion, { total: SAMPLING_STEPS_TOTAL })}
            />
          )}

          {currentStep === 6 && (
            <Step5CapturarMuestreo
              codigoAreaTipoMotivo={selectedAreaTipoMotivo?.id ?? null}
              codigoComponente={selectedComponente?.id ?? null}
              codigoTipoMedicion={
                selectedTipoMedicion?.codigo_tipo_medicion ?? null
              }
              codigoArea={selectedArea?.codigo_area ?? null}
              responsables={selectedArea?.respCtrlProd ?? ""}
              stepHint={stepHintFor(6, skipTipoMedicion, {
                total: SAMPLING_STEPS_TOTAL,
              })}
              defaults={{
                departamento: selectedArea?.nombre_area ?? "",
                motivo: selectedAreaTipoMotivo?.nombre ?? "",
                origen: selectedOrigen?.nombre ?? "",
                componente: selectedComponente?.nombre ?? "",
                regional: selectedArea?.regional ?? "",
              }}
              tablaVirtual={tablaVirtual}
              filaConsolidada={
                selectedArea &&
                selectedAreaTipoMotivo &&
                selectedOrigen &&
                selectedComponente
                  ? {
                      codigo_area: selectedArea.codigo_area,
                      codigo_area_tipo_motivo: selectedAreaTipoMotivo.id,
                      codigo_tipo_motivo: 0,
                      codigo_origen: selectedOrigen.id,
                      codigo_origen_componente:
                        selectedComponente.codigo_origen_componente,
                      codigo_componente: selectedComponente.id,
                      codigo_causa_defecto: 0,
                      nombre_area: selectedArea.nombre_area,
                      nombre_ficha_social: selectedArea.nombre_ficha_social,
                      nombre_tipo_motivo: selectedAreaTipoMotivo.nombre,
                      nombre_origen: selectedOrigen.nombre,
                      nombre_componente: selectedComponente.nombre,
                      nombre_causa_defecto: "",
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
            /*
              En el último paso ocultamos el botón de submit incrustado
              porque el guardado se dispara desde los botones flotantes
              del paso 5 (Iniciar / Parar / Cancelar / Guardar registro).
            */
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

