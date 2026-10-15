"use client";

import { useEffect, useState } from "react";
import type { Area } from "@/types/interfaces";
import { areaService } from "@/services/seguridades/area.service";
import { serviciosService } from "@/services/seguridades/servicios.service";
import { extractList } from "@/lib/extract-list";
import {
  matchAreasByDepartamento,
  parseFichaFromResponse,
  pickDepartamentoFromFicha,
  pickRegionalFromFicha,
} from "@/lib/resolve-area-departamento";
import { getCodigoPersonaFromStorage } from "@/app/dashboard/procesos/paros/user-utils";

export function useAreaDesdeDepartamento() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codigoPersona, setCodigoPersona] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [regional, setRegional] = useState("");
  const [areasMatch, setAreasMatch] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);

  useEffect(() => {
    let cancelled = false;
    const codigo = getCodigoPersonaFromStorage();
    setCodigoPersona(codigo);

    if (!codigo) {
      setIsLoading(false);
      setError(
        "No se encontró un identificador de usuario en la sesión. Vuelve a iniciar sesión.",
      );
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fichaRes, areasRes] = await Promise.all([
          serviciosService.getInformacionUsuarioByCodigoEmpleado(codigo),
          areaService.getCatalogo(),
        ]);
        if (cancelled) return;

        const ficha = parseFichaFromResponse(fichaRes);
        const depto = pickDepartamentoFromFicha(ficha);
        const regionalFicha = pickRegionalFromFicha(ficha);
        setDepartamento(depto);
        setRegional(regionalFicha);

        if (!depto) {
          setAreasMatch([]);
          setSelectedArea(null);
          setError(
            "La ficha del usuario no tiene DEPARTAMENTO. No se puede cruzar con las áreas.",
          );
          return;
        }

        const areas = extractList<Area>(areasRes);
        const areasFallback = Array.isArray((areasRes as { data?: unknown })?.data)
          ? ((areasRes as { data: Area[] }).data)
          : [];
        // Se filtra también por la regional del usuario logueado: el
        // mismo nombre de ficha social puede repetirse en más de una
        // regional (p.ej. "TECNOLOGIA" existe como área en UIO y en
        // GYE), y no queremos que el usuario pueda elegir — ni que se
        // auto-seleccione — un área de una regional que no es la suya.
        const match = matchAreasByDepartamento(
          areas.length > 0 ? areas : areasFallback,
          depto,
          regionalFicha,
        );
        setAreasMatch(match);
        setSelectedArea(match.length === 1 ? (match[0] ?? null) : null);
        if (match.length === 0) {
          setError(
            regionalFicha
              ? `No hay un área activa cuyo nombre de ficha social coincida con el departamento "${depto}" en la regional "${regionalFicha}".`
              : `No hay un área activa cuyo nombre de ficha social coincida con el departamento "${depto}".`,
          );
        }
      } catch (err) {
        if (cancelled) return;
        setAreasMatch([]);
        setSelectedArea(null);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo consultar el departamento o las áreas.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isLoading,
    error,
    codigoPersona,
    departamento,
    regional,
    areasMatch,
    selectedArea,
    setSelectedArea,
  };
}
