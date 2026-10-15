/**
 * Consulta de órdenes trabajadas cuando un motivo tiene MÁS DE UN origen
 * de datos asignado (`AreaTipoMotivo.caso` con varios valores unidos por
 * "," o "&", ver `FuenteSelect` / `splitFuenteMultiple`).
 *
 * El backend (`getOrdenesTrabajadas`) solo acepta UN `Caso` por llamada,
 * así que aquí se dispara una consulta POR CADA origen y se combinan los
 * resultados (sin duplicar por `NUM_ORDEN`).
 */
import type { OrdenesTrabajadas } from "@/types/interfaces";
import { serviciosMuestreosService } from "@/services/seguridades/serviciosMuestreos.service";
import { splitFuenteMultiple } from "@/lib/modos";

export async function getOrdenesTrabajadasMultiCaso(
  caso: string,
  responsables: string,
  codigo: string,
): Promise<OrdenesTrabajadas[]> {
  const casos = splitFuenteMultiple(caso);
  if (casos.length === 0) return [];

  const resultados = await Promise.allSettled(
    casos.map((c) =>
      serviciosMuestreosService.getInformacionOrdenesByResponsblesYCaso(
        c,
        responsables,
        codigo,
      ),
    ),
  );

  const errores: string[] = [];
  const vistos = new Set<string>();
  const combinadas: OrdenesTrabajadas[] = [];

  resultados.forEach((res, i) => {
    if (res.status === "rejected") {
      const msg =
        res.reason instanceof Error ? res.reason.message : String(res.reason);
      errores.push(`${casos[i]}: ${msg}`);
      return;
    }
    const filas = ((res.value.data ?? []) as OrdenesTrabajadas[]).filter(
      (o) => o && o.NUM_ORDEN,
    );
    for (const f of filas) {
      const key = String(f.NUM_ORDEN);
      if (vistos.has(key)) continue;
      vistos.add(key);
      combinadas.push(f);
    }
  });

  // Si TODOS los orígenes fallaron, propagamos el error (nada que mostrar).
  // Si solo algunos fallaron, seguimos con lo que sí llegó: es mejor
  // mostrar órdenes parciales que bloquear al inspector por un origen caído.
  if (errores.length === casos.length) {
    throw new Error(errores.join(" | "));
  }

  return combinadas;
}
