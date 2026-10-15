"use client";

import { cn } from "@/lib/utils";

export type VersionBadgeVariant = "create" | "edit";

interface VersionBadgeProps {
  /** Número de versión a mostrar (1, 2, 3, ...) */
  version: number;
  /** "create" → azul/primario | "edit" → rojo */
  variant?: VersionBadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<VersionBadgeVariant, string> = {
  create:
    "bg-primary text-primary-foreground shadow-md shadow-primary/30",
  edit: "bg-red-600 text-white shadow-md shadow-red-600/30",
};

/**
 * Insignia circular compacta que muestra "Versión N".
 * Diseñada para colocarse en la esquina superior derecha del Card
 * principal del wizard (vía posicionamiento absoluto del padre).
 */
export default function VersionBadge({
  version,
  variant = "create",
  className,
}: VersionBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "h-14 w-14 rounded-full",
        "shadow-md",
        "text-center leading-tight select-none",
        "transition-colors",
        VARIANT_CLASSES[variant],
        className
      )}
      aria-label={`Versión ${version}`}
      title={`Versión ${version}`}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="text-[8px] font-semibold uppercase tracking-wider opacity-90">
          Versión
        </span>
        <span className="text-base font-bold leading-none mt-0.5">
          v{version}
        </span>
      </div>
    </div>
  );
}