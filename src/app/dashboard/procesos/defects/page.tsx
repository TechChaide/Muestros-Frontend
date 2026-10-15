"use client";

/**
 * Captura de defectos.
 * `/dashboard/procesos/defects`
 */
import { useMemo } from "react";
import { Bug } from "lucide-react";
import ProcesoCapturaWizard from "../shared/proceso-captura-wizard";
import type { ProcesoCapturaWizardConfig } from "../shared/proceso-wizard-types";
import Step5CapturarMuestreo from "./components/step5-capturar-muestreo";
import {
  clearAllDefectStorage,
  defectRutaParcialStorage,
  defectRutaStorage,
} from "./defect-storage";
import { nombreMotivoIncluye } from "@/lib/flujo-seleccion";

export default function DefectsPage() {
  const config = useMemo((): ProcesoCapturaWizardConfig => ({
    title: "Captura de defectos",
    description:
      "El área se toma del departamento del usuario. Luego eliges motivo, origen, componente, causa y cargas los datos.",
    pathLabel: "Ruta del defecto",
    submitToastTitle: "Defecto listo para registrar",
    icon: Bug,
    filtroMotivo: (nombre) => nombreMotivoIncluye(nombre, "DEFECTO"),
    autoSeleccionarMotivo: true,
    storage: {
      rutaParcial: defectRutaParcialStorage,
      ruta: defectRutaStorage,
      clearAll: clearAllDefectStorage,
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
        title="Captura del defecto"
        empleadoAutocomplete
        departamentoEmpleadoFilter={ctx.selectedOrigen.nombre}
      />
    ),
  }), []);

  return <ProcesoCapturaWizard config={config} />;
}
