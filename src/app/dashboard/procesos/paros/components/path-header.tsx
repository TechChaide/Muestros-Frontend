"use client";

import { ChevronRight, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

interface PathHeaderProps {
  segments: string[];
  placeholder?: string;
  className?: string;
}

export default function PathHeader({
  segments,
  placeholder = "Aún no se ha seleccionado ningún elemento",
  className,
}: PathHeaderProps) {
  const hasPath = segments.length > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <FolderTree className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Ruta de paro
        </p>
        {hasPath ? (
          <p
            className="mt-0.5 flex flex-wrap items-center font-medium text-foreground"
            title={segments.join(" ↬ ")}
          >
            {segments.map((seg, i) => (
              <span key={`${seg}-${i}`} className="whitespace-nowrap">
                {i > 0 && (
                  <ChevronRight className="mx-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" />
                )}
                <span>{seg}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-0.5 text-muted-foreground">{placeholder}</p>
        )}
      </div>
    </div>
  );
}
