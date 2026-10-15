"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepDef {
  id: number;
  title: string;
  description: string;
}

export type StepperVariant = "create" | "edit";

interface StepperHeaderProps {
  steps: readonly StepDef[];
  currentStep: number;
  /**
   * "create" → paleta primaria (azul, por defecto)
   * "edit"   → paleta roja para indicar que se está editando una tabla existente
   */
  variant?: StepperVariant;
}

const VARIANT_ACTIVE: Record<StepperVariant, string> = {
  create: "bg-primary text-primary-foreground border-primary",
  edit: "bg-red-600 text-white border-red-600",
};

const VARIANT_COMPLETED: Record<StepperVariant, string> = {
  create: "bg-primary text-primary-foreground border-primary",
  edit: "bg-red-600 text-white border-red-600",
};

const VARIANT_INFO_BOX: Record<
  StepperVariant,
  { container: string; text: string }
> = {
  create: {
    container: "border-blue-200 bg-blue-50/60",
    text: "text-blue-900",
  },
  edit: {
    container: "border-red-200 bg-red-50/60",
    text: "text-red-900",
  },
};

const VARIANT_TITLE: Record<StepperVariant, string> = {
  create: "Diseñador de tablas",
  edit: "Editor de tablas",
};

const VARIANT_BODY: Record<StepperVariant, string> = {
  create:
    "Construye paso a paso la tabla virtual que se asociará al área y motivo seleccionados. Cada columna representa un elemento de asociación.",
  edit:
    "Estás editando una tabla existente. Las selecciones de área, motivo y componente están fijadas por la tabla original. Puedes reordenar, renombrar o reemplazar columnas; si modificas la cantidad, se generará una nueva versión.",
};

export default function StepperHeader({
  steps,
  currentStep,
  variant = "create",
}: StepperHeaderProps) {
  const info = VARIANT_INFO_BOX[variant];

  return (
    <aside className="bg-slate-50 border-r p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold border transition-colors",
                  isActive
                    ? VARIANT_ACTIVE[variant]
                    : isCompleted
                    ? VARIANT_COMPLETED[variant]
                    : "bg-white text-muted-foreground border-slate-200"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="flex flex-col pt-1">
                <span
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    isActive || isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
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

      <div
        className={cn(
          "rounded-md border p-4 text-xs leading-relaxed",
          info.container,
          info.text
        )}
      >
        <p className="font-semibold mb-1">{VARIANT_TITLE[variant]}</p>
        <p>{VARIANT_BODY[variant]}</p>
      </div>
    </aside>
  );
}