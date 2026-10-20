"use client";

import { CatalogoTablaPage } from "../shared/catalogo-tabla-page";
import type { ColumnaCatalogo } from "../shared/catalogo-tabla";
import { mMaterialService } from "@/services/seguridades/mMaterial.service";

const TEXTO = (key: string, label: string, max?: number): ColumnaCatalogo => ({
  key,
  label,
  tipo: "text",
  max,
});

const COLUMNAS: ColumnaCatalogo[] = [
  TEXTO("material", "Material", 50),
  TEXTO("descripcion_sap", "Descripción SAP"),
  TEXTO("etiqueta", "Etiqueta", 100),
  TEXTO("ancho", "Ancho", 10),
  TEXTO("largo", "Largo", 10),
  TEXTO("alto", "Alto", 10),
  TEXTO("clase", "Clase", 50),
  TEXTO("tipo", "Tipo", 50),
  TEXTO("resortes", "Resortes", 100),
  TEXTO("aislante_pading", "Aislante pading", 50),
  TEXTO("fibra_pading", "Fibra pading", 50),
  TEXTO("espuma", "Espuma", 50),
  TEXTO("aislante", "Aislante", 50),
  TEXTO("lamina1", "Lámina 1", 100),
  TEXTO("lamina2", "Lámina 2", 100),
  TEXTO("lamina3", "Lámina 3", 100),
  TEXTO("lamina4", "Lámina 4", 100),
  TEXTO("lamina5", "Lámina 5", 100),
  TEXTO("lamina_banda", "Lámina banda", 100),
  TEXTO("lamina_tapa", "Lámina tapa", 100),
  TEXTO("tela_tapa1", "Tela tapa 1", 100),
  TEXTO("tela_tapa2", "Tela tapa 2", 100),
  TEXTO("tela_tapa3", "Tela tapa 3", 100),
  TEXTO("tela_banda1", "Tela banda 1", 100),
  TEXTO("tela_banda2", "Tela banda 2", 100),
  TEXTO("tela_banda3", "Tela banda 3", 100),
  TEXTO("tapa_tela1", "Tapa tela 1", 100),
  TEXTO("tapa_tela2", "Tapa tela 2", 100),
  TEXTO("tapa_tela3", "Tapa tela 3", 100),
  TEXTO("lamina_tapa2", "Lámina tapa 2", 100),
  { key: "peso_individual", label: "Peso individual", tipo: "number" },
];

export default function MaterialEtiquetasPage() {
  return (
    <CatalogoTablaPage
      titulo="Materiales de etiquetas"
      descripcion="Consulta M_MATERIAL, descarga el Excel, carga el archivo modificado y revisa los cambios antes de guardarlos. Cada fila se compara por el código de material. Si el material no existe, se agrega. Si lo quitas del Excel, se elimina. Ancho, largo y alto son texto."
      placeholderBusqueda="Buscar por material, descripción, etiqueta, clase o tipo"
      nombreTabla="Etiquetas.dbo.M_MATERIAL"
      nombreArchivo="material_etiquetas.xlsx"
      etiquetaConteo="materiales"
      columnas={COLUMNAS}
      campoRequerido="material"
      mensajeRequerido="Falta el material."
      camposBusqueda={["material", "descripcion_sap", "etiqueta", "clase", "tipo"]}
      tituloFila={(valores) =>
        `${valores.material || "sin material"} · ${valores.etiqueta || "sin etiqueta"}`
      }
      tituloAlta={(valores) =>
        `${valores.material || "sin material"} · ${valores.descripcion_sap || "sin descripción"} · ${valores.etiqueta || "sin etiqueta"}`
      }
      listar={mMaterialService.listar}
      aplicar={mMaterialService.aplicar}
    />
  );
}
