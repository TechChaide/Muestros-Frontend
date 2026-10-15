/**
 * Helpers puros para filas de captura con cantidad + causas.
 */

export interface CausaOption {
  codigo_causa_defecto: number;
  nombre_causa_defecto: string;
}

export interface MuestraCapturaMeta {
  id: string;
  /** Unidades físicas que representa esta fila → registro.cantidad */
  cantidad: number;
  /**
   * Causas asociadas a esta fila (pueden ir vacías).
   * Al crear una fila nueva se prellena con la causa inicial del wizard
   * si existe, pero el usuario puede quitarla o agregar otras.
   */
  causasIds: number[];
}

export function newMuestraId(): string {
  return `muestra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Crea meta de una fila nueva; opcionalmente preasocia la causa inicial. */
export function createMuestraMeta(
  causaInicialId?: number | null,
  cantidad: number = 1,
): MuestraCapturaMeta {
  return {
    id: newMuestraId(),
    cantidad: Math.max(1, cantidad),
    causasIds:
      causaInicialId != null && causaInicialId > 0 ? [causaInicialId] : [],
  };
}

export function nombresDeCausasIds(
  ids: number[],
  catalogo: CausaOption[],
): string[] {
  return ids
    .map(
      (id) =>
        catalogo.find((c) => c.codigo_causa_defecto === id)
          ?.nombre_causa_defecto,
    )
    .filter((n): n is string => !!n);
}

/** @deprecated alias — mantener imports viejos si quedan */
export type VariacionCausas = MuestraCapturaMeta & {
  causasExtrasIds?: number[];
};

export function createDefaultVariacion(
  cantidad: number = 1,
  causaInicialId?: number | null,
): MuestraCapturaMeta {
  return createMuestraMeta(causaInicialId, cantidad);
}

export function sumVariaciones(
  rows: Array<{ cantidad: number }>,
): number {
  return rows.reduce((acc, v) => acc + (Number(v.cantidad) || 0), 0);
}

export function nombresCausasVariacion(
  _causaPrincipal: CausaOption | null,
  variacion: { causasIds?: number[]; causasExtrasIds?: number[] },
  catalogo: CausaOption[],
): string[] {
  const ids =
    variacion.causasIds ??
    (_causaPrincipal
      ? [
          _causaPrincipal.codigo_causa_defecto,
          ...(variacion.causasExtrasIds ?? []),
        ]
      : (variacion.causasExtrasIds ?? []));
  return nombresDeCausasIds(ids, catalogo);
}
