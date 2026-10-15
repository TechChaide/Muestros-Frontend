"use client";

import { useMemo } from "react";
import type {
  Area,
  AreaTipoMotivo,
  Componente,
  ElementoAsociacion,
  TipoMedicion,
  TipoMotivo,
} from "@/types/interfaces";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Tag, FileText, Eye, Boxes, Ruler } from "lucide-react";
import TablePreview, { type ColumnDef } from "./table-preview";

interface Step5ConfirmTableProps {
  area: Area | null;
  motivo: TipoMotivo | null;
  atm: AreaTipoMotivo | null;
  /** Uno o más componentes a los que se asignará la misma tabla. */
  componentes: Componente[];
  tipoMedicion: TipoMedicion | null;
  columns: ColumnDef[];
  tableName: string;
  elements: ElementoAsociacion[];
}

export default function Step5ConfirmTable({
  area,
  motivo,
  atm,
  componentes,
  tipoMedicion,
  columns,
  tableName,
  elements,
}: Step5ConfirmTableProps) {
  const totalAsociaciones = columns.length * Math.max(1, componentes.length);

  const summaryItems = useMemo(
    () => [
      {
        icon: Building,
        label: "Área",
        value: area?.nombre_area ?? "—",
        sub: area ? `cód. ${area.codigo_area}` : "",
      },
      {
        icon: Tag,
        label: "Motivo",
        value: motivo?.nombre_tipo_motivo ?? "—",
        sub: motivo ? `cód. ${motivo.codigo_tipo_motivo}` : "",
      },
      {
        icon: Boxes,
        label: componentes.length > 1 ? "Componentes" : "Componente",
        value:
          componentes.length > 0
            ? componentes.map((c) => c.nombre_componente).join(", ")
            : "—",
        sub:
          componentes.length > 0
            ? `${componentes.length} · cód. ${componentes
                .map((c) => c.codigo_componente)
                .join(", ")}`
            : "",
      },
      {
        icon: Ruler,
        label: "Tipo de medición",
        value: tipoMedicion?.nombre_tipo_medicion ?? "—",
        sub: tipoMedicion
          ? `cód. ${tipoMedicion.codigo_tipo_medicion}`
          : "",
      },
      {
        icon: FileText,
        label: "Tabla",
        value: tableName || "(sin nombre)",
        sub: `${columns.length} columna${columns.length === 1 ? "" : "s"}`,
      },
    ],
    [area, motivo, componentes, tipoMedicion, tableName, columns.length]
  );

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <span className="text-sm text-primary font-medium">Paso 5 de 5</span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Confirmar y guardar
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revisa la configuración final. Esta es la tabla que se generará al
          guardar
          {componentes.length > 1
            ? ` para ${componentes.length} componentes`
            : ""}
          ; no es posible editarla en este paso.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
        {summaryItems.map((item) => (
          <Card key={item.label} className="min-w-0 overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </div>
              <p
                className="text-sm font-semibold leading-tight line-clamp-3"
                title={item.value}
              >
                {item.value}
              </p>
              {item.sub && (
                <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {atm && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Asociación área-tipo-motivo seleccionada:{" "}
          <span className="font-mono">
            codigo_area_tipo_motivo = {atm.codigo_area_tipo_motivo}
          </span>
          {tipoMedicion && (
            <>
              {" · "}
              <span className="font-mono">
                codigo_tipo_medicion = {tipoMedicion.codigo_tipo_medicion}
              </span>
            </>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Tabla final
          </h3>
          <Badge variant="outline">Solo lectura</Badge>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[420px] rounded-md border bg-muted/20 p-1">
          <TablePreview
            columns={columns}
            elements={elements}
            editable={false}
            orientation="horizontal"
          />
        </div>
      </div>

      <div className="rounded-md border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Al guardar se crearán {totalAsociaciones} registro(s) en la tabla
          <code className="font-mono mx-1">asociacion</code>
          {componentes.length > 1
            ? ` (${columns.length} columnas × ${componentes.length} componentes)`
            : ""}
          :
        </p>
        <p>
          Cada columna generará un registro con{" "}
          <code className="font-mono">codigo_elemento_asociacion</code>,{" "}
          <code className="font-mono">codigo_componente</code>,{" "}
          <code className="font-mono">codigo_area_tipo_motivo</code>,{" "}
          <code className="font-mono">codigo_tipo_medicion</code>,{" "}
          <code className="font-mono">tabla</code>,{" "}
          <code className="font-mono">tabla_version</code>,{" "}
          <code className="font-mono">orden</code>,{" "}
          <code className="font-mono">etiqueta</code> y{" "}
          <code className="font-mono">estado = A</code>.
        </p>
      </div>
    </div>
  );
}
