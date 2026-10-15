"use client";

/**
 * Helpers que derivan origen/componente/causa a partir de la tabla virtual
 * para el wizard de `/dashboard/procesos/paros`.
 *
 * Área y Motivo se resuelven fuera (automáticos). Aquí la cadena es:
 *   Motivo (ATM) → Origen → Componente → Causa
 */
import type { MuestreoTablaVirtual } from "@/types/interfaces";

/**
 * Keywords de motivo aceptadas para este flujo. La primera coincidencia
 * gana al auto-resolver el motivo del área del usuario.
 */
export const KEYWORDS_MOTIVO_PARO = [
  "PARO NO PROGRAMADO",
  "PARO DE MÁQUINA",
  "PAROS",
] as const;

/** True si el nombre del motivo encaja con el flujo de paros. */
export function esMotivoDeParo(nombreTipoMotivo: string | undefined | null): boolean {
  const n = (nombreTipoMotivo ?? "").toUpperCase();
  return KEYWORDS_MOTIVO_PARO.some((k) => n.includes(k.toUpperCase()));
}

/**
 * Motivos únicos de paro aplicables al `codigo_area` (para auto-resolución).
 * Orden: prioridad de `KEYWORDS_MOTIVO_PARO`.
 */
export function getMotivosParoParaArea(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
): Array<{ codigo_area_tipo_motivo: number; nombre_tipo_motivo: string }> {
  const set = new Map<
    number,
    { codigo_area_tipo_motivo: number; nombre_tipo_motivo: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (!esMotivoDeParo(f.nombre_tipo_motivo)) continue;
    set.set(f.codigo_area_tipo_motivo, {
      codigo_area_tipo_motivo: f.codigo_area_tipo_motivo,
      nombre_tipo_motivo: f.nombre_tipo_motivo,
    });
  }
  const list = Array.from(set.values());
  list.sort((a, b) => {
    const ia = KEYWORDS_MOTIVO_PARO.findIndex((k) =>
      a.nombre_tipo_motivo.toUpperCase().includes(k.toUpperCase()),
    );
    const ib = KEYWORDS_MOTIVO_PARO.findIndex((k) =>
      b.nombre_tipo_motivo.toUpperCase().includes(k.toUpperCase()),
    );
    if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.nombre_tipo_motivo.localeCompare(b.nombre_tipo_motivo, "es");
  });
  return list;
}

/** Orígenes únicos para área + motivo (ATM). */
export function getOrigenesParaAreaYMotivo(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
): Array<{ codigo_origen: number; nombre_origen: string }> {
  const set = new Map<
    number,
    { codigo_origen: number; nombre_origen: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
    set.set(f.codigo_origen, {
      codigo_origen: f.codigo_origen,
      nombre_origen: f.nombre_origen,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_origen.localeCompare(b.nombre_origen, "es"),
  );
}

/** Componentes únicos para área + motivo + origen. */
export function getComponentesParaAreaMotivoOrigen(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
  codigoOrigen: number,
): Array<{ codigo_componente: number; nombre_componente: string }> {
  const set = new Map<
    number,
    { codigo_componente: number; nombre_componente: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
    if (f.codigo_origen !== codigoOrigen) continue;
    set.set(f.codigo_componente, {
      codigo_componente: f.codigo_componente,
      nombre_componente: f.nombre_componente,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_componente.localeCompare(b.nombre_componente, "es"),
  );
}

/** Causas únicas para área + motivo + origen + componente. */
export function getCausasParaAreaMotivoOrigenComponente(
  filas: MuestreoTablaVirtual[],
  codigoArea: number,
  codigoAreaTipoMotivo: number,
  codigoOrigen: number,
  codigoComponente: number,
): Array<{ codigo_causa_defecto: number; nombre_causa_defecto: string }> {
  const set = new Map<
    number,
    { codigo_causa_defecto: number; nombre_causa_defecto: string }
  >();
  for (const f of filas) {
    if (f.codigo_area !== codigoArea) continue;
    if (f.codigo_area_tipo_motivo !== codigoAreaTipoMotivo) continue;
    if (f.codigo_origen !== codigoOrigen) continue;
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
