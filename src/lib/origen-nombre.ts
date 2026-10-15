/**
 * Normaliza el nombre de un origen para persistencia:
 * mayúsculas, sin acentos y sin caracteres especiales (solo A-Z, 0-9 y espacios).
 */
export function normalizeOrigenNombre(raw: string): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Valor sentinela del select para texto libre. */
export const ORIGEN_OPCION_OTROS = "__otros__";
