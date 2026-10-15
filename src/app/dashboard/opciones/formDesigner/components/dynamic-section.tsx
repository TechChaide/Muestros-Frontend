"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";

/** Tipos de campo que puede tener la sección dinámica. */
type CampoTipo = "text" | "number" | "date" | "textarea" | "select";

interface CampoDinamico {
  uid: string;
  label: string;
  tipo: CampoTipo;
  /** Opciones separadas por coma (solo para tipo select). */
  opciones: string;
}

const TIPOS: { value: CampoTipo; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "textarea", label: "Área de texto" },
  { value: "select", label: "Lista desplegable" },
];

let seed = 0;
const nextUid = () => `dyn-${Date.now()}-${++seed}`;

/**
 * Sección dinámica del formulario: permite agregar/quitar campos extra en vivo
 * y ver cómo se renderizan. Representa las columnas que se suman a la tabla
 * `registro` según la tabla dinámica configurada para un motivo.
 */
export default function DynamicSection() {
  const [campos, setCampos] = useState<CampoDinamico[]>([]);
  const [nuevoLabel, setNuevoLabel] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<CampoTipo>("text");
  const [nuevasOpciones, setNuevasOpciones] = useState("");

  const agregarCampo = () => {
    const label = nuevoLabel.trim();
    if (!label) return;
    setCampos((prev) => [
      ...prev,
      { uid: nextUid(), label, tipo: nuevoTipo, opciones: nuevasOpciones.trim() },
    ]);
    setNuevoLabel("");
    setNuevoTipo("text");
    setNuevasOpciones("");
  };

  const quitarCampo = (uid: string) => {
    setCampos((prev) => prev.filter((c) => c.uid !== uid));
  };

  const renderCampo = (campo: CampoDinamico) => {
    const id = `campo-${campo.uid}`;
    switch (campo.tipo) {
      case "textarea":
        return <Textarea id={id} placeholder={campo.label} rows={3} />;
      case "select": {
        const opts = campo.opciones
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
        return (
          <Select>
            <SelectTrigger id={id}>
              <SelectValue placeholder={`Selecciona ${campo.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {opts.length === 0 ? (
                <SelectItem value="__vacio__" disabled>
                  (Sin opciones definidas)
                </SelectItem>
              ) : (
                opts.map((o, i) => (
                  <SelectItem key={`${campo.uid}-${i}`} value={o}>
                    {o}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );
      }
      default:
        return <Input id={id} type={campo.tipo} placeholder={campo.label} />;
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Sección dinámica</h3>
          <Badge variant="secondary" className="ml-auto">
            {campos.length} campo{campos.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Campos extra que se suman a la tabla registros según la tabla dinámica
          del motivo. Agrega campos para ver cómo se renderizan en vivo.
        </p>

        {/* Constructor de campo */}
        <div className="rounded-md border bg-muted/20 p-3 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-label" className="text-xs">
              Etiqueta del campo
            </Label>
            <Input
              id="nuevo-label"
              placeholder="Ej: Número de lote"
              value={nuevoLabel}
              onChange={(e) => setNuevoLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarCampo();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nuevo-tipo" className="text-xs">
              Tipo
            </Label>
            <Select
              value={nuevoTipo}
              onValueChange={(v) => setNuevoTipo(v as CampoTipo)}
            >
              <SelectTrigger id="nuevo-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={agregarCampo} disabled={!nuevoLabel.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>

          {nuevoTipo === "select" && (
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor="nuevo-opciones" className="text-xs">
                Opciones (separadas por coma)
              </Label>
              <Input
                id="nuevo-opciones"
                placeholder="Ej: Bueno, Regular, Malo"
                value={nuevasOpciones}
                onChange={(e) => setNuevasOpciones(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Previsualización en vivo */}
        {campos.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Aún no hay campos dinámicos. Agrega uno para previsualizarlo aquí.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campos.map((campo) => (
              <div key={campo.uid} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`campo-${campo.uid}`} className="text-xs">
                    {campo.label}
                  </Label>
                  <button
                    type="button"
                    onClick={() => quitarCampo(campo.uid)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Quitar ${campo.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {renderCampo(campo)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
