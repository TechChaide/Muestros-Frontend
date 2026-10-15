"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";
import RegistroBaseForm from "./registro-base-form";
import DynamicSection from "./dynamic-section";
import ScannerPanel from "./scanner-panel";

/**
 * Vista de diseño del formulario de captura de muestreos. Compone, en orden:
 *   1. El módulo de escaneo QR / código de barras (expansible).
 *   2. El bloque fijo con los campos obligatorios de la tabla `registro`.
 *   3. La sección dinámica que se arma según los campos extra del motivo.
 *
 * El valor escaneado se propaga al formulario base (campo "Código escaneado"),
 * simulando el modo ESCANEO. Es una previsualización de diseño: no persiste datos.
 */
export default function FormDesigner() {
  // Valor del QR / código de barras capturado por el escáner.
  const [scannedValue, setScannedValue] = useState("");

  return (
    <div className="flex flex-col gap-6 pt-3 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <LayoutTemplate className="h-6 w-6 text-primary" />
          Diseñador de formulario
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Previsualiza cómo quedará el formulario de captura: el módulo de
          escaneo, los campos fijos de la tabla registros y la sección dinámica.
        </p>
      </div>

      <ScannerPanel onScan={setScannedValue} />
      <RegistroBaseForm scannedValue={scannedValue} />
      <DynamicSection />
    </div>
  );
}
