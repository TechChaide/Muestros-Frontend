"use client";

/**
 * Helpers que derivan motivos/componentes/causas a partir de la tabla virtual.
 * Centraliza la lógica de filtrado para que los 3 pasos siguientes (2/3/4)
 * compartan las mismas reglas.
 */
import type { MuestreoTablaVirtual } from "@/types/interfaces";

/**
 * Keywords que identifican el tipo_motivo de paros de máquina
 * (case-insensitive, match por `includes`).
 */
export const KEYWORDS_MOTIVO_PAROM = [
  "PARO DE MÁQUINA",
  "PAROS MAQUINA",
  "PARO MAQUINA",
] as const;

/** @deprecated Preferir KEYWORDS_MOTIVO_PAROM / esMotivoParoM. */
export const MOTIVO_PAROM_KEYWORD = KEYWORDS_MOTIVO_PAROM[0];

/** True si el nombre del tipo_motivo corresponde a paros de máquina. */
export function esMotivoParoM(
  nombreTipoMotivo: string | undefined | null,
): boolean {
  const n = (nombreTipoMotivo ?? "").toUpperCase();
  return KEYWORDS_MOTIVO_PAROM.some((k) => n.includes(k.toUpperCase()));
}

/**
 * Códigos de área que tienen al menos un motivo de paro de máquina
 * en la tabla virtual.
 */
export function getCodigosAreaConMotivoParoM(
  filas: MuestreoTablaVirtual[],
): Set<number> {
  const set = new Set<number>();
  for (const f of filas) {
    if (esMotivoParoM(f.nombre_tipo_motivo)) {
      set.add(f.codigo_area);
    }
  }
  return set;
}

/**
 * Devuelve los motivos únicos aplicables al `codigo_area` elegido,
 * filtrando únicamente los de paro de máquina.
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
    if (!esMotivoParoM(f.nombre_tipo_motivo)) continue;
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
  filas:MuestreoTablaVirtual[],
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
 * Devuelve las causas únicas aplicables al área + motivo + componente.
 * Para esta versión del wizard usamos la primera OC que coincida por
 * `codigo_origen_componente`; el backend lo garantiza único por combinación.
 */
export function getCausasParaAreaMotivoComponente(
  filas:MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
  codigoComponente: number,
): Array<{ codigo_causa_defecto: number; nombre_causa_defecto: string }> {
  const set = new Map<
    number,
    { codigo_causa_defecto: number; nombre_causa_defecto: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
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
