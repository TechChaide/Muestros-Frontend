import { environment } from "@/environments/environments.prod";
import { fetchWithAuth } from "@/lib/http-client";
import type { CambioAplicar, FilaCatalogo } from "@/app/dashboard/calidad/shared/catalogo-tabla";

const API_URL = `${environment.appAPI}/api/muestreo_catalogo_material`;

export type ResultadoAplicar = {
  actualizados: number;
  insertados: number;
  eliminados: number;
};

async function leerError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string") return body.error;
    if ("message" in body && typeof body.message === "string") return body.message;
  }
  return fallback;
}

export const muestreoCatalogoMaterialService = {
  async listar(): Promise<FilaCatalogo[]> {
    const response = await fetchWithAuth(API_URL);
    if (!response.ok) {
      throw new Error(await leerError(response, "No se pudo consultar el catálogo."));
    }
    const body = await response.json();
    const data = Array.isArray(body?.data) ? body.data : [];
    return data as FilaCatalogo[];
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
