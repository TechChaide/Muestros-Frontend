"use client";

/**
 * Captura de paros de máquina.
 * `/dashboard/procesos/parosM`
 */
import { useMemo } from "react";
import { Cog } from "lucide-react";
import ProcesoCapturaWizard from "../shared/proceso-captura-wizard";
import type { ProcesoCapturaWizardConfig } from "../shared/proceso-wizard-types";
import Step5CapturarParoM from "./components/step5-capturar-paroM";
import {
  clearAllParosMStorage,
  parosMRutaParcialStorage,
  parosMRutaStorage,
} from "./paroM-storage";
import { nombreMotivoIncluye } from "@/lib/flujo-seleccion";

export default function ParosMPage() {
  const config = useMemo((): ProcesoCapturaWizardConfig => ({
    title: "Paros de máquina",
    description:
      "El área se toma del departamento del usuario. Luego eliges motivo, origen, componente, causa y registras el paro con sus máquinas.",
    pathLabel: "Ruta del paro de máquina",
    submitToastTitle: "Paro de máquina listo para registrar",
    icon: Cog,
    filtroMotivo: (nombre) => nombreMotivoIncluye(nombre, "PARO DE"),
    autoSeleccionarMotivo: true,
    storage: {
      rutaParcial: parosMRutaParcialStorage,
      ruta: parosMRutaStorage,
      clearAll: clearAllParosMStorage,
    },
    renderCaptura: (ctx) => (
      <Step5CapturarParoM
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
        onBack={ctx.onBack}
      />
    ),
  }), []);

  return <ProcesoCapturaWizard config={config} />;
}
