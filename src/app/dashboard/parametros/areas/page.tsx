"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { Area } from '@/types/interfaces';
import { areaService } from '@/services/seguridades/area.service';
import AreaForm from './components/form';
import AreaTable from './components/table';
import OriginAssociationView from './components/origin-association';
import TipoMotivoAssociation from './components/tipo-motivo-association';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AreasPage() {
    const [records, setRecords] = useState<Area[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAssociatingOrigins, setIsAssociatingOrigins] = useState(false);
    const [isAssociatingMotivos, setIsAssociatingMotivos] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const { toast } = useToast();

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

    const handleAssociateOrigins = (record: Area) => {
        setSelectedRecord(record);
        setIsAssociatingOrigins(true);
    };

    const handleCloseOriginAssociation = () => {
        setIsAssociatingOrigins(false);
        setSelectedRecord(null);
    };

    const handleAssociateMotivos = (record: Area) => {
        setSelectedRecord(record);
        setIsAssociatingMotivos(true);
    };

    const handleCloseMotivoAssociation = () => {
        setIsAssociatingMotivos(false);
        setSelectedRecord(null);
    };

    const showTable = hasFetched && !isFormOpen && records.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Áreas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Crea, edita y gestiona las áreas de la organización.</p>
                </CardContent>
            </Card>

            {isFormOpen ? (
                <AreaForm
                    record={selectedRecord}
                    onSuccess={handleSuccess}
                    onCancel={handleCancel}
                />
            ) : isAssociatingOrigins && selectedRecord ? (
                <OriginAssociationView
                    area={selectedRecord}
                    onClose={handleCloseOriginAssociation}
                />
            ) : isAssociatingMotivos && selectedRecord ? (
                <TipoMotivoAssociation
                    area={selectedRecord}
                    onClose={handleCloseMotivoAssociation}
                />
            ) : showTable ? (
                <AreaTable
                    records={records}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onAddNew={handleAddNew}
                    onAssociateOrigins={handleAssociateOrigins}
                    onAssociateMotivos={handleAssociateMotivos}
                />
            ) : null}
        </div>
    );
}
