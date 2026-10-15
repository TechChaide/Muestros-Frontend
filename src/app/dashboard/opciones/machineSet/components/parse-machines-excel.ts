import * as XLSX from "xlsx";
import type { MaquinasMantenimiento } from "@/types/interfaces";

export type MachineExcelRow = {
  rowNumber: number;
  maquina: string;
  componente: string;
  actividad: string;
  regional: string;
  errors: string[];
};

export type ParseMachinesResult = {
  rows: MachineExcelRow[];
  valid: MachineExcelRow[];
  invalid: MachineExcelRow[];
  headerError?: string;
};

const HEADER_ALIASES: Record<keyof Pick<
  MaquinasMantenimiento,
  "maquina" | "componente" | "actividad" | "regional"
>, string[]> = {
  maquina: ["maquina", "máquina", "cod_maquina", "codigo_maquina"],
  componente: ["componente", "descripcion", "descripción", "nombre"],
  actividad: ["actividad"],
  regional: ["regional"],
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(raw: unknown): string {
  return stripAccents(String(raw ?? ""))
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cellText(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).replace(/\u00a0/g, " ").trim();
}

export function normalizeRegional(raw: string): string {
  const v = stripAccents(raw).toUpperCase().trim();
  if (!v) return "";
  if (v === "QUITO" || v === "UIO") return "UIO";
  if (v === "GUAYAQUIL" || v === "GYE") return "GYE";
  return v;
}

export function normalizeMaquinaCode(raw: string): string {
  return stripAccents(raw).toUpperCase().replace(/\s+/g, "").trim();
}

export function normalizeActividad(raw: string): string {
  return stripAccents(raw).toUpperCase().replace(/\s+/g, " ").trim();
}

export type MachineIdentity = {
  maquina?: string | null;
  actividad?: string | null;
  regional?: string | null;
};

const DUPLICATE_MSG = "Ya existe para esta actividad y regional";

export function machineUniqueKey(row: MachineIdentity): string {
  const maquina = normalizeMaquinaCode(row.maquina ?? "");
  const actividad = normalizeActividad(row.actividad ?? "");
  const regional = normalizeRegional(row.regional ?? "");
  if (!maquina || !actividad || !regional) return "";
  return `${maquina}||${actividad}||${regional}`;
}

export function toExistingMachineKeySet(
  records: MachineIdentity[],
): Set<string> {
  const set = new Set<string>();
  for (const r of records) {
    const key = machineUniqueKey(r);
    if (key) set.add(key);
  }
  return set;
}

export function applyExistingMaquinas(
  result: ParseMachinesResult,
  existing: MachineIdentity[],
): ParseMachinesResult {
  if (result.headerError) return result;
  const existingSet = toExistingMachineKeySet(existing);
  const rows = result.rows.map((row) => {
    const key = machineUniqueKey(row);
    if (key && existingSet.has(key) && !row.errors.includes(DUPLICATE_MSG)) {
      return { ...row, errors: [...row.errors, DUPLICATE_MSG] };
    }
    return row;
  });
  return {
    ...result,
    rows,
    valid: rows.filter((r) => r.errors.length === 0),
    invalid: rows.filter((r) => r.errors.length > 0),
  };
}

function resolveColumnMap(
  headerRow: unknown[],
): Record<string, number> | null {
  const map: Record<string, number> = {};
  headerRow.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    if (!header) return;
    (Object.keys(HEADER_ALIASES) as Array<keyof typeof HEADER_ALIASES>).forEach(
      (field) => {
        if (HEADER_ALIASES[field].some((alias) => normalizeHeader(alias) === header)) {
          map[field] = index;
        }
      },
    );
  });
  if (
    map.maquina == null ||
    map.componente == null ||
    map.actividad == null ||
    map.regional == null
  ) {
    return null;
  }
  return map;
}

function buildRows(matrix: unknown[][]): ParseMachinesResult {
  if (matrix.length === 0) {
    return {
      rows: [],
      valid: [],
      invalid: [],
      headerError:
        "El archivo está vacío. Usa las columnas maquina, componente, actividad y REGIONAL.",
    };
  }

  const headerIndex = matrix.findIndex((row) =>
    (row ?? []).some((cell) => normalizeHeader(cell).length > 0),
  );
  if (headerIndex < 0) {
    return {
      rows: [],
      valid: [],
      invalid: [],
      headerError: "No se encontró la fila de encabezados.",
    };
  }

  const columnMap = resolveColumnMap(matrix[headerIndex] ?? []);
  if (!columnMap) {
    return {
      rows: [],
      valid: [],
      invalid: [],
      headerError:
        "El Excel debe tener las columnas: maquina, componente, actividad y REGIONAL.",
    };
  }

  const rows: MachineExcelRow[] = [];
  for (let i = headerIndex + 1; i < matrix.length; i++) {
    const raw = matrix[i] ?? [];
    const maquina = normalizeMaquinaCode(cellText(raw[columnMap.maquina]));
    const componente = cellText(raw[columnMap.componente]);
    const actividad = cellText(raw[columnMap.actividad]);
    const regional = normalizeRegional(cellText(raw[columnMap.regional]));
    const isEmpty = !maquina && !componente && !actividad && !regional;
    if (isEmpty) continue;

    const errors: string[] = [];
    if (!maquina) errors.push("Falta maquina");
    if (!componente) errors.push("Falta componente");
    if (!actividad) errors.push("Falta actividad");
    if (!regional) errors.push("Falta regional");

    rows.push({
      rowNumber: i + 1,
      maquina,
      componente,
      actividad,
      regional,
      errors,
    });
  }

  const seen = new Set<string>();
  for (const row of rows) {
    const key = machineUniqueKey(row);
    if (!key) continue;
    if (seen.has(key)) {
      row.errors.push("Duplicada en el archivo para la misma actividad y regional");
    }
    seen.add(key);
  }

  return {
    rows,
    valid: rows.filter((r) => r.errors.length === 0),
    invalid: rows.filter((r) => r.errors.length > 0),
  };
}

function parseCsvMatrix(text: string): unknown[][] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const firstLine = cleaned.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  const pushCell = () => {
    row.push(current);
    current = "";
  };
  const pushRow = () => {
    pushCell();
    rows.push([...row]);
    row.length = 0;
  };

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      pushCell();
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i += 1;
      pushRow();
      continue;
    }
    current += ch;
  }
  if (current.length > 0 || row.length > 0) pushRow();
  return rows;
}

export async function parseMachinesFile(file: File): Promise<ParseMachinesResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    const text = await file.text();
    return buildRows(parseCsvMatrix(text));
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      valid: [],
      invalid: [],
      headerError: "El archivo no contiene hojas.",
    };
  }
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  }) as unknown[][];
  return buildRows(matrix);
}

export function downloadMachinesTemplate(): void {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["maquina", "componente", "actividad", "REGIONAL"],
    ["AGA01", "Agitador quimicos almohadas 1", "1 ALMOHADAS", "UIO"],
  ]);
  sheet["!cols"] = [
    { wch: 14 },
    { wch: 42 },
    { wch: 18 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet, "Maquinas");
  XLSX.writeFile(workbook, "plantilla_carga_maquinas.xlsx");
}

export function toSavePayload(row: {
  maquina: string;
  componente: string;
  actividad: string;
  regional: string;
}): MaquinasMantenimiento {
  return {
    id_maq: 0,
    maquina: row.maquina,
    componente: row.componente,
    actividad: row.actividad,
    regional: row.regional,
  };
}
