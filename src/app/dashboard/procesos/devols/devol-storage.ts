/**
 * Persistencia del wizard de devoluciones en sessionStorage.
 *
 * Misma idea que defects/samplings: una ruta = una fila de la tabla virtual.
 * Keys propias (`devol:*`) para no chocar con otros procesos.
 */

import type { MuestreoTablaVirtual } from "@/types/interfaces";

const KEY_RUTA = "devol:ruta";
const KEY_RUTA_PARCIAL = "devol:rutaParcial";

export interface DevolRuta {
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
    /* ignorar */
  }
}

export const devolRutaParcialStorage = {
  get(): DevolRuta {
    return readJson<DevolRuta>(KEY_RUTA_PARCIAL) ?? {};
  },
  set(ruta: DevolRuta): void {
    writeJson(KEY_RUTA_PARCIAL, ruta);
  },
  clear(): void {
    writeJson(KEY_RUTA_PARCIAL, null);
  },
};

export const devolRutaStorage = {
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

export function clearAllDevolStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY_RUTA);
    window.sessionStorage.removeItem(KEY_RUTA_PARCIAL);
  } catch {
    /* ignorar */
  }
}
