"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AreaTipoMotivo } from "@/types/interfaces";
import { areaTipoMotivoService } from "@/services/seguridades/areaTipoMotivo.service";
import FuenteSelect from "@/components/fuente-select";
import { normalizeCaso, normalizeValor, type FuenteSeleccion } from "@/lib/modos";

const formatDateForSQLServer = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

interface FuenteAssignModalProps {
  open: boolean;
  /** Asociación área-tipo-motivo a la que se le asigna la fuente. */
  atm: AreaTipoMotivo | null;
  motivoNombre: string;
  onClose: () => void;
  /** Devuelve el registro actualizado para refrescar el estado del padre. */
  onSaved: (updated: AreaTipoMotivo) => void;
}

/**
 * Modal para asignar la fuente de datos (tipo_fuente + caso) a un motivo
 * que ya está asociado a un área. Persiste directamente el `AreaTipoMotivo`
 * existente (UPDATE) sin pasar por el flujo completo del wizard.
 */
export default function FuenteAssignModal({
  open,
  atm,
  motivoNombre,
  onClose,
  onSaved,
}: FuenteAssignModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [fuente, setFuente] = useState<FuenteSeleccion>({
    tipo_fuente: "MANUAL",
    valor: "",
    caso: "",
  });

  useEffect(() => {
    if (atm) {
      setFuente({
        tipo_fuente: atm.tipo_fuente || "MANUAL",
        valor: normalizeValor(atm.valor),
        caso: normalizeCaso(atm.caso),
      });
    }
  }, [atm]);

  if (!atm) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const usuarioSession =
        (typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "{}")?.usuario
          : "admin") || "admin";
      const updated: AreaTipoMotivo = {
        ...atm,
        tipo_fuente: fuente.tipo_fuente,
        // `valor` se HEREDA del modo elegido en el combo y se persiste
        // tal cual en `area_tipo_motivo`. Si el usuario cambia de modo,
        // el `valor` se sobreescribe automáticamente.
        valor: fuente.valor,
        // `caso` se persiste con el `valor` numérico del modo seleccionado
        // (identificador único del registro asociado en MODOS), NO con el
        // texto visible. Esto es lo que el backend espera como referencia.
        caso: fuente.valor,
        estado: "A",
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      };
      await areaTipoMotivoService.save(updated);
      toast({
        title: "Fuente asignada",
        description: `Se asignó la fuente de datos al motivo "${motivoNombre}".`,
        variant: "success",
      });
      onSaved(updated);
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo asignar la fuente.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Asignar fuente de datos</DialogTitle>
          <DialogDescription>
            Define cómo se recuperará la información del formulario para este
            motivo (manual, consulta a un SP o escaneo).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Motivo
            </span>
            <div className="mt-1 font-medium">{motivoNombre}</div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fuente de datos
            </label>
            <FuenteSelect value={fuente} onChange={setFuente} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
