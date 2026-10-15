"use client";

/**
 * Captura de devoluciones.
 * `/dashboard/procesos/devols`
 */
import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import ProcesoCapturaWizard from "../shared/proceso-captura-wizard";
import type { ProcesoCapturaWizardConfig } from "../shared/proceso-wizard-types";
import Step5CapturarMuestreo from "../defects/components/step5-capturar-muestreo";
import {
  clearAllDevolStorage,
  devolRutaParcialStorage,
  devolRutaStorage,
} from "./devol-storage";
import { nombreMotivoIncluye } from "@/lib/flujo-seleccion";

export default function DevolsPage() {
  const config = useMemo((): ProcesoCapturaWizardConfig => ({
    title: "Captura de devoluciones",
    description:
      "El área se toma del departamento del usuario. Luego eliges motivo, origen, componente, causa y cargas los datos.",
    pathLabel: "Ruta de la devolución",
    submitToastTitle: "Devolución lista para registrar",
    icon: RotateCcw,
    filtroMotivo: (nombre) => nombreMotivoIncluye(nombre, "DEVOLUCION"),
    autoSeleccionarMotivo: true,
    storage: {
      rutaParcial: devolRutaParcialStorage,
      ruta: devolRutaStorage,
      clearAll: clearAllDevolStorage,
    },
    renderCaptura: (ctx) => (
      <Step5CapturarMuestreo
        codigoAreaTipoMotivo={ctx.selectedAreaTipoMotivo.id}
        codigoComponente={ctx.selectedComponente.id}
        unidadesComponente={ctx.selectedComponente.unidades}
        codigoTipoMedicion={ctx.selectedTipoMedicion?.codigo_tipo_medicion ?? null}
        codigoArea={ctx.selectedArea.codigo_area}
        responsables={ctx.selectedArea.respCtrlProd ?? ""}
        defaults={{
          departamento: ctx.selectedArea.nombre_area ?? "",
          motivo: ctx.selectedAreaTipoMotivo.nombre,
          origen: ctx.selectedOrigen.nombre,
          componente: ctx.selectedComponente.nombre,
          causa_defecto: ctx.selectedCausa.nombre,
          regional: ctx.selectedArea.regional || ctx.regional,
        }}
        filaConsolidada={ctx.filaConsolidada}
        onChange={ctx.onCapturaChange}
        stepHint={ctx.hint(6)}
        title="Captura de la devolución"
        empleadoAutocomplete
        departamentoEmpleadoFilter={ctx.selectedOrigen.nombre}
      />
    ),
  }), []);

  return <ProcesoCapturaWizard config={config} />;
}
