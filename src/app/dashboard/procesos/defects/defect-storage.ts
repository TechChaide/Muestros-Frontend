/**
 * Persistencia del wizard de defectos en sessionStorage.
 *
 * Misma idea que samplings: una ruta = una fila de la tabla virtual.
 * Keys propias (`defect:*`) para no chocar con muestreos/paros.
 */

import type { MuestreoTablaVirtual } from "@/types/interfaces";

const KEY_RUTA = "defect:ruta";
const KEY_RUTA_PARCIAL = "defect:rutaParcial";

export interface DefectRuta {
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

export const defectRutaParcialStorage = {
  get(): DefectRuta {
    return readJson<DefectRuta>(KEY_RUTA_PARCIAL) ?? {};
  },
  set(ruta: DefectRuta): void {
    writeJson(KEY_RUTA_PARCIAL, ruta);
  },
  clear(): void {
    writeJson(KEY_RUTA_PARCIAL, null);
  },
};

export const defectRutaStorage = {
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

export function clearAllDefectStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY_RUTA);
    window.sessionStorage.removeItem(KEY_RUTA_PARCIAL);
  } catch {
    /* ignorar */
  }
}
