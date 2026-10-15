"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { ElementoAsociacion, Subcomponentes } from "@/types/interfaces";
import { subcomponentesService } from "@/services/seguridades/subcomponentes.service";
import { Edit, Plus, ArrowLeft } from "lucide-react";
import SubcomponenteForm from "./subcomponente-form";

interface SubcomponentesModalProps {
  open: boolean;
  elemento: ElementoAsociacion | null;
  onClose: () => void;
}

export default function SubcomponentesModal({
  open,
  elemento,
  onClose,
}: SubcomponentesModalProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<Subcomponentes[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [selected, setSelected] = useState<Subcomponentes | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!elemento) return;
    setIsLoading(true);
    try {
      const response =
        await subcomponentesService.getSubcomponentesByCodigoElementoAsociacion(
          elemento.codigo_elemento_asociacion,
        );
      setRecords(response.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los subcomponentes.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [elemento, toast]);

  useEffect(() => {
    if (!open || !elemento) return;
    setView("list");
    setSelected(null);
    fetchRecords();
  }, [open, elemento, fetchRecords]);

  const handleAddNew = () => {
    setSelected(null);
    setView("form");
  };

  const handleEdit = (record: Subcomponentes) => {
    setSelected(record);
    setView("form");
  };

  const handleFormSuccess = () => {
    setView("list");
    setSelected(null);
    fetchRecords();
  };

  const handleFormCancel = () => {
    setView("list");
    setSelected(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {view === "form"
              ? selected
                ? "Editar subcomponente"
                : "Nuevo subcomponente"
              : "Subcomponentes"}
          </DialogTitle>
          <DialogDescription>
            {elemento
              ? `Elemento #${elemento.codigo_elemento_asociacion} — ${
                  elemento.descripcion || elemento.columna
                }`
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "form" && elemento ? (
            <div className="space-y-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={handleFormCancel}
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Volver al listado
              </Button>
              <SubcomponenteForm
                record={selected}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                defaultElementoCodigo={elemento.codigo_elemento_asociacion}
                lockElemento
                embedded
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button type="button" size="sm" onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir subcomponente
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Operador</TableHead>
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
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-6 w-16 rounded-full" />
                            </TableCell>
                            <TableCell className="text-right">
                              <Skeleton className="ml-auto h-8 w-8" />
                            </TableCell>
                          </TableRow>
                        ))
                      : records.map((r) => (
                          <TableRow key={r.codigo_subcomponente}>
                            <TableCell className="font-medium">
                              {r.codigo_subcomponente}
                            </TableCell>
                            <TableCell>{r.descripcion}</TableCell>
                            <TableCell>{r.puesto_trabajo}</TableCell>
                            <TableCell>{r.codigo_operador}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.estado === "A" ? "default" : "destructive"
                                }
                                className={
                                  r.estado === "A" ? "bg-green-600" : ""
                                }
                              >
                                {r.estado === "A" ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(r)}
                              >
                                <Edit className="mr-1 h-4 w-4" />
                                Editar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    {!isLoading && records.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Este elemento aún no tiene subcomponentes.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
