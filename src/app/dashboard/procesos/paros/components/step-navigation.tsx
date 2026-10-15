"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  canSubmit?: boolean;
  hideSubmit?: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit?: () => void;
  nextLabel?: string;
}

export default function StepNavigation({
  currentStep,
  canGoNext,
  isSubmitting = false,
  isLastStep = false,
  canSubmit = true,
  hideSubmit = false,
  onBack,
  onNext,
  onCancel,
  onSubmit,
  nextLabel = "Siguiente",
}: StepNavigationProps) {
  const isFirstStep = currentStep === 1;

  return (
    <div className="flex flex-col-reverse gap-2 pt-6 mt-auto border-t sm:flex-row sm:items-center sm:justify-between sm:gap-0">
      <Button
        type="button"
        variant="outline"
        onClick={isFirstStep ? onCancel : onBack}
        disabled={isSubmitting}
        className="w-full sm:w-auto"
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
        hideSubmit ? null : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canGoNext || !canSubmit}
            className="w-full bg-green-600 hover:bg-green-700 text-white sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Guardando..." : "Guardar paro"}
          </Button>
        )
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSubmitting}
          className="w-full sm:w-auto"
        >
          {nextLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
