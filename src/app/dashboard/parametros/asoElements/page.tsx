"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { ElementoAsociacion } from '@/types/interfaces';
import { elementoAsociacionService } from '@/services/seguridades/elementoAsociacion.service';
import ElementoAsociacionForm from './components/form';
import ElementoAsociacionTable from './components/table';
import SubcomponentesModal from './components/subcomponentes-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ElementosAsociacionPage() {
    const [records, setRecords] = useState<ElementoAsociacion[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ElementoAsociacion | null>(null);
    const [subcomponentesElemento, setSubcomponentesElemento] = useState<ElementoAsociacion | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { toast } = useToast();

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await elementoAsociacionService.getAll();
            const data = response.data || [];
            setRecords(data);
             if (data.length === 0) {
                setIsFormOpen(true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo cargar los elementos de asociación.";
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

    const handleEdit = (record: ElementoAsociacion) => {
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
    }

    const handleCancel = () => {
        if (records.length > 0) {
            setIsFormOpen(false);
            setSelectedRecord(null);
        }
    }

    const handleManageSubcomponentes = (record: ElementoAsociacion) => {
        setSubcomponentesElemento(record);
    };

    const showTable = hasFetched && !isFormOpen && records.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Elementos de Asociación</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Crea, edita y gestiona los elementos de asociación.</p>
                </CardContent>
            </Card>

            {isFormOpen ? (
                <ElementoAsociacionForm
                    record={selectedRecord}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : showTable ? (
                <ElementoAsociacionTable
                    records={records}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNew={handleAddNew}
                    onManageSubcomponentes={handleManageSubcomponentes}
                />
            ) : null}

            <SubcomponentesModal
                open={!!subcomponentesElemento}
                elemento={subcomponentesElemento}
                onClose={() => setSubcomponentesElemento(null)}
            />
        </div>
    );
}
