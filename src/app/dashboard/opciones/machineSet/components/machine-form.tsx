"use client";

import { useMemo, useState } from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MaquinasMantenimiento } from "@/types/interfaces";
import { tareasMaquinasService } from "@/services/seguridades/tareasMaquinas.service";
import {
  machineUniqueKey,
  normalizeMaquinaCode,
  normalizeRegional,
  toExistingMachineKeySet,
  toSavePayload,
} from "./parse-machines-excel";
import type { MachineIdentity } from "./parse-machines-excel";

const formSchema = z.object({
  maquina: z.string().min(1, "El código de máquina es requerido."),
  componente: z.string().min(1, "El componente es requerido."),
  actividad: z.string().min(1, "La actividad es requerida."),
  regional: z.string().min(1, "La regional es requerida."),
});

interface MachineFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  existingActividades?: string[];
  existingRecords?: MachineIdentity[];
}

export default function MachineForm({
  onSuccess,
  onCancel,
  existingActividades = [],
  existingRecords = [],
}: MachineFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const datalistId = "actividad-maquina-options";
  const existingSet = useMemo(
    () => toExistingMachineKeySet(existingRecords),
    [existingRecords],
  );

  const actividades = useMemo(
    () =>
      Array.from(new Set(existingActividades.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [existingActividades],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maquina: "",
      componente: "",
      actividad: "",
      regional: "UIO",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const maquina = normalizeMaquinaCode(values.maquina);
    const regional = normalizeRegional(values.regional);
    const actividad = values.actividad.trim();
    const key = machineUniqueKey({ maquina, actividad, regional });
    if (key && existingSet.has(key)) {
      form.setError("maquina", {
        type: "validate",
        message: "Ya existe para esta actividad y regional.",
      });
      return;
    }
    setIsLoading(true);
    const data: MaquinasMantenimiento = toSavePayload({
      maquina,
      componente: values.componente.trim(),
      actividad,
      regional,
    });
    try {
      await tareasMaquinasService.save(data);
      toast({
        title: "Máquina creada",
        description: `"${data.maquina}" se guardó correctamente.`,
      });
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ocurrió un error inesperado.";
      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const maquinaValue = form.watch("maquina");
  const actividadValue = form.watch("actividad");
  const regionalValue = form.watch("regional");
  const currentKey = machineUniqueKey({
    maquina: maquinaValue,
    actividad: actividadValue,
    regional: regionalValue,
  });
  const isDuplicate = !!currentKey && existingSet.has(currentKey);

  const syncDuplicateError = (next: MachineIdentity) => {
    const key = machineUniqueKey(next);
    if (key && existingSet.has(key)) {
      form.setError("maquina", {
        type: "validate",
        message: "Ya existe para esta actividad y regional.",
      });
    } else if (form.formState.errors.maquina?.type === "validate") {
      form.clearErrors("maquina");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva máquina</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="maquina"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máquina</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AGA01"
                      {...field}
                      onChange={(e) => {
                        const value = normalizeMaquinaCode(e.target.value);
                        field.onChange(value);
                        syncDuplicateError({
                          maquina: value,
                          actividad: actividadValue,
                          regional: regionalValue,
                        });
                      }}
                    />
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
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      syncDuplicateError({
                        maquina: maquinaValue,
                        actividad: actividadValue,
                        regional: value,
                      });
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona regional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UIO">UIO — Quito</SelectItem>
                      <SelectItem value="GYE">GYE — Guayaquil</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="componente"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Componente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Agitador quimicos almohadas 1"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="actividad"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Actividad</FormLabel>
                  <FormControl>
                    <Input
                      list={datalistId}
                      placeholder="1 ALMOHADAS"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        syncDuplicateError({
                          maquina: maquinaValue,
                          actividad: e.target.value,
                          regional: regionalValue,
                        });
                      }}
                    />
                  </FormControl>
                  <datalist id={datalistId}>
                    {actividades.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || isDuplicate}>
              {isLoading ? "Guardando..." : "Guardar máquina"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
