"use client";

import { useEffect, useState } from "react";
import { componenteService } from "@/services/seguridades/componente.service";
import { pickRowField } from "@/lib/extract-list";

function extractComponenteRecord(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== "object") return null;
  const obj = res as Record<string, unknown>;
  let data: unknown = obj.data ?? obj;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }

  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }

  return null;
}

function unidadesFromRecord(record: Record<string, unknown> | null): string {
  if (!record) return "";
  return pickRowField(record, ["unidades", "Unidades"]);
}

/**
 * Resuelve `Componente.unidades` por PK y notifica al formulario de captura.
 * El valor se persiste en `Registro.unidades` (campo oculto; puede ir vacío).
 */
export function useSyncRegistroUnidades(
  codigoComponente: number | null | undefined,
  onUnidades: (unidades: string) => void,
  unidadesIniciales?: string,
) {
  const [isLoadingUnidades, setIsLoadingUnidades] = useState(false);

  useEffect(() => {
    const seed = (unidadesIniciales ?? "").trim();
    if (seed) {
      // eslint-disable-next-line no-console
      console.log("[useSyncRegistroUnidades] seed desde wizard →", seed);
      onUnidades(seed);
    }
  }, [unidadesIniciales, onUnidades]);

  useEffect(() => {
    if (codigoComponente == null || codigoComponente <= 0) {
      // eslint-disable-next-line no-console
      console.log("[useSyncRegistroUnidades] sin codigoComponente, unidades vacías");
      onUnidades("");
      return;
    }

    let cancelled = false;
    setIsLoadingUnidades(true);

    // eslint-disable-next-line no-console
    console.log(
      "[useSyncRegistroUnidades] resolviendo unidades para componente",
      codigoComponente,
    );

    componenteService
      .getUnidades(codigoComponente)
      .then((res) => {
        if (cancelled) return;
        const unidades = unidadesFromRecord(extractComponenteRecord(res));
        onUnidades(unidades);
      })
      .catch(() => {
        if (cancelled) return;
        onUnidades("");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingUnidades(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codigoComponente, onUnidades]);

  return { isLoadingUnidades };
}

