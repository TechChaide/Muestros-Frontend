"use client";

import { CatalogoTablaPage } from "../shared/catalogo-tabla-page";
import type { ColumnaCatalogo } from "../shared/catalogo-tabla";
import { muestreoCatalogoMaterialService } from "@/services/seguridades/muestreoCatalogoMaterial.service";

const COLUMNAS: ColumnaCatalogo[] = [
  { key: "cod_material", label: "Código", tipo: "text", max: 50 },
  { key: "descripcion", label: "Descripción", tipo: "text", max: 50 },
  { key: "grupo", label: "Grupo", tipo: "text", max: 50 },
  { key: "unidad_medida", label: "Unidad", tipo: "text", max: 50 },
  { key: "Tipo", label: "Tipo", tipo: "text", max: 10 },
  { key: "Centro", label: "Centro", tipo: "text", max: 10 },
  { key: "Porcentaje_ingreso", label: "% ingreso", tipo: "number" },
  { key: "Largo_cm", label: "Largo cm", tipo: "number" },
  { key: "Tolneg_largo", label: "Tol − largo", tipo: "number" },
  { key: "Tolpos_largo", label: "Tol + largo", tipo: "number" },
  { key: "Ancho_cm", label: "Ancho cm", tipo: "number" },
  { key: "Tolneg_ancho_cm", label: "Tol − ancho", tipo: "number" },
  { key: "Tolpos_ancho_cm", label: "Tol + ancho", tipo: "number" },
  { key: "Espesor_cm", label: "Espesor cm", tipo: "number" },
  { key: "Espesor_mm", label: "Espesor mm", tipo: "number" },
  { key: "Tolneg_espesor_mm", label: "Tol − espesor", tipo: "number" },
  { key: "Tolpos_espesor_mm", label: "Tol + espesor", tipo: "number" },
  { key: "Alto_cm", label: "Alto cm", tipo: "number" },
  { key: "Tolneg_alto_cm", label: "Tol − alto", tipo: "number" },
  { key: "Tolpos_alto_cm", label: "Tol + alto", tipo: "number" },
];

export default function CatalogoMuestraCalidadPage() {
  return (
    <CatalogoTablaPage
      titulo="Catálogo de muestra de calidad"
      descripcion="Consulta los materiales, descarga el Excel, carga el archivo modificado y revisa los cambios antes de guardarlos. La columna fila_origen identifica cada registro. Si la dejas vacía, el material se agrega. Quitar filas del Excel no las borra de la base."
      placeholderBusqueda="Buscar por código, descripción, grupo, tipo o centro"
      nombreTabla="NotificaSAP.dbo.MuestreoCatalogoMaterial"
      nombreArchivo="catalogo_muestra_calidad.xlsx"
      etiquetaConteo="materiales"
      columnas={COLUMNAS}
      campoRequerido="cod_material"
      mensajeRequerido="Falta el código de material."
      camposBusqueda={["cod_material", "descripcion", "grupo", "Tipo", "Centro"]}
      tituloFila={(valores) =>
        `${valores.cod_material || "sin código"} · centro ${valores.Centro || "—"}`
      }
      tituloAlta={(valores) =>
        `${valores.cod_material || "sin código"} · ${valores.descripcion || "sin descripción"} · centro ${valores.Centro || "—"}`
      }
      listar={muestreoCatalogoMaterialService.listar}
      aplicar={muestreoCatalogoMaterialService.aplicar}
    />
  );
}
