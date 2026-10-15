"use client";

import { useEffect, useRef, useState } from "react";
import { extractList, pickRowField } from "@/lib/extract-list";
import { serviciosMuestreosService } from "@/services/seguridades/serviciosMuestreos.service";

export interface ProveedorResult {
  CODIGO: string;
  PROVEEDOR: string;
}

/** Devoluciones + origen PROVEEDOR: cargar catálogo de proveedores para comodín. */
export function debeCargarProveedores(
  motivo: string | undefined | null,
  origen: string | undefined | null,
): boolean {
  const m = (motivo ?? "").trim().toUpperCase();
  const o = (origen ?? "").trim().toUpperCase();
  return m.includes("DEVOLUCION") && o.includes("PROVEEDOR");
}

export function useProveedoresCatalog(
  regional: string,
  departamento: string,
  componente: string,
  enabled = true,
) {
  const [proveedores, setProveedores] = useState<ProveedorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const reg = regional.trim();
    const dep = departamento.trim();
    const comp = componente.trim();
    if (!enabled || !reg || !dep || !comp) {
      setProveedores([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await serviciosMuestreosService.getInformacionProveedores(
          reg,
          dep,
          comp,
        );
        if (cancelled || !mountedRef.current) return;

        const seen = new Set<string>();
        const rows: ProveedorResult[] = [];
        for (const f of extractList<Record<string, unknown>>(res)) {
          const codigo = pickRowField(f, ["CODIGO", "Codigo", "codigo"]);
          const proveedor = pickRowField(f, [
            "PROVEEDOR",
            "Proveedor",
            "proveedor",
            "PROOVEEDOR",
          ]);
          if (!codigo || seen.has(codigo)) continue;
          seen.add(codigo);
          rows.push({ CODIGO: codigo, PROVEEDOR: proveedor });
        }
        rows.sort((a, b) =>
          (a.PROVEEDOR || a.CODIGO).localeCompare(b.PROVEEDOR || b.CODIGO, "es"),
        );
        setProveedores(rows);
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        const msg =
          err instanceof Error ? err.message : "Error al cargar proveedores";
        setError(msg);
        setProveedores([]);
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [regional, departamento, componente, enabled]);

  return { proveedores, loading, error };
}
