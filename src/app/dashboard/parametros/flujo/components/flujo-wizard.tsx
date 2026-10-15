"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, GitBranch, RotateCcw } from "lucide-react";
import type {
  Area,
  AreaTipoMotivo,
  Origen,
  OrigenComponente,
  TipoMotivo,
} from "@/types/interfaces";
import StepperHeader, {
  type StepDef,
} from "@/app/dashboard/opciones/tables/components/stepper-header";
import StepNavigation from "@/app/dashboard/opciones/tables/components/step-navigation";
import Step1Area from "./step1-area";
import Step2Atm from "./step2-atm";
import Step3Origenes from "./step3-origenes";
import Step4Componentes from "./step4-componentes";
import Step5Causas from "./step5-causas";

const STEPS: readonly StepDef[] = [
  { id: 1, title: "Área", description: "Selecciona el área" },
  { id: 2, title: "Motivo", description: "ATM área × motivo" },
  { id: 3, title: "Orígenes", description: "Orígenes del ATM" },
  { id: 4, title: "Componentes", description: "origen_componente" },
  { id: 5, title: "Causas", description: "Causas por OC" },
] as const;

type StepId = 1 | 2 | 3 | 4 | 5;

interface FlujoWizardProps {
  onFinished: () => void;
  onCancel: () => void;
}

export default function FlujoWizard({ onFinished, onCancel }: FlujoWizardProps) {
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const [area, setArea] = useState<Area | null>(null);
  const [atm, setAtm] = useState<AreaTipoMotivo | null>(null);
  const [motivo, setMotivo] = useState<TipoMotivo | null>(null);
  const [origenes, setOrigenes] = useState<Origen[]>([]);
  const [selectedOrigen, setSelectedOrigen] = useState<Origen | null>(null);
  const [ocs, setOcs] = useState<OrigenComponente[]>([]);

  const handleOrigenesChange = useCallback((list: Origen[]) => {
    setOrigenes(list);
    setSelectedOrigen((prev) => {
      if (prev && list.some((o) => o.codigo_origen === prev.codigo_origen)) {
        return list.find((o) => o.codigo_origen === prev.codigo_origen) ?? null;
      }
      return list[0] ?? null;
    });
  }, []);

  const handleOcsChange = useCallback((list: OrigenComponente[]) => {
    setOcs(list);
  }, []);

  const handleSelectArea = (a: Area) => {
    setArea(a);
    setAtm(null);
    setMotivo(null);
    setOrigenes([]);
    setSelectedOrigen(null);
    setOcs([]);
  };

  const handleSelectAtm = (nextAtm: AreaTipoMotivo, nextMotivo: TipoMotivo) => {
    setAtm(nextAtm);
    setMotivo(nextMotivo);
    setOrigenes([]);
    setSelectedOrigen(null);
    setOcs([]);
  };

  const canGoNext = useMemo(() => {
    if (currentStep === 1) return !!area;
    if (currentStep === 2) return !!atm;
    if (currentStep === 3) return origenes.length > 0;
    if (currentStep === 4) return ocs.length > 0;
    if (currentStep === 5) return true;
    return false;
  }, [currentStep, area, atm, origenes.length, ocs.length]);

  const pathBadges = useMemo(() => {
    const items: string[] = [];
    if (area) items.push(area.nombre_area);
    if (motivo) items.push(motivo.nombre_tipo_motivo);
    if (selectedOrigen && currentStep >= 4) {
      items.push(selectedOrigen.nombre_origen);
    }
    return items;
  }, [area, motivo, selectedOrigen, currentStep]);

  return (
    <div className="flex flex-col gap-4 pt-3 min-w-0">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Configurar flujo operativo
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ATM → Origen → origen_componente → causa_defecto en un solo
              recorrido.
            </p>
            {pathBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pathBadges.map((b) => (
                  <Badge key={b} variant="secondary">
                    {b}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={onCancel}
            >
              <ChevronLeft className="h-4 w-4" />
              Inicio
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setShowCancelDialog(true)}
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
              {currentStep === 1 && (
                <Step1Area selectedArea={area} onSelect={handleSelectArea} />
              )}
              {currentStep === 2 && area && (
                <Step2Atm
                  area={area}
                  selectedAtm={atm}
                  selectedMotivo={motivo}
                  onSelect={handleSelectAtm}
                />
              )}
              {currentStep === 3 && atm && (
                <Step3Origenes
                  atm={atm}
                  motivo={motivo}
                  origenes={origenes}
                  onOrigenesChange={handleOrigenesChange}
                />
              )}
              {currentStep === 4 && (
                <Step4Componentes
                  origenes={origenes}
                  selectedOrigen={selectedOrigen}
                  onSelectOrigen={setSelectedOrigen}
                  ocs={ocs}
                  onOcsChange={handleOcsChange}
                />
              )}
              {currentStep === 5 && (
                <Step5Causas origenes={origenes} ocs={ocs} />
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={STEPS.length}
                canGoNext={canGoNext}
                isLastStep={currentStep === 5}
                onBack={() =>
                  setCurrentStep((s) => Math.max(1, s - 1) as StepId)
                }
                onNext={() =>
                  setCurrentStep((s) => Math.min(5, s + 1) as StepId)
                }
                onCancel={() => setShowCancelDialog(true)}
                onSubmit={onFinished}
                submitLabel="Finalizar"
              />
            </section>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del wizard?</AlertDialogTitle>
            <AlertDialogDescription>
              Lo que ya guardaste en cada paso (ATM, orígenes, vínculos, causas)
              permanece. Solo se cancela la sesión del asistente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir aquí</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
