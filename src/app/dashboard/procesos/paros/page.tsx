"use client";

/**
 * Captura de paros con cronómetro.
 * `/dashboard/procesos/paros`
 */
import { useMemo, useRef } from "react";
import { PauseCircle } from "lucide-react";
import ProcesoCapturaWizard from "../shared/proceso-captura-wizard";
import type { ProcesoCapturaWizardConfig } from "../shared/proceso-wizard-types";
import ParosCapturaStep from "./components/paros-captura-step";
import {
  clearAllParosStorage,
  paroFilaStorage,
  paroRutaParcialStorage,
} from "./paro-storage";
import { nombreMotivoIncluye } from "@/lib/flujo-seleccion";

export default function ParosPage() {
  const resetRef = useRef<(() => void) | null>(null);

  const config = useMemo((): ProcesoCapturaWizardConfig => ({
    title: "Registro de paros",
    description:
      "El área se toma del departamento del usuario. Elige origen, componente y causa; luego inicia el cronómetro del paro.",
    pathLabel: "Ruta del paro",
    submitToastTitle: "Paro listo para registrar",
    icon: PauseCircle,
    // Antes no tenía filtro: mostraba TODOS los motivos del área (DEFECTO,
    // DEVOLUCIONES, GESTIÓN ADM. DISTRI., etc.), y esta pantalla no captura
    // comodín/material/pedido — solo cronómetro. Se restringe a PARO DE
    // MÁQUINA, el único motivo para el que esta captura simplificada es
    // correcta (igual que /parosM, que ofrece la versión detallada del
    // mismo motivo).
    filtroMotivo: (nombre) => nombreMotivoIncluye(nombre, "PARO DE"),
    autoSeleccionarMotivo: true,
    storage: {
      rutaParcial: paroRutaParcialStorage,
      ruta: paroFilaStorage,
      clearAll: clearAllParosStorage,
    },
    renderCaptura: (ctx) => (
      <ParosCapturaStep
        {...ctx}
        onResetWizard={() => resetRef.current?.()}
      />
    ),
  }), []);

  return <ProcesoCapturaWizard config={config} resetRef={resetRef} />;
}
