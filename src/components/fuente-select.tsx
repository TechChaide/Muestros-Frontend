"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getModos,
  normalizeCaso,
  normalizeValor,
  splitFuenteMultiple,
  type FuenteSeleccion,
  type Modo,
} from "@/lib/modos";

interface FuenteSelectProps {
  /** Selección actual (o null si aún no se ha elegido). */
  value: FuenteSeleccion | null;
  /** Notifica la nueva selección (tipo_fuente + valor + caso). */
  onChange: (value: FuenteSeleccion) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Solo el tipo CONSULTA admite combinar varios orígenes a la vez (varios SP
 * distintos consultados uno por uno, ver `getOrdenesTrabajadasMultiCaso`).
 * MANUAL y ESCANEO son siempre de selección única: un escaneo valida un
 * código contra UN solo origen, no tiene sentido combinarlo con otros.
 */
const TIPO_FUENTE_COMBINABLE = "CONSULTA";

/**
 * Select de fuente de datos.
 *
 * Primero se elige el `tipo_fuente` (MANUAL / CONSULTA / ESCANEO). Si ese
 * grupo tiene más de un modo configurado:
 *   - CONSULTA → checkboxes: el usuario puede marcar varios a la vez. Los
 *     `valor`/`caso` de los modos marcados se persisten unidos por coma en
 *     `AreaTipoMotivo.valor` / `AreaTipoMotivo.caso`.
 *   - MANUAL / ESCANEO → un segundo `Select` de selección única (nunca se
 *     combinan entre sí ni con CONSULTA).
 */
export default function FuenteSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecciona la fuente de datos",
  className,
}: FuenteSelectProps) {
  const modos = useMemo(() => getModos(), []);

  const tiposFuente = useMemo(() => {
    const vistos = new Set<string>();
    const out: string[] = [];
    for (const m of modos) {
      if (!vistos.has(m.tipo_fuente)) {
        vistos.add(m.tipo_fuente);
        out.push(m.tipo_fuente);
      }
    }
    return out;
  }, [modos]);

  const tipoFuenteActual = value?.tipo_fuente || "";

  const modosDelTipo = useMemo(
    () => modos.filter((m) => m.tipo_fuente === tipoFuenteActual),
    [modos, tipoFuenteActual],
  );

  const esTipoCombinable = tipoFuenteActual === TIPO_FUENTE_COMBINABLE;

  const casosSeleccionados = useMemo(
    () => new Set(splitFuenteMultiple(value?.caso ?? "")),
    [value?.caso],
  );

  /** Índice del modo actualmente elegido, para el `Select` de único origen. */
  const idxModoUnicoActual = useMemo(() => {
    if (esTipoCombinable) return -1;
    return modosDelTipo.findIndex(
      (m) =>
        normalizeCaso(m.caso) === normalizeCaso(value?.caso ?? "") &&
        normalizeValor(m.valor) === normalizeValor(value?.valor ?? ""),
    );
  }, [esTipoCombinable, modosDelTipo, value?.caso, value?.valor]);

  const handleTipoFuenteChange = (tipoFuente: string) => {
    const modosDelNuevoTipo = modos.filter((m) => m.tipo_fuente === tipoFuente);
    // Con 0 o 1 modo en el grupo no tiene sentido mostrar checkboxes: se
    // preselecciona directo para no obligar un segundo click.
    if (modosDelNuevoTipo.length <= 1) {
      const unico = modosDelNuevoTipo[0];
      onChange({
        tipo_fuente: tipoFuente,
        valor: normalizeValor(unico?.valor ?? ""),
        caso: normalizeCaso(unico?.caso ?? ""),
      });
      return;
    }
    onChange({ tipo_fuente: tipoFuente, valor: "", caso: "" });
  };

  const toggleModo = (modo: Modo, checked: boolean) => {
    const caso = normalizeCaso(modo.caso);
    const valor = normalizeValor(modo.valor);
    const casosActuales = splitFuenteMultiple(value?.caso ?? "");
    const valoresActuales = splitFuenteMultiple(value?.valor ?? "");

    const nextCasos = checked
      ? casosActuales.includes(caso)
        ? casosActuales
        : [...casosActuales, caso]
      : casosActuales.filter((c) => c !== caso);
    const nextValores = checked
      ? valoresActuales.includes(valor)
        ? valoresActuales
        : [...valoresActuales, valor]
      : valoresActuales.filter((v) => v !== valor);

    onChange({
      tipo_fuente: tipoFuenteActual,
      valor: nextValores.join(","),
      caso: nextCasos.join(","),
    });
  };

  if (modos.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No hay modos configurados. Define la variable de entorno{" "}
        <code className="font-mono">MODOS</code>.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Select
        value={tipoFuenteActual}
        onValueChange={handleTipoFuenteChange}
        disabled={disabled}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {tiposFuente.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {modosDelTipo.length > 1 && !esTipoCombinable && (
        <Select
          value={idxModoUnicoActual >= 0 ? String(idxModoUnicoActual) : ""}
          onValueChange={(idxStr) => {
            const modo = modosDelTipo[Number(idxStr)];
            if (!modo) return;
            onChange({
              tipo_fuente: tipoFuenteActual,
              valor: normalizeValor(modo.valor),
              caso: normalizeCaso(modo.caso),
            });
          }}
          disabled={disabled}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder="Selecciona el origen" />
          </SelectTrigger>
          <SelectContent>
            {modosDelTipo.map((m, idx) => {
              const caso = normalizeCaso(m.caso);
              return (
                <SelectItem key={idx} value={String(idx)}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{caso || m.tipo_fuente}</span>
                    {m.descripcion && (
                      <span className="text-xs text-muted-foreground whitespace-normal">
                        {m.descripcion}
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      {modosDelTipo.length > 1 && esTipoCombinable && (
        <div className="space-y-1 rounded-md border p-2">
          <p className="text-xs text-muted-foreground">
            Este proceso admite más de un origen: marca todos los que
            apliquen. Se consultarán por separado y se combinarán los
            resultados.
          </p>
          {modosDelTipo.map((m) => {
            const caso = normalizeCaso(m.caso);
            const valor = normalizeValor(m.valor);
            const inputId = `fuente-modo-${tipoFuenteActual}-${caso || valor}`;
            const checked = casosSeleccionados.has(caso);
            return (
              <label
                key={inputId}
                htmlFor={inputId}
                className="flex items-start gap-2 py-1 cursor-pointer"
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => toggleModo(m, v === true)}
                  className="mt-0.5"
                />
                <span className="flex flex-col gap-0.5 text-sm">
                  <span className="font-medium flex items-center gap-2">
                    {caso ? caso : m.tipo_fuente}
                    {valor && (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 h-4 text-[10px] font-mono leading-none text-primary">
                        valor: {valor}
                      </span>
                    )}
                  </span>
                  {m.descripcion && (
                    <span className="text-xs text-muted-foreground whitespace-normal">
                      {m.descripcion}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
