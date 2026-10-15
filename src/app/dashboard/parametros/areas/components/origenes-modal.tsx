"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Area, AreaTipoMotivo, Origen, TipoMotivo } from "@/types/interfaces";
import { origenService } from "@/services/seguridades/origen.service";
import { areaService } from "@/services/seguridades/area.service";
import {
  normalizeOrigenNombre,
  ORIGEN_OPCION_OTROS,
} from "@/lib/origen-nombre";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import OrigenEditModal from "./origen-edit-modal";

function extractList<T>(res: unknown): T[] {
  const respAny = res as Record<string, unknown>;
  const candidates =
    (respAny?.data as Record<string, unknown>)?.data ??
    respAny?.data ??
    respAny?.payload ??
    respAny?.body ??
    [];
  return Array.isArray(candidates) ? (candidates as T[]) : [];
}

function getUsuarioSession(fallback = "admin"): string {
  if (typeof window === "undefined") return fallback;
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "{}")?.usuario || fallback
    );
  } catch {
    return fallback;
  }
}

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

interface OrigenesModalProps {
  open: boolean;
  atm: AreaTipoMotivo | null;
  motivoNombre: string;
  onClose: () => void;
}

export default function OrigenesModal({
  open,
  atm,
  motivoNombre,
  onClose,
}: OrigenesModalProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<Origen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFichas, setIsLoadingFichas] = useState(false);
  const [fichasSociales, setFichasSociales] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState("");
  const [otrosNombre, setOtrosNombre] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<Origen | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!atm) return;
    setIsLoading(true);
    try {
      let lista = extractList<Origen>(
        await origenService.getOrigenesByCodigoAreaTipoMotivo(
          atm.codigo_area_tipo_motivo,
        ),
      ).filter((o) => o.estado === "A");
      if (lista.length === 0) {
        const all = await origenService.getAll();
        lista = ((all.data || []) as Origen[]).filter(
          (o) =>
            o.estado === "A" &&
            o.codigo_area_tipo_motivo === atm.codigo_area_tipo_motivo,
        );
      }
      setRecords(lista);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los orígenes.";
      toast({ title: "Error", description: msg, variant: "destructive" });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [atm, toast]);

  useEffect(() => {
    if (!open || !atm) return;
    setSelectedOption("");
    setOtrosNombre("");
    setEditing(null);
    void fetchRecords();
  }, [open, atm, fetchRecords]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setIsLoadingFichas(true);
      try {
        const res = await areaService.getAll();
        if (cancelled) return;
        const areas = ((res.data || []) as Area[]).filter((a) => a.estado === "A");
        const set = new Set<string>();
        for (const a of areas) {
          const ficha = normalizeOrigenNombre(a.nombre_ficha_social ?? "");
          if (ficha) set.add(ficha);
        }
        setFichasSociales(
          Array.from(set).sort((a, b) => a.localeCompare(b, "es")),
        );
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "No se pudo cargar las fichas sociales.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setIsLoadingFichas(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const isOtros = selectedOption === ORIGEN_OPCION_OTROS;
  const nombreResuelto = useMemo(() => {
    if (isOtros) return normalizeOrigenNombre(otrosNombre);
    if (!selectedOption) return "";
    return normalizeOrigenNombre(selectedOption);
  }, [isOtros, otrosNombre, selectedOption]);

  const selectedMotivo: TipoMotivo | null = atm
    ? {
        codigo_tipo_motivo: atm.codigo_tipo_motivo,
        nombre_tipo_motivo: motivoNombre,
        estado: "A",
        fecha_modificacion: "",
        usuario_modificacion: "",
      }
    : null;

  const handleCreate = async () => {
    if (!atm) return;
    const nombre = nombreResuelto;
    if (!nombre) {
      toast({
        title: "Validación",
        description: isOtros
          ? "Escribe el nombre del origen en Otros."
          : "Selecciona un origen de la lista o Otros.",
        variant: "destructive",
      });
      return;
    }
    const duplicado = records.some(
      (o) => normalizeOrigenNombre(o.nombre_origen) === nombre,
    );
    if (duplicado) {
      toast({
        title: "Origen duplicado",
        description: `"${nombre}" ya está asociado a este motivo.`,
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      await origenService.save({
        codigo_origen: 0,
        codigo_area_tipo_motivo: atm.codigo_area_tipo_motivo,
        nombre_origen: nombre,
        estado: "A",
      });
      toast({
        title: "Origen asociado",
        description: `"${nombre}" quedó asociado al motivo.`,
        variant: "success",
      });
      setSelectedOption("");
      setOtrosNombre("");
      await fetchRecords();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo crear el origen.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlink = async (origen: Origen) => {
    try {
      await origenService.save({
        ...origen,
        estado: "I",
        usuario_modificacion: getUsuarioSession(),
        fecha_modificacion: formatDateForSQLServer(new Date()),
      });
      toast({
        title: "Origen desactivado",
        description: `"${origen.nombre_origen}" se desasoció del motivo.`,
        variant: "success",
      });
      await fetchRecords();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No se pudo desactivar.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Asociar orígenes de datos</DialogTitle>
            <DialogDescription>
              {atm
                ? `ATM #${atm.codigo_area_tipo_motivo} — ${motivoNombre}`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="space-y-3 rounded-md border p-3">
              <Label htmlFor="origen-ficha-select">Nuevo origen</Label>
              <select
                id="origen-ficha-select"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={selectedOption}
                disabled={isLoadingFichas || isSaving}
                onChange={(e) => {
                  setSelectedOption(e.target.value);
                  if (e.target.value !== ORIGEN_OPCION_OTROS) {
                    setOtrosNombre("");
                  }
                }}
              >
                <option value="">
                  {isLoadingFichas
                    ? "Cargando fichas sociales..."
                    : "Selecciona una ficha social..."}
                </option>
                {fichasSociales.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value={ORIGEN_OPCION_OTROS}>OTROS</option>
              </select>

              {isOtros && (
                <div className="space-y-1.5">
                  <Label htmlFor="origen-otros-input">Especificar origen</Label>
                  <Input
                    id="origen-otros-input"
                    value={otrosNombre}
                    onChange={(e) =>
                      setOtrosNombre(normalizeOrigenNombre(e.target.value))
                    }
                    placeholder="ESCRIBE EL ORIGEN"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreate();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo letras, números y espacios. Se convierte a mayúsculas.
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  disabled={!nombreResuelto || isSaving}
                  onClick={() => void handleCreate()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Asociar origen
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre del origen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? [...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-12" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16 rounded-full" />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="ml-auto h-8 w-16" />
                          </TableCell>
                        </TableRow>
                      ))
                    : records.map((r) => (
                        <TableRow key={r.codigo_origen}>
                          <TableCell className="font-medium">
                            {r.codigo_origen}
                          </TableCell>
                          <TableCell>{r.nombre_origen}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                r.estado === "A" ? "default" : "destructive"
                              }
                              className={r.estado === "A" ? "bg-green-600" : ""}
                            >
                              {r.estado === "A" ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditing(r)}
                              >
                                <Edit className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => void handleUnlink(r)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Quitar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && records.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Este motivo aún no tiene orígenes asociados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OrigenEditModal
        open={editing !== null}
        origen={editing}
        selectedAtm={atm}
        selectedMotivo={selectedMotivo}
        usuarioSession={getUsuarioSession()}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void fetchRecords();
        }}
      />
    </>
  );
}
