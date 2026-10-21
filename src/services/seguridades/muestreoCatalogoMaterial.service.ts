import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";
import type { CambioAplicar, FilaCatalogo } from "@/app/dashboard/calidad/shared/catalogo-tabla";
import { leerError, listarPorBloques } from "./catalogoTablaHttp";

const API_URL = `${environment.appAPI}/api/muestreo_catalogo_material`;

export type ResultadoAplicar = {
  actualizados: number;
  insertados: number;
  eliminados: number;
};

export const muestreoCatalogoMaterialService = {
  listar(): Promise<FilaCatalogo[]> {
    return listarPorBloques(API_URL, "No se pudo consultar el catálogo.");
  },

  async aplicar(cambios: CambioAplicar[]): Promise<ResultadoAplicar> {
    const response = await fetchWithAuth(`${API_URL}/aplicar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cambios }),
    });
    if (!response.ok) {
      throw new Error(await leerError(response, "No se pudieron guardar los cambios."));
    }
    const body = await response.json();
    return {
      actualizados: Number(body?.data?.actualizados ?? 0),
      insertados: Number(body?.data?.insertados ?? 0),
      eliminados: Number(body?.data?.eliminados ?? 0),
    };
  },
};
