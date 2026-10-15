"use client";

/**
 * Vista unificada de procesos operativos (excepto muestreos de calidad).
 * `/dashboard/procesos/captura`
 *
 * Flujo en cascada (consultas en vivo):
 *   1. Motivos habilitados del área (sin muestreos)
 *   2. Orígenes del motivo elegido
 *   3. Componentes del origen
 *   4. Causas del componente
 *   5. Captura
 */
import { useMemo } from "react";
import { ClipboardList } from "lucide-react";
import ProcesoCapturaWizard from "../shared/proceso-captura-wizard";
import type { ProcesoCapturaWizardConfig } from "../shared/proceso-wizard-types";
import Step5CapturarMuestreo from "../defects/components/step5-capturar-muestreo";
import {
  clearAllProcesoStorage,
  procesoRutaParcialStorage,
  procesoRutaStorage,
} from "./captura-storage";

export default function CapturaUnificadaPage() {
  const config = useMemo((): ProcesoCapturaWizardConfig => ({
    title: "Captura de procesos",
    description:
      "Si tu departamento tiene más de un área, elige primero cuál usar. Luego motivo, origen, componente y causa; cada paso filtra según lo anterior. Los muestreos de calidad no se manejan aquí.",
    pathLabel: "Ruta del proceso",
    submitToastTitle: "Proceso listo para registrar",
    icon: ClipboardList,
    flujoCascada: true,
    storage: {
      rutaParcial: procesoRutaParcialStorage,
      ruta: procesoRutaStorage,
      clearAll: clearAllProcesoStorage,
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
          regional: ctx.regional || ctx.selectedArea.regional,
        }}
        filaConsolidada={ctx.filaConsolidada}
        onChange={ctx.onCapturaChange}
        stepHint={ctx.hint(5)}
        title="Carga de datos"
        empleadoAutocomplete
        departamentoEmpleadoFilter={ctx.selectedOrigen.nombre}
      />
    ),
  }), []);

  return <ProcesoCapturaWizard config={config} />;
}
