import type { MuestreoTablaVirtual } from "@/types/interfaces";

/** Referencia estable para fallbacks sin tabla virtual (evita loops en useEffect). */
export const EMPTY_TABLA_VIRTUAL: MuestreoTablaVirtual[] = [];
