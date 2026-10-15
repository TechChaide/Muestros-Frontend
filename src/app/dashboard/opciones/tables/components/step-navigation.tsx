"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  /** Habilita el botón "Guardar tabla". Por defecto true. */
  canSubmit?: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
  submitLabel?: string;
}

export default function StepNavigation({
  currentStep,
  totalSteps,
  canGoNext,
  isSubmitting = false,
  isLastStep = false,
  canSubmit = true,
  onBack,
  onNext,
  onCancel,
  onSubmit,
  nextLabel = "Siguiente",
  submitLabel = "Guardar tabla",
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;

  return (
    <div className="flex items-center justify-between pt-6 mt-auto border-t">
      <Button
        type="button"
        variant="outline"
        onClick={isFirstStep ? onCancel : onBack}
        disabled={isSubmitting}
      >
        {isFirstStep ? (
          "Cancelar"
        ) : (
          <>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Atrás
          </>
        )}
      </Button>

      {isLastStep ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !canGoNext || !canSubmit}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
        >
          {nextLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}