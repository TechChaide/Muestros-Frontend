import { fetchWithAuth } from "@/lib/http-client";
import type { FilaCatalogo } from "@/app/dashboard/calidad/shared/catalogo-tabla";

/** Filas por petición: respuestas pequeñas para no llenar la memoria del back. */
const TAMANO_BLOQUE = 500;

export async function leerError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string") return body.error;
    if ("message" in body && typeof body.message === "string") return body.message;
  }
  return `${fallback} (HTTP ${response.status})`;
}

/**
 * Pide el catálogo en bloques de TAMANO_BLOQUE filas hasta completar el total.
 * Si el back no devuelve `total` (versión anterior), la primera respuesta ya trae todo.
 */
export async function listarPorBloques(url: string, mensajeError: string): Promise<FilaCatalogo[]> {
  const filas: FilaCatalogo[] = [];
  for (;;) {
    const response = await fetchWithAuth(`${url}?desde=${filas.length}&limite=${TAMANO_BLOQUE}`);
    if (!response.ok) {
      throw new Error(await leerError(response, mensajeError));
    }
    const body = await response.json();
    const data: FilaCatalogo[] = Array.isArray(body?.data) ? body.data : [];
    filas.push(...data);
    const total = typeof body?.total === "number" ? body.total : null;
    if (total === null || data.length === 0 || filas.length >= total) return filas;
  }
}
