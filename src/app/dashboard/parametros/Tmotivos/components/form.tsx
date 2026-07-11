"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { TipoMotivo } from '@/types/interfaces';
import { tipoMotivoService } from '@/services/seguridades/tipoMotivo.service';
import { useState } from 'react';

const formSchema = z.object({
    codigo_tipo_motivo: z.number().optional(),
    nombre_tipo_motivo: z.string().min(1, "El nombre del tipo de motivo es requerido."),
    estado: z.string({ required_error: "El estado es requerido." }),
});

interface TipoMotivoFormProps {
    record: TipoMotivo | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function TipoMotivoForm({ record, onSuccess, onCancel }: TipoMotivoFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            codigo_tipo_motivo: record?.codigo_tipo_motivo ?? 0,
            nombre_tipo_motivo: record?.nombre_tipo_motivo ?? '',
            estado: record?.estado ?? 'A',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        
        // Construir el objeto según si es creación o edición
        const data: any = {
            codigo_tipo_motivo: values.codigo_tipo_motivo || 0,
            nombre_tipo_motivo: values.nombre_tipo_motivo,
            estado: values.estado,
        };

        try {
            await tipoMotivoService.save(data);
            toast({
                title: "Éxito",
                description: `Tipo de motivo ${record ? 'actualizado' : 'creado'} correctamente.`,
            });
            onSuccess();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado.";
            toast({
                title: "Error al guardar",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{record ? 'Editar Tipo de Motivo' : 'Nuevo Tipo de Motivo'}</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="nombre_tipo_motivo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Tipo de Motivo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Defecto de Calidad" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="estado"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Estado</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un estado" />
                                            </SelectTrigger>
                                        </FormControl>
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
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            variant={record ? 'destructive' : 'default'}
                        >
                            {isLoading ? (record ? 'Actualizando...' : 'Guardando...') : (record ? 'Actualizar' : 'Guardar')}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
