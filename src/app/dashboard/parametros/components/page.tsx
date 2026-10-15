"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { Componente } from '@/types/interfaces';
import { componenteService } from '@/services/seguridades/componente.service';
import ComponenteForm from './components/form';
import ComponenteTable from './components/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ComponentesPage() {
    const [records, setRecords] = useState<Componente[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<Componente | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [tableFilter, setTableFilter] = useState("");
    const [tablePage, setTablePage] = useState(1);
    const [tableRowsPerPage, setTableRowsPerPage] = useState(10);
    const { toast } = useToast();

    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await componenteService.getAll();
            const data = response.data || [];
            setRecords(data);
            if (data.length === 0) {
                setIsFormOpen(true);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "No se pudo cargar los componentes.";
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

    const handleEdit = (record: Componente) => {
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

    const showTable = hasFetched && !isFormOpen && records.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Componentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        Crea, edita y gestiona los componentes. El mapeo con
                        orígenes y causas se configura en{" "}
                        <strong>Flujo operativo</strong>.
                    </p>
                </CardContent>
            </Card>

            {isFormOpen ? (
                <ComponenteForm
                    record={selectedRecord}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : showTable ? (
                <ComponenteTable
                    records={records}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNew={handleAddNew}
                    filter={tableFilter}
                    onFilterChange={setTableFilter}
                    page={tablePage}
                    onPageChange={setTablePage}
                    rowsPerPage={tableRowsPerPage}
                    onRowsPerPageChange={setTableRowsPerPage}
                />
            ) : null}
        </div>
    );
}
