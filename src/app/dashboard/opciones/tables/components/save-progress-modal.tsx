"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export type SaveProgressState = {
  open: boolean;
  current: number;
  total: number;
  label: string;
};

interface SaveProgressModalProps {
  progress: SaveProgressState;
}

export default function SaveProgressModal({ progress }: SaveProgressModalProps) {
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : 0;

  return (
    <Dialog open={progress.open}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/40 backdrop-blur-md"
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Guardando tabla
          </DialogTitle>
          <DialogDescription>
            {progress.label || "Procesando asociaciones…"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <Progress value={pct} className="h-2.5" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.current} / {progress.total}
            </span>
            <span className="font-mono tabular-nums">{pct}%</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
