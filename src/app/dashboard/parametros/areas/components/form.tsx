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
import type { Area } from '@/types/interfaces';
import { areaService } from '@/services/seguridades/area.service';
import { useState } from 'react';

// Mapeos de regional
const regionalMap: Record<string, string> = {
  'UIO': 'Quito',
  'GYE': 'Guayaquil',
};

const inverseRegionalMap: Record<string, string> = {
  'Quito': 'UIO',
  'Guayaquil': 'GYE',
};

const formSchema = z.object({
    codigo_area: z.number().optional(),
    nombre_area: z.string().min(1, "El nombre del área es requerido."),
    nombre_ficha_social: z.string().min(1, "El nombre de la ficha social es requerido."),
    regional: z.string({ required_error: "La regional es requerida." }),
    estado: z.string({ required_error: "El estado es requerido." }),
});

interface AreaFormProps {
    record: Area | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AreaForm({ record, onSuccess, onCancel }: AreaFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            codigo_area: record?.codigo_area ?? 0,
            nombre_area: record?.nombre_area ?? '',
            nombre_ficha_social: record?.nombre_ficha_social ?? '',
            regional: record?.regional ? regionalMap[record.regional] ?? record.regional : '',
            estado: record?.estado ?? 'A',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        
        // Construir el objeto según si es creación o edición
        const data: any = {
            codigo_area: values.codigo_area || 0,
            nombre_area: values.nombre_area,
            nombre_ficha_social: values.nombre_ficha_social,
            regional: inverseRegionalMap[values.regional] || values.regional,
            estado: values.estado,
        };

        try {
            await areaService.save(data);
            toast({
                title: "Éxito",
                description: `Área ${record ? 'actualizada' : 'creada'} correctamente.`,
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
                <CardTitle>{record ? 'Editar Área' : 'Nueva Área'}</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="nombre_area"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Área</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Área de Producción" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="nombre_ficha_social"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre de Ficha Social</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Ficha Social - Producción" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="regional"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Regional</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione una regional" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Quito">Quito</SelectItem>
                                            <SelectItem value="Guayaquil">Guayaquil</SelectItem>
                                        </SelectContent>
                                    </Select>
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
