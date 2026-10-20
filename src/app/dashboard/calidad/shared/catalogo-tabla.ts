import * as XLSX from "xlsx";

export type ColumnaCatalogo = {
  key: string;
  label: string;
  tipo: "text" | "number";
  max?: number;
};

export type FilaCatalogo = {
  fila_origen: number;
  [key: string]: string | number | null;
};

export type ErrorArchivo = {
  filaExcel: number;
  mensaje: string;
};

export type FilaCargada = {
  filaExcel: number;
  fila_origen: number | null;
  valores: Record<string, string | number | null>;
  columnas: string[];
};

export type CampoCambio = {
  campo: string;
  label: string;
  antes: string | number | null;
  despues: string | number | null;
};

export type CambioAplicar = {
  tipo: "update" | "insert" | "delete";
  original?: Record<string, string | number | null>;
  valores: Record<string, string | number | null>;
};

export type CambioCatalogo = {
  tipo: "update" | "insert" | "delete";
  fila_origen: number | null;
  filaExcel: number;
  original: FilaCatalogo | null;
  valores: Record<string, string | number | null>;
  campos: CampoCambio[];
};

function quitarAcentos(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizarEncabezado(raw: unknown): string {
  return quitarAcentos(String(raw ?? ""))
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatValor(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 10000) / 10000);
  }
  return value;
}

function comoTexto(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    if (Number.isInteger(raw)) return String(raw);
    return String(raw);
  }
  return String(raw).replace(/\u00a0/g, " ").trim();
}

function parseNumeroLocal(text: string): number | null {
  const limpio = text.replace(/\s/g, "");
  if (!limpio) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)) {
    const valor = Number(limpio.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(valor) ? valor : null;
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(limpio)) {
    const valor = Number(limpio.replace(/,/g, ""));
    return Number.isFinite(valor) ? valor : null;
  }
  const valor = Number(limpio.replace(",", "."));
  return Number.isFinite(valor) ? valor : null;
}

function comoNumero(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, value: null };
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? { ok: true, value: raw } : { ok: false };
  }
  const text = String(raw).trim();
  if (!text) return { ok: true, value: null };
  const valor = parseNumeroLocal(text);
  return valor == null ? { ok: false } : { ok: true, value: valor };
}

function mismaCantidad(left: number | null, right: number | null): boolean {
  if (left == null && right == null) return true;
  if (left == null || right == null) return false;
  return Math.abs(left - right) < 1e-6;
}

function filaVacia(
  columnas: ColumnaCatalogo[],
  valores: Record<string, string | number | null>,
): boolean {
  return columnas.every((columna) => {
    const valor = valores[columna.key];
    if (columna.tipo === "text") return !valor;
    return valor == null;
  });
}

