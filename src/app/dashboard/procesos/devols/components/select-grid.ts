"use client";

/**
 * Helpers de filtrado para el wizard de `/dashboard/procesos/devols`.
 * Motivos cuyo nombre contiene "DEVOLUCIONES".
 */
import type { MuestreoTablaVirtual } from "@/types/interfaces";

export const MOTIVO_DEVOLUCIONES_KEYWORD = "DEVOLUCIONES";

export function esMotivoDevoluciones(
  nombreTipoMotivo: string | undefined | null,
): boolean {
  return (nombreTipoMotivo ?? "")
    .toUpperCase()
    .includes(MOTIVO_DEVOLUCIONES_KEYWORD);
}

/** Códigos de área con al menos un motivo DEVOLUCIONES en la tabla virtual. */
export function getCodigosAreaConMotivoDevoluciones(
  filas: MuestreoTablaVirtual[],
): Set<number> {
  const set = new Set<number>();
  for (const f of filas) {
    if (esMotivoDevoluciones(f.nombre_tipo_motivo)) {
      set.add(f.codigo_area);
    }
  }
  return set;
}

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
    if (!esMotivoDevoluciones(f.nombre_tipo_motivo)) continue;
    set.set(f.codigo_area_tipo_motivo, {
      codigo_area_tipo_motivo: f.codigo_area_tipo_motivo,
      nombre_tipo_motivo: f.nombre_tipo_motivo,
    });
  }
  return Array.from(set.values()).sort((a, b) =>
    a.nombre_tipo_motivo.localeCompare(b.nombre_tipo_motivo, "es"),
  );
}

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

export function getCausasParaAreaMotivoComponente(
  filas: MuestreoTablaVirtual[],
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
