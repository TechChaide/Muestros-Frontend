/**
 * Persistencia ligera del wizard de muestreos en sessionStorage.
 *
 * Concepto: "una ruta de muestreo = una fila de la tabla virtual".
 *
 * La tabla virtual es la respuesta del backend y contiene TODAS las
 * combinaciones posibles (área × motivo × componente × causa). Cada fila
 * tiene un `codigo_*` por nivel. La ruta que el usuario va armando paso a
 * paso (área → motivo → componente → causa) coincide con EXACTAMENTE una
 * fila de esa tabla.
 *
 * Persistimos dos cosas:
 *  - `sampling:rutaParcial` → los IDs que el usuario lleva elegidos
 *    (se actualiza en cada paso).
 *  - `sampling:ruta` → la fila completa de la tabla virtual que matchea
 *    la ruta de 4 niveles. Solo se escribe en el paso 4.
 *
 * La fila consolidada es la fuente de verdad para el POST final: ya trae
 * los `codigo_*` (FKs reales) y los `nombre_*` denormalizados.
 *
 * - Usamos `sessionStorage` (no `localStorage`) para que se limpie al
 *   cerrar la pestaña: el muestreo no debe sobrevivir a un día distinto.
 * - Funciones defensivas: si el JSON está corrupto o no existe, devuelven
 *   `null` en vez de lanzar.
 */

import type { MuestreoTablaVirtual } from "@/types/interfaces";

const KEY_RUTA = "sampling:ruta";
const KEY_RUTA_PARCIAL = "sampling:rutaParcial";

/**
 * Tipo de la "ruta" que el wizard va construyendo. No es la fila completa;
 * es solo el conjunto de IDs que el usuario ha ido eligiendo. La fila
 * completa se recupera buscando esta ruta en la tabla virtual.
 */
export interface SamplingRuta {
  codigo_area?: number;
  codigo_area_tipo_motivo?: number;
  codigo_origen?: number;
  codigo_origen_componente?: number;
  codigo_componente?: number;
  codigo_causa_defecto?: number;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    /* sessionStorage lleno o bloqueado: ignoramos para no romper el wizard */
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Ruta parcial (lo que el usuario lleva construido paso a paso)
// ───────────────────────────────────────────────────────────────────────────

export const samplingRutaParcialStorage = {
  /** Lee la ruta parcial. Si no hay nada, devuelve una ruta vacía. */
  get(): SamplingRuta {
    return readJson<SamplingRuta>(KEY_RUTA_PARCIAL) ?? {};
  },
  set(ruta: SamplingRuta): void {
    writeJson(KEY_RUTA_PARCIAL, ruta);
  },
  clear(): void {
    writeJson(KEY_RUTA_PARCIAL, null);
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Fila consolidada (la que matchea la ruta completa)
// ───────────────────────────────────────────────────────────────────────────

export const samplingRutaStorage = {
  /** Devuelve la fila de la tabla virtual asociada a la ruta completa. */
  get(): MuestreoTablaVirtual | null {
    return readJson<MuestreoTablaVirtual>(KEY_RUTA);
  },
  set(fila: MuestreoTablaVirtual | null): void {
    writeJson(KEY_RUTA, fila);
  },
  clear(): void {
    writeJson(KEY_RUTA, null);
  },
};

/**
 * Limpia TODO el estado persistido del wizard. Llamar en `handleReset` y
 * cuando el usuario cancela o termina la captura.
 */
export function clearAllSamplingStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY_RUTA);
    window.sessionStorage.removeItem(KEY_RUTA_PARCIAL);
  } catch {
    /* ignorar */
  }
}