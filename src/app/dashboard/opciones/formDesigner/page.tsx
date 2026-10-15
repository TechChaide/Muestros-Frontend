"use client";

import FormDesigner from "./components/form-designer";

/**
 * Ruta /dashboard/opciones/formDesigner
 *
 * Vista de diseño para previsualizar cómo quedará el formulario de captura de
 * muestreos: el bloque fijo de la tabla `registro`, la sección dinámica que se
 * arma según los campos extra, y el módulo de escaneo (QR / código de barras).
 */
export default function FormDesignerPage() {
  return <FormDesigner />;
}
