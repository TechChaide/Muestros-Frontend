"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarClock,
  CheckCircle2,
  IdCard,
  Lock,
  QrCode,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RegistroUnidadesOculto from "@/components/registro-unidades-oculto";

/**
 * Descripción de un campo fijo (obligatorio) de la tabla `registro`.
 * Estos campos SIEMPRE están presentes en el formulario, sin importar el
 * motivo o los campos dinámicos que se agreguen.
 */
interface CampoFijo {
  name: string;
  label: string;
  type: "text" | "date" | "number";
  placeholder?: string;
  /** Ancho en columnas del grid (1 o 2). */
  span?: 1 | 2;
}

/**
 * Campos de negocio obligatorios de `registro` que el usuario edita libremente.
 * Los campos especiales (regional, fecha de registro y código de empleado) se
 * manejan aparte porque tienen reglas propias.
 */
const CAMPOS_FIJOS: CampoFijo[] = [
  { name: "departamento", label: "Departamento", type: "text", placeholder: "Ej: Producción" },
  { name: "motivo", label: "Motivo", type: "text", placeholder: "Ej: Defecto" },
  { name: "origen", label: "Origen", type: "text", placeholder: "Ej: Cliente A" },
  { name: "componente", label: "Componente", type: "text", placeholder: "Ej: Espuma" },
  { name: "causa_defecto", label: "Causa de defecto", type: "text", placeholder: "Ej: Corte irregular" },
  { name: "maquina", label: "Máquina", type: "text", placeholder: "Ej: Máquina 3" },
  { name: "material", label: "Material", type: "text", placeholder: "Ej: 108" },
  { name: "comodin", label: "Comodín", type: "text", placeholder: "Ej: código proveedor / N.A." },
];

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Lee el `codigo_empleado` del usuario logueado desde localStorage. */
function getCodigoEmpleado(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.codigo_empleado ?? "";
  } catch {
    return "";
  }
}

/**
 * Bloque fijo del formulario: reproduce los campos obligatorios de la tabla
 * `registro`. Es solo una previsualización de diseño (los inputs no están
 * conectados a estado ni se persisten).
 *
 * Si se recibe `scannedValue`, se muestra el campo de "Código escaneado" que
 * refleja el valor capturado por el módulo de escaneo (modo ESCANEO).
 */
interface RegistroBaseFormProps {
  /** Valor del QR / código de barras capturado por el escáner. */
  scannedValue?: string;
}

export default function RegistroBaseForm({ scannedValue }: RegistroBaseFormProps) {
  const tieneEscaneo = typeof scannedValue !== "undefined";
  const capturado = !!scannedValue;

  // Reloj en vivo para la fecha de registro (siempre la actual).
  const [ahora, setAhora] = useState<Date | null>(null);
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [regional, setRegional] = useState("");

  useEffect(() => {
    setAhora(new Date());
    setCodigoEmpleado(getCodigoEmpleado());
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const fechaTexto = ahora
    ? `${ahora.getFullYear()} · ${MESES[ahora.getMonth()]} · ${pad(ahora.getDate())}`
    : "—";
  const horaTexto = ahora
    ? `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`
    : "—";

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Cabecera con la fecha/hora actual en la esquina superior derecha */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <TableIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Tabla registros (campos fijos)</h3>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Obligatorios
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-1.5">
            <CalendarClock className="h-4 w-4 text-primary" />
            <div className="text-right leading-tight">
              <p className="text-[11px] font-medium text-muted-foreground">
                Fecha de registro
              </p>
              <p className="text-xs font-semibold tabular-nums">
                {fechaTexto} <span className="text-primary">{horaTexto}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Estos campos siempre están presentes en el formulario, sin importar el
          motivo o los campos dinámicos que se agreguen. Las unidades se
          autocompletan desde el componente seleccionado y no se muestran al
          usuario.
        </p>

        <RegistroUnidadesOculto value="" />

        {/* Campo alimentado por el escáner (modo ESCANEO) */}
        {tieneEscaneo && (
          <div
            className={cn(
              "rounded-md border p-3 transition-colors",
              capturado
                ? "border-green-300 bg-green-50/60"
                : "border-dashed bg-muted/20",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <QrCode
                className={cn(
                  "h-4 w-4",
                  capturado ? "text-green-600" : "text-muted-foreground",
                )}
              />
              <Label htmlFor="registro-material" className="text-xs">
                Material (etiqueta / orden)
              </Label>
              {capturado && (
                <Badge variant="secondary" className="ml-auto gap-1 text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Capturado
                </Badge>
              )}
            </div>
            <Input
              id="registro-material"
              value={scannedValue}
              readOnly
              placeholder="Escanea un código en el panel de arriba…"
              className="bg-white/70 font-mono"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Regional: combo QUITO / GUAYAQUIL */}
          <div className="space-y-1.5">
            <Label htmlFor="fijo-regional" className="text-xs">
              Regional
            </Label>
            <Select value={regional} onValueChange={setRegional}>
              <SelectTrigger id="fijo-regional">
                <SelectValue placeholder="Selecciona la regional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QUITO">QUITO</SelectItem>
                <SelectItem value="GUAYAQUIL">GUAYAQUIL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Código de empleado: del usuario logueado, no editable */}
          <div className="space-y-1.5">
            <Label
              htmlFor="fijo-codigo-empleado"
              className="text-xs flex items-center gap-1"
            >
              <IdCard className="h-3.5 w-3.5" />
              Código de empleado
              <Lock className="h-3 w-3 text-muted-foreground" />
            </Label>
            <Input
              id="fijo-codigo-empleado"
              value={codigoEmpleado}
              readOnly
              placeholder="—"
              className="bg-muted/40 font-mono cursor-not-allowed"
            />
          </div>

          {/* Resto de campos editables */}
          {CAMPOS_FIJOS.map((campo) => (
            <div key={campo.name} className="space-y-1.5">
              <Label htmlFor={`fijo-${campo.name}`} className="text-xs">
                {campo.label}
              </Label>
              <Input
                id={`fijo-${campo.name}`}
                type={campo.type}
                placeholder={campo.placeholder}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
