"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AreaTipoMotivo, Origen, TipoMotivo } from "@/types/interfaces";
import { origenService } from "@/services/seguridades/origen.service";
import { normalizeOrigenNombre } from "@/lib/origen-nombre";

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

interface OrigenEditModalProps {
  open: boolean;
  origen: Origen | null;
  selectedAtm: AreaTipoMotivo | null;
  selectedMotivo: TipoMotivo | null;
  usuarioSession: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function OrigenEditModal({
  open,
  origen,
  selectedAtm,
  selectedMotivo,
  usuarioSession,
  onClose,
  onSaved,
}: OrigenEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [estado, setEstado] = useState("A");
  const { toast } = useToast();

  // Sincroniza los inputs cuando se abre el modal con un origen distinto
  useEffect(() => {
    if (origen) {
      setNombre(origen.nombre_origen ?? "");
      setEstado(origen.estado ?? "A");
    }
  }, [origen]);

  if (!origen) return null;

  const handleSave = async () => {
    const nombreNorm = normalizeOrigenNombre(nombre);
    if (!nombreNorm) {
      toast({
        title: "Validación",
        description: "El nombre del origen es requerido.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // EDICIÓN: enviamos fecha_modificacion + usuario_modificacion
      // (sacado del session storage). El backend distingue crear/editar por codigo_origen.
      const data: Origen = {
        codigo_origen: origen.codigo_origen,
        codigo_area_tipo_motivo: selectedAtm?.codigo_area_tipo_motivo ?? origen.codigo_area_tipo_motivo,
        nombre_origen: nombreNorm,
        estado,
        usuario_modificacion: usuarioSession,
        fecha_modificacion: formatDateForSQLServer(new Date()),
      };
      await origenService.save(data);
      toast({
        title: "Origen actualizado",
        description: `El origen "${data.nombre_origen}" fue actualizado correctamente.`,
        variant: "success",
      });
      onSaved();
      onClose();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo actualizar el origen.";
      toast({ title: "Error al actualizar", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar origen</DialogTitle>
          <DialogDescription>
            Modifica el nombre o estado del origen asociado al motivo
            seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info no editable: motivo */}
          {selectedMotivo && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Motivo asociado
              </span>
              <div className="mt-1 font-medium">{selectedMotivo.nombre_tipo_motivo}</div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Nombre del origen
            </label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(normalizeOrigenNombre(e.target.value))}
              placeholder="EJ CLIENTE A"
            />
            <p className="text-xs text-muted-foreground">
              Mayúsculas, sin acentos ni caracteres especiales.
            </p>          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estado
            </label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">
                  <div className="flex items-center">
                    Activo
                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                  </div>
                </SelectItem>
                <SelectItem value="I">
                  <div className="flex items-center">
                    Inactivo
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500"></span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            variant="destructive"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Guardando..." : "Actualizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
