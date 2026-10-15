"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { Area } from '@/types/interfaces';
import { areaService } from '@/services/seguridades/area.service';
import AreaForm from './components/form';
import AreaTable from './components/table';
import TipoMotivoAssociation from './components/tipo-motivo-association';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

export default function AreasPage() {
    const [records, setRecords] = useState<Area[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { toast } = useToast();

    const [recordToDelete, setRecordToDelete] = useState<Area | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [associateArea, setAssociateArea] = useState<Area | null>(null);

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await areaService.getAll();
            const data = response.data || [];
            setRecords(data);
            if (data.length === 0) {
                setIsFormOpen(true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo cargar las áreas.";
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            });
            setIsFormOpen(true);
        } finally {
            setIsLoading(false);
            setHasFetched(true);
        }
    }, [toast]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleEdit = (record: Area) => {
        setSelectedRecord(record);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setSelectedRecord(null);
        setIsFormOpen(true);
    };

    const handleSuccess = () => {
        fetchRecords();
        setIsFormOpen(false);
        setSelectedRecord(null);
    };

    const handleCancel = () => {
        if (records.length > 0) {
            setIsFormOpen(false);
            setSelectedRecord(null);
        }
    };

    const handleAskDelete = (record: Area) => {
        setRecordToDelete(record);
    };

    const handleCancelDelete = () => {
        if (isDeleting) return;
        setRecordToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!recordToDelete) return;
        setIsDeleting(true);
        try {
            await areaService.delete(recordToDelete.codigo_area);
            toast({
                title: "Área eliminada",
                description: `El área "${recordToDelete.nombre_area}" se eliminó correctamente.`,
            });
            setRecordToDelete(null);
            await fetchRecords();
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "No se pudo eliminar el área.";
            toast({
                title: "Error al eliminar",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAssociateMotivos = (record: Area) => {
        setAssociateArea(record);
    };

    const showTable = hasFetched && !isFormOpen && !associateArea && records.length > 0;

    if (associateArea) {
        return (
            <TipoMotivoAssociation
                area={associateArea}
                onClose={() => setAssociateArea(null)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Áreas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        Crea, edita y gestiona las áreas. Desde las acciones de
                        cada área puedes asociar motivos y, en cada motivo,
                        orígenes de datos. El recorrido completo también está en{" "}
                        <strong>Flujo operativo</strong>.
                    </p>
                </CardContent>
            </Card>

            {isFormOpen ? (
                <AreaForm
                    record={selectedRecord}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : showTable ? (
                <AreaTable
                    records={records}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNew={handleAddNew}
                    onDelete={handleAskDelete}
                    onAssociateMotivos={handleAssociateMotivos}
                />
            ) : (
                hasFetched && (
                    <div className="flex justify-center items-center p-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )
            )}

            <AlertDialog
                open={!!recordToDelete}
                onOpenChange={(open) => {
                    if (!open) handleCancelDelete();
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar área?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {recordToDelete
                                ? `Se eliminará el área "${recordToDelete.nombre_area}". Esta acción no se puede deshacer.`
                                : "Esta acción no se puede deshacer."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
