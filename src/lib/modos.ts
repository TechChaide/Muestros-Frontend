/**
 * Modos de captura de datos de un formulario, definidos en la variable de
 * entorno `MODOS` (ver .env). Cada modo describe de dónde se obtiene la
 * información que llena un formulario asociado a un `AreaTipoMotivo`:
 *
 *   - MANUAL   : el usuario llena el formulario con los campos de la tabla.
 *   - CONSULTA : se ejecuta un stored procedure (`caso`) que recupera órdenes.
 *   - ESCANEO  : se habilita la cámara para leer QR / código de barras.
 *
 * IMPORTANTE: el valor de `caso` NUNCA debe ejecutarse directamente como
 * nombre de SP en el backend. Debe validarse contra una lista blanca.
 */
export interface Modo {
  /** Discriminador: MANUAL | CONSULTA | ESCANEO */
  tipo_fuente: string;
  /**
   * Identificador numérico del modo (proviene del JSON en .env como
   * `valor: "1"`, `valor: "3"`, etc.). Lo usamos como discriminador
   * auxiliar en backend y como badge informativo en el frontend.
   * Si el modo no define `valor`, se persiste como "".
   */
  valor: string;
  /** Parámetro del modo (p. ej. nombre lógico de SP) o "" cuando no aplica. */
  caso: string;
  /** Texto descriptivo mostrado en la UI. */
  descripcion: string;
}

/** Selección concreta de fuente que se guarda en `AreaTipoMotivo`. */
export interface FuenteSeleccion {
  tipo_fuente: string;
  /**
   * Valor heredado del modo elegido. Se persiste en `area_tipo_motivo`
   * para que el backend pueda identificar exactamente qué modo está activo.
   */
  valor: string;
  /** "" cuando el modo no tiene caso (MANUAL / ESCANEO). */
  caso: string;
}

/**
 * Normaliza el valor de `caso`: los valores 'null', vacíos o nulos se
 * consideran "sin caso" y devuelven "".
 */
export function normalizeCaso(caso?: string | null): string {
  if (!caso) return "";
  const t = caso.trim();
  return t === "" || t.toLowerCase() === "null" ? "" : t;
}

/**
 * Normaliza el `valor` numérico del modo: lo conservamos como string
 * (porque así viene en el JSON del .env). "" cuando viene vacío o "null".
 */
export function normalizeValor(valor?: string | null): string {
  if (!valor) return "";
  const t = String(valor).trim();
  return t === "" || t.toLowerCase() === "null" ? "" : t;
}

/**
 * Separa un `valor`/`caso` compuesto por varios orígenes en sus partes
 * individuales. Algunos procesos necesitan más de una fuente CONSULTA /
 * ESCANEO para un mismo motivo (p. ej. dos SP distintos); en ese caso el
 * usuario los elige todos en `FuenteSelect` y se persisten unidos por "," o
 * "&" en `AreaTipoMotivo.valor` / `AreaTipoMotivo.caso`. Cada consumidor
 * (UI de asignación, consulta de órdenes) usa este mismo separador para no
 * desincronizarse.
 */
export function splitFuenteMultiple(valor: string): string[] {
  return valor
    .split(/[,&]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Parsea el contenido crudo de la variable `MODOS`. Acepta JSON válido
 * (comillas dobles) y, de forma tolerante, JSON con comillas simples.
 * Si el contenido es inválido o vacío, devuelve `[]` sin lanzar.
 */
export function parseModos(raw: string | undefined | null): Modo[] {
  const text = (raw || "").trim();
  if (!text) return [];

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    try {
      // Tolerar comillas simples (config escrita a mano en .env).
      data = JSON.parse(text.replace(/'/g, '"'));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(data)) return [];

  return data
    .filter(
      (x): x is Record<string, unknown> =>
        x != null && typeof x === "object",
    )
    .map((x) => ({
      tipo_fuente: String(x.tipo_fuente ?? "").trim(),
      valor: normalizeValor(String(x.valor ?? "")),
      caso: normalizeCaso(String(x.caso ?? "")),
      descripcion: String(x.descripcion ?? "").trim(),
    }))
    .filter((m) => m.tipo_fuente.length > 0);
}

let cached: Modo[] | null = null;

/** Devuelve los modos configurados (memoizados en el primer acceso). */
export function getModos(): Modo[] {
  if (cached) return cached;
  // `process.env.MODOS` se inyecta en el bundle vía next.config (clave `env`).
  cached = parseModos(process.env.MODOS);
  return cached;
}
