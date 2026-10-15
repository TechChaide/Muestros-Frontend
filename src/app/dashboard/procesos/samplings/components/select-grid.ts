"use client";

/**
 * Helpers que derivan motivos/componentes/causas a partir de la tabla virtual.
 * Centraliza la lógica de filtrado para que los 3 pasos siguientes (2/3/4)
 * compartan las mismas reglas.
 */
import type { MuestreoTablaVirtual } from "@/types/interfaces";

/** Texto que identifica motivos de muestreo (case-insensitive). */
export const MOTIVO_MUESTREO_KEYWORD = "MUESTREO";

/**
 * Devuelve los motivos únicos aplicables al `codigo_area` elegido,
 * filtrando únicamente los que contengan la palabra `MUESTREO`
 * (case-insensitive) en su `nombre_tipo_motivo`.
 */
export function getMotivosParaArea(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
): Array<{ codigo_area_tipo_motivo: number; nombre_tipo_motivo: string }> {
  const set = new Map<
    number,
    { codigo_area_tipo_motivo: number; nombre_tipo_motivo: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    const nombre = (f.nombre_tipo_motivo ?? "").toUpperCase();
    if (!nombre.includes(MOTIVO_MUESTREO_KEYWORD)) continue;
    set.set(f.codigo_area_tipo_motivo, {
      codigo_area_tipo_motivo: f.codigo_area_tipo_motivo,
      nombre_tipo_motivo: f.nombre_tipo_motivo,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_tipo_motivo.localeCompare(b.nombre_tipo_motivo, "es"),
  );
}

/**
 * Devuelve los componentes únicos aplicables al área + motivo.
 */
export function getComponentesParaAreaYMotivo(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
): Array<{ codigo_componente: number; nombre_componente: string }> {
  const set = new Map<
    number,
    { codigo_componente: number; nombre_componente: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
    set.set(f.codigo_componente, {
      codigo_componente: f.codigo_componente,
      nombre_componente: f.nombre_componente,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_componente.localeCompare(b.nombre_componente, "es"),
  );
}

/**
 * Devuelve las causas únicas aplicables al área + motivo + origen +
 * componente (la misma combinación que ya filtró el paso de causa del
 * wizard). `codigoOrigen` es opcional solo por compatibilidad hacia
 * atrás; si se omite, el resultado puede mezclar causas de otros
 * orígenes que compartan componente.
 */
export function getCausasParaAreaMotivoComponente(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
  codigoComponente: number,
  codigoOrigen?: number | null,
): Array<{ codigo_causa_defecto: number; nombre_causa_defecto: string }> {
  const set = new Map<
    number,
    { codigo_causa_defecto: number; nombre_causa_defecto: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
    if (codigoOrigen != null && f.codigo_origen !== codigoOrigen) continue;
    if (f.codigo_componente !== codigoComponente) continue;
    set.set(f.codigo_causa_defecto, {
      codigo_causa_defecto: f.codigo_causa_defecto,
      nombre_causa_defecto: f.nombre_causa_defecto,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_causa_defecto.localeCompare(b.nombre_causa_defecto, "es"),
  );
}
