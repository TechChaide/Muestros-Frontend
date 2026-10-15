"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import type { ElementoAsociacion, Subcomponentes } from "@/types/interfaces";
import { subcomponentesService } from "@/services/seguridades/subcomponentes.service";
import { elementoAsociacionService } from "@/services/seguridades/elementoAsociacion.service";
import SearchableSelect from "@/components/searchable-select";
import UserAutocomplete, {
  USER_SEPARATOR,
} from "@/components/ui/user-autocomplete";

/**
 * Normaliza listas multi-valor: acepta `,` o `&` como separador de entrada
 * y persiste siempre con `USER_SEPARATOR` (`" & "`), igual que operadores.
 */
function normalizeAmpList(value: string): string {
  return value
    .split(/[,&]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(USER_SEPARATOR);
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

const getUsuarioSession = (fallback = "admin"): string => {
  if (typeof window === "undefined") return fallback;
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "{}")?.usuario || fallback
    );
  } catch {
    return fallback;
  }
};

const formSchema = z.object({
  codigo_subcomponente: z.number().optional(),
  codigo_elemento_asociacion: z
    .number({ required_error: "El elemento de asociación es requerido." })
    .min(1, "Seleccione un elemento de asociación."),
  descripcion: z.string().min(1, "La descripción es requerida."),
  puesto_trabajo: z.string().min(1, "El puesto de trabajo es requerido."),
  codigo_operador: z.string().min(1, "El código de operador es requerido."),
  estado: z.string({ required_error: "El estado es requerido." }),
});

interface SubcomponenteFormProps {
  record: Subcomponentes | null;
  onSuccess: () => void;
  onCancel: () => void;
  defaultElementoCodigo?: number | null;
  /** Fija el elemento (ocultando el selector). */
  lockElemento?: boolean;
  /** Sin Card exterior; para usar dentro de un Dialog. */
  embedded?: boolean;
}

export default function SubcomponenteForm({
  record,
  onSuccess,
  onCancel,
  defaultElementoCodigo = null,
  lockElemento = false,
  embedded = false,
}: SubcomponenteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [elementos, setElementos] = useState<ElementoAsociacion[]>([]);
  const [loadingElementos, setLoadingElementos] = useState(!lockElemento);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_subcomponente: record?.codigo_subcomponente ?? 0,
      codigo_elemento_asociacion:
        record?.codigo_elemento_asociacion ?? defaultElementoCodigo ?? 0,
      descripcion: record?.descripcion ?? "",
      puesto_trabajo: normalizeAmpList(record?.puesto_trabajo ?? ""),
      codigo_operador: normalizeAmpList(record?.codigo_operador ?? ""),
      estado: record?.estado ?? "A",
    },
  });

  useEffect(() => {
    if (lockElemento) {
      setLoadingElementos(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingElementos(true);
      try {
        const response = await elementoAsociacionService.getAll();
        const data = (response.data || []).filter((e) => e.estado === "A");
        if (!cancelled) setElementos(data);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los elementos de asociación.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingElementos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast, lockElemento]);

  const elementoOptions = useMemo(
    () =>
      elementos.map((e) => ({
        value: String(e.codigo_elemento_asociacion),
        label: `${e.codigo_elemento_asociacion} — ${e.descripcion || e.columna}${
          e.columna && e.descripcion ? ` (${e.columna})` : ""
        }`,
      })),
    [elementos],
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    const data: Subcomponentes = {
      codigo_subcomponente: values.codigo_subcomponente || 0,
      codigo_elemento_asociacion: values.codigo_elemento_asociacion,
      descripcion: values.descripcion.trim(),
      // `,` → `&` al persistir (mismo separador que operadores).
      puesto_trabajo: normalizeAmpList(values.puesto_trabajo),
      // Códigos de operador ya vienen unidos por ` & ` desde UserAutocomplete.
      codigo_operador: normalizeAmpList(values.codigo_operador),
      estado: values.estado,
      fecha_modificacion: formatDateForSQLServer(new Date()),
      usuario_modificacion: getUsuarioSession(),
    };

    try {
      await subcomponentesService.save(data);
      toast({
        title: "Éxito",
        description: `Subcomponente ${record ? "actualizado" : "creado"} correctamente.`,
      });
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado.";
      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fields = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {!lockElemento && (
        <FormField
          control={form.control}
          name="codigo_elemento_asociacion"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Elemento de asociación</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={
                    field.value && field.value > 0
                      ? String(field.value)
                      : undefined
                  }
                  options={elementoOptions}
                  placeholder={
                    loadingElementos
                      ? "Cargando elementos…"
                      : "Seleccione un elemento"
                  }
                  searchPlaceholder="Buscar por código, descripción o columna…"
                  emptyMessage="No hay elementos activos"
                  disabled={loadingElementos || isLoading}
                  onValueChange={(v) => field.onChange(Number(v))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <FormField
        control={form.control}
        name="descripcion"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Tornillo M6"
                disabled={isLoading}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="puesto_trabajo"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Puesto(s) de trabajo</FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Estación 12, Estación 14 & Estación 16"
                disabled={isLoading}
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Varios puestos separados por <code>,</code> o <code>&amp;</code>.
              Al guardar las comas se convierten a <code>&amp;</code>.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="codigo_operador"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Operador(es)</FormLabel>
            <FormControl>
              <UserAutocomplete
                value={field.value ?? ""}
                onChange={field.onChange}
                multiple
                disabled={isLoading}
                placeholder="Busca y agrega uno o varios operadores…"
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Puedes asociar varios. Se guardan solo los códigos separados por{" "}
              <code>&amp;</code>.
            </p>
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
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un estado" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="A">
                  <div className="flex items-center">
                    Activo
                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500" />
                  </div>
                </SelectItem>
                <SelectItem value="I">
                  <div className="flex items-center">
                    Inactivo
                    <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const actions = (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button type="submit" disabled={isLoading || loadingElementos}>
        {isLoading
          ? record
            ? "Actualizando…"
            : "Guardando…"
          : record
            ? "Actualizar"
            : "Guardar"}
      </Button>
    </div>
  );

  const formInner = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields}
        {actions}
      </form>
    </Form>
  );

  if (embedded) return formInner;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {record ? "Editar Subcomponente" : "Nuevo Subcomponente"}
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>{fields}</CardContent>
          <CardFooter className="flex justify-end gap-2">{actions}</CardFooter>
        </form>
      </Form>
    </Card>
  );
}
