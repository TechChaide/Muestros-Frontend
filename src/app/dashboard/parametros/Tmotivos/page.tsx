"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { TipoMotivo } from '@/types/interfaces';
import { tipoMotivoService } from '@/services/seguridades/tipoMotivo.service';
import TipoMotivoForm from './components/form';
import TipoMotivoTable from './components/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TipoMotivosPage() {
    const [records, setRecords] = useState<TipoMotivo[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<TipoMotivo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { toast } = useToast();

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await tipoMotivoService.getAll();
            const data = response.data || [];
            setRecords(data);
             if (data.length === 0) {
                setIsFormOpen(true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo cargar los tipos de motivo.";
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

    const handleEdit = (record: TipoMotivo) => {
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

    const showTable = hasFetched && !isFormOpen && records.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Tipos de Motivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Crea, edita y gestiona los tipos de motivo.</p>
                </CardContent>
            </Card>

            {isFormOpen ? (
                <TipoMotivoForm
                    record={selectedRecord}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : showTable ? (
                <TipoMotivoTable
                    records={records}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNew={handleAddNew}
                />
            ) : null}
        </div>
    );
}