export function descargarCatalogo(
  columnas: ColumnaCatalogo[],
  filas: FilaCatalogo[],
  nombreArchivo: string,
) {
  const encabezados = columnas.map((columna) => columna.key);
  const aoa: Array<Array<string | number | null>> = [encabezados];
  for (const fila of filas) {
    aoa.push(
      columnas.map((columna) => {
        const valor = fila[columna.key];
        return valor === "" ? null : (valor ?? null);
      }),
    );
  }
  const hoja = XLSX.utils.aoa_to_sheet(aoa);
  hoja["!cols"] = encabezados.map((encabezado) => ({
    wch: Math.min(36, Math.max(14, encabezado.length + 2)),
  }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Catalogo");
  XLSX.writeFile(libro, nombreArchivo);
}

export function leerCatalogoExcel(
  buffer: ArrayBuffer,
  columnas: ColumnaCatalogo[],
  campoRequerido: string,
  mensajeRequerido: string,
): {
  filas: FilaCargada[];
  errores: ErrorArchivo[];
  materialesPresentes?: string[];
  errorEncabezado?: string;
} {
  const aliases: Record<string, string> = {};
  for (const columna of columnas) {
    aliases[normalizarEncabezado(columna.key)] = columna.key;
    aliases[normalizarEncabezado(columna.label)] = columna.key;
  }

  const libro = XLSX.read(buffer, { type: "array", cellDates: false });
  const nombre = libro.SheetNames[0];
  if (!nombre) {
    return { filas: [], errores: [], errorEncabezado: "El archivo no tiene hojas." };
  }
  const matriz = XLSX.utils.sheet_to_json<(string | number | null)[]>(libro.Sheets[nombre], {
    header: 1,
    raw: true,
    defval: "",
  });

  const requeridoNormalizado = normalizarEncabezado(campoRequerido);
  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, matriz.length); i += 1) {
    const celdas = (matriz[i] ?? []).map((celda) => normalizarEncabezado(celda));
    if (celdas.includes(requeridoNormalizado)) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex < 0) {
    return {
      filas: [],
      errores: [],
      errorEncabezado:
        "No encontré la fila de encabezados. Descarga el Excel desde esta pantalla y modifica ese archivo.",
    };
  }

  const mapa = new Map<string, number>();
  (matriz[headerIndex] ?? []).forEach((celda, index) => {
    const alias = aliases[normalizarEncabezado(celda)];
    if (alias && !mapa.has(alias)) mapa.set(alias, index);
  });
  if (!mapa.has(campoRequerido)) {
    return {
      filas: [],
      errores: [],
      errorEncabezado: `El Excel debe incluir la columna ${campoRequerido}. Descárgalo de nuevo desde esta pantalla.`,
    };
  }

  const columnasPresentes = columnas.filter((columna) => mapa.has(columna.key));
  const filas: FilaCargada[] = [];
  const errores: ErrorArchivo[] = [];
  const materialesVistos = new Set<string>();

  for (let i = headerIndex + 1; i < matriz.length; i += 1) {
    const linea = matriz[i] ?? [];
    const filaExcel = i + 1;
    const valores: Record<string, string | number | null> = {};
    let filaInvalida = false;
    for (const columna of columnas) {
      const index = mapa.get(columna.key);
      const crudo = index == null ? "" : linea[index];
      if (columna.tipo === "text") {
        const texto = index == null ? "" : comoTexto(crudo);
        if (columna.max && texto.length > columna.max) {
          errores.push({
            filaExcel,
            mensaje: `${columna.label} supera ${columna.max} caracteres.`,
          });
          filaInvalida = true;
          break;
        }
        valores[columna.key] = texto;
      } else {
        const parsed = index == null ? { ok: true as const, value: null } : comoNumero(crudo);
        if (!parsed.ok) {
          errores.push({
            filaExcel,
            mensaje: `${columna.label} no es un número válido.`,
          });
          filaInvalida = true;
          break;
        }
        valores[columna.key] = parsed.value;
      }
    }
    if (filaInvalida || filaVacia(columnas, valores)) continue;

    const material = comoTexto(valores[campoRequerido]);
    if (!material) {
      errores.push({ filaExcel, mensaje: mensajeRequerido });
      continue;
    }
    if (materialesVistos.has(material)) {
      errores.push({
        filaExcel,
        mensaje: `El material ${material} está repetido en el archivo.`,
      });
      continue;
    }
    materialesVistos.add(material);
    filas.push({
      filaExcel,
      fila_origen: null,
      valores,
      columnas: columnasPresentes.map((columna) => columna.key),
    });
  }

  return { filas, errores, materialesPresentes: [...materialesVistos] };
}

function claveMaterial(valor: unknown): string {
  return comoTexto(valor);
}

