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
import type { ElementoAsociacion } from '@/types/interfaces';
import { elementoAsociacionService } from '@/services/seguridades/elementoAsociacion.service';
import { useState } from 'react';

const formSchema = z.object({
    codigo_elemento_asociacion: z.number().optional(),
    columna: z.string().min(1, "El nombre de la columna es requerido."),
    descripcion: z.string().min(1, "La descripción es requerida."),
    estado: z.string({ required_error: "El estado es requerido." }),
});

interface ElementoAsociacionFormProps {
    record: ElementoAsociacion | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function ElementoAsociacionForm({ record, onSuccess, onCancel }: ElementoAsociacionFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            codigo_elemento_asociacion: record?.codigo_elemento_asociacion ?? 0,
            columna: record?.columna ?? '',
            descripcion: record?.descripcion ?? '',
            estado: record?.estado ?? 'A',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        
        // Construir el objeto según si es creación o edición
        const data: ElementoAsociacion = {
            codigo_elemento_asociacion: values.codigo_elemento_asociacion || 0,
            columna: values.columna,
            descripcion: values.descripcion,
            estado: values.estado,
        };

        try {
            await elementoAsociacionService.save(data);
            toast({
                title: "Éxito",
                description: `Elemento de asociación ${record ? 'actualizado' : 'creado'} correctamente.`,
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
                <CardTitle>{record ? 'Editar Elemento de Asociación' : 'Nuevo Elemento de Asociación'}</CardTitle>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="columna"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Columna</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: codigo_componente" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="descripcion"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Descripción del elemento" {...field} />
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
