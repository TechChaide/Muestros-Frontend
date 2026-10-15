"use client";

/**
 * Card de resumen que muestra la información consolidada del paro que
 * se acaba de resolver automáticamente.
 *
 * Datos que se muestran (todos vienen de la fila consolidada de la tabla
 * virtual — una vez resuelta la ruta en la página padre):
 *   - Departamento (nombre_area del usuario)
 *   - Origen (nombre_origen, derivado del departamento del usuario)
 *   - Motivo (nombre_tipo_motivo, fijo: contiene "PARO DE MÁQUINA")
 *   - Componente (nombre_componente, fijo: "PAROS")
 *   - Causa de defecto (nombre_causa_defecto, fijo: "PARO")
 *
 * Esta card NO tiene lógica propia: es puramente presentacional. El
 * padre (`page.tsx`) le pasa los datos ya filtrados.
 */

import { Building, Tag, Cpu, AlertTriangle, MapPin, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ParoResumenCardProps {
  /** Código de persona del usuario logueado. */
  codigoPersona: string;
  /** Departamento del usuario logueado (FichaSocialHistorica.DEPARTAMENTO). */
  departamentoUsuario: string;
  /** Fila consolidada de la tabla virtual con la ruta del paro. */
  fila: {
    codigo_area: number;
    codigo_area_tipo_motivo: number;
    codigo_componente: number;
    codigo_causa_defecto: number;
    codigo_origen: number;
    nombre_area: string;
    nombre_ficha_social: string;
    nombre_tipo_motivo: string;
    nombre_origen: string;
    nombre_componente: string;
    nombre_causa_defecto: string;
  };
}

/**
 * Fila presentacional: icono + etiqueta + valor. Renderiza un bloque
 * de grid consistente para que la card mantenga el alineamiento aunque
 * cambien los textos.
 */
function Field({
  Icon,
  label,
  value,
  mono,
}: {
  Icon: typeof Building;
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-card px-3 py-2.5">
      <div className="rounded-md bg-primary/10 p-2 shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 text-sm font-medium truncate ${mono ? "font-mono" : ""}`}
          title={String(value)}
        >
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function ParoResumenCard({
  codigoPersona,
  departamentoUsuario,
  fila,
}: ParoResumenCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-2 px-3 sm:px-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ruta del paro (resuelta automáticamente)
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Los siguientes valores se derivan del{" "}
              <span className="font-medium text-foreground">
                DEPARTAMENTO
              </span>{" "}
              del usuario logueado y de la tabla virtual de configuración.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 font-mono">
              <Hash className="h-3 w-3" />
              {codigoPersona || "—"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <Field
            Icon={Building}
            label="Departamento (área)"
            value={fila.nombre_area}
          />
          <Field
            Icon={MapPin}
            label="Origen"
            value={fila.nombre_origen}
          />
          <Field
            Icon={Tag}
            label="Motivo"
            value={fila.nombre_tipo_motivo}
          />
          <Field
            Icon={Cpu}
            label="Componente"
            value={fila.nombre_componente}
          />
          <Field
            Icon={AlertTriangle}
            label="Causa de defecto"
            value={fila.nombre_causa_defecto}
          />
          <Field
            Icon={Building}
            label="Departamento del usuario"
            value={departamentoUsuario}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Nota:</span> los
          campos de <strong>Motivo</strong>, <strong>Componente</strong> y{" "}
          <strong>Causa</strong> son fijos en este flujo y siempre
          corresponden a Paro de Máquina, Componente Paros y Causa Paro
          respectivamente.
        </p>
      </CardContent>
    </Card>
  );
}