export function detectarCambios(
  columnas: ColumnaCatalogo[],
  originales: FilaCatalogo[],
  cargadas: FilaCargada[],
  campoRequerido: string,
  materialesPresentes: string[] = [],
): { cambios: CambioCatalogo[]; errores: ErrorArchivo[] } {
  const porMaterial = new Map<string, FilaCatalogo>();
  for (const fila of originales) {
    const clave = claveMaterial(fila[campoRequerido]);
    if (!clave || porMaterial.has(clave)) continue;
    porMaterial.set(clave, fila);
  }

  const cambios: CambioCatalogo[] = [];
  const errores: ErrorArchivo[] = [];
  const conservados = new Set(materialesPresentes.map((material) => claveMaterial(material)));

  for (const cargada of cargadas) {
    const clave = claveMaterial(cargada.valores[campoRequerido]);
    if (clave) conservados.add(clave);
    const original = clave ? porMaterial.get(clave) : undefined;
    if (!original) {
      const campos: CampoCambio[] = columnas
        .filter((columna) => {
          const valor = cargada.valores[columna.key];
          return valor != null && valor !== "";
        })
        .map((columna) => ({
          campo: columna.key,
          label: columna.label,
          antes: null,
          despues: cargada.valores[columna.key] ?? null,
        }));
      cambios.push({
        tipo: "insert",
        fila_origen: null,
        filaExcel: cargada.filaExcel,
        original: null,
        valores: cargada.valores,
        campos,
      });
      continue;
    }

    const presentes = new Set(cargada.columnas);
    const campos: CampoCambio[] = [];
    const valores: Record<string, string | number | null> = {};
    for (const columna of columnas) {
      valores[columna.key] = original[columna.key] ?? (columna.tipo === "number" ? null : "");
    }

    for (const columna of columnas) {
      if (!presentes.has(columna.key)) continue;
      const antes = original[columna.key] ?? null;
      const despues = cargada.valores[columna.key] ?? null;
      const distinto =
        columna.tipo === "number"
          ? !mismaCantidad(antes as number | null, despues as number | null)
          : String(antes ?? "") !== String(despues ?? "");
      if (!distinto) continue;
      valores[columna.key] = despues;
      campos.push({
        campo: columna.key,
        label: columna.label,
        antes: antes === "" ? null : antes,
        despues: despues === "" ? null : despues,
      });
    }

    if (campos.length === 0) continue;
    cambios.push({
      tipo: "update",
      fila_origen: original.fila_origen,
      filaExcel: cargada.filaExcel,
      original,
      valores,
      campos,
    });
  }

  for (const original of originales) {
    const clave = claveMaterial(original[campoRequerido]);
    if (!clave || conservados.has(clave)) continue;
    const valores: Record<string, string | number | null> = {};
    const campos: CampoCambio[] = columnas.map((columna) => {
      const antes = original[columna.key] ?? null;
      valores[columna.key] = antes === "" ? null : antes;
      return {
        campo: columna.key,
        label: columna.label,
        antes: antes === "" ? null : antes,
        despues: null,
      };
    });
    cambios.push({
      tipo: "delete",
      fila_origen: original.fila_origen,
      filaExcel: 0,
      original,
      valores,
      campos,
    });
  }

  return { cambios, errores };
}

export function interpretarEdicion(
  columnas: ColumnaCatalogo[],
  campoRequerido: string,
  mensajeRequerido: string,
  borrador: Record<string, string>,
): { error?: string; valores?: Record<string, string | number | null> } {
  const valores: Record<string, string | number | null> = {};
  for (const columna of columnas) {
    const crudo = borrador[columna.key] ?? "";
    if (columna.tipo === "text") {
      const texto = comoTexto(crudo);
      if (columna.max && texto.length > columna.max) {
        return { error: `${columna.label} supera ${columna.max} caracteres.` };
      }
      valores[columna.key] = texto;
    } else {
      const parsed = comoNumero(crudo);
      if (!parsed.ok) {
        return { error: `${columna.label} no es un número válido.` };
      }
      valores[columna.key] = parsed.value;
    }
  }
  if (!valores[campoRequerido]) {
    return { error: mensajeRequerido };
  }
  return { valores };
}

export function cambioDesdeValores(
  columnas: ColumnaCatalogo[],
  original: FilaCatalogo,
  editados: Record<string, string | number | null>,
): CambioCatalogo | null {
  const campos: CampoCambio[] = [];
  const valores: Record<string, string | number | null> = {};
  for (const columna of columnas) {
    const antes = original[columna.key] ?? (columna.tipo === "number" ? null : "");
    const despues = editados[columna.key] ?? (columna.tipo === "number" ? null : "");
    valores[columna.key] = despues;
    const distinto =
      columna.tipo === "number"
        ? !mismaCantidad(antes as number | null, despues as number | null)
        : String(antes ?? "") !== String(despues ?? "");
    if (!distinto) continue;
    campos.push({
      campo: columna.key,
      label: columna.label,
      antes: antes === "" ? null : antes,
      despues: despues === "" ? null : despues,
    });
  }
  if (campos.length === 0) return null;
  return {
    tipo: "update",
    fila_origen: original.fila_origen,
    filaExcel: 0,
    original,
    valores,
    campos,
  };
}

export function valoresVisibles(
  columnas: ColumnaCatalogo[],
  original: FilaCatalogo,
  cambio: CambioCatalogo | undefined,
): Record<string, string | number | null> {
  if (cambio) return cambio.valores;
  const valores: Record<string, string | number | null> = {};
  for (const columna of columnas) {
    valores[columna.key] = original[columna.key] ?? null;
  }
  return valores;
}
