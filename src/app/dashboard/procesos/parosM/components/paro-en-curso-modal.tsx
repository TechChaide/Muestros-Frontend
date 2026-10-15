"use client";

/**
 * Modal fullscreen que se muestra cuando el cronometro del paso 5 esta
 * corriendo. Estilo "We're Launching Soon" pero con FlipCards 3D que
 * hacen un flip cuando el digito cambia.
 *
 * Diseno:
 *   - Fondo del modal: blanco
 *   - Flip cards: azul (#0055b8) con numeros en blanco
 *   - Overlay detras: negro semitransparente + backdrop-blur-xl
 *
 * Bloqueos:
 *   - No se cierra con ESC / click fuera / interact outside (Radix).
 *   - El fondo con blur refuerza visualmente que no se debe tocar atras.
 *   - El bloqueo real contra refresh lo dispara step5 con beforeunload.
 *
 * Animacion del flip:
 *   Cada FlipCard mantiene en estado el digito ANTERIOR y el NUEVO.
 *   Cuando cambia, reproduce una animacion CSS de 0.6s con dos paneles
 *   (superior cae hacia adelante, inferior cae desde atras) que recrea
 *   el efecto clasico de un flip clock mecanico.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, StopCircle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ParoEnCursoModalProps {
  open: boolean;
  segundosTranscurridos: number;
  rutaResumen?: string;
  onDetener: () => void;
}

/**
 * Split del tiempo en HH:MM:SS ya con padding a 2 digitos.
 */
function splitHMS(s: number): { hh: string; mm: string; ss: string } {
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { hh: pad(hh), mm: pad(mm), ss: pad(ss) };
}

/* ============================================================================
 *  FlipCard - un solo digito con animacion 3D al cambiar
 *  ============================================================================
 *  Mantenemos el digito "anterior" en un ref. Cuando el digito "actual"
 *  cambia, animamos dos paneles:
 *    - .flip-card__top  : contiene el digito ANTERIOR, hace rotateX 0 -> -90deg
 *    - .flip-card__bottom: contiene el digito NUEVO,    rotateX 90deg -> 0deg
 *
 *  Asi se ve: el viejo cae hacia adelante, el nuevo aparece desde atras.
 *
 *  Persiste el `value` ANTERIOR con un ref + un useEffect que dispara la
 *  animacion y luego limpia el flag `flipping`. 600ms es la duracion de la
 *  animacion CSS.
 * ========================================================================== */

interface FlipCardProps {
  /** Digito actual (0-9). */
  value: string;
}

function FlipCard({ value }: FlipCardProps) {
  // Hidratacion: SSR-safe (no animamos en el primer render del cliente).
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Digito anterior: lo guardamos en un ref para comparar en cada render.
  const previousRef = React.useRef<string>(value);
  const [flipping, setFlipping] = React.useState(false);

  React.useEffect(() => {
    if (!mounted) return; // evita flip en el primer render
    if (previousRef.current === value) return; // no cambio -> no flip
    setFlipping(true);
    const t = window.setTimeout(() => {
      previousRef.current = value;
      setFlipping(false);
    }, 600); // debe coincidir con la duracion de .flip-anim
    return () => window.clearTimeout(t);
  }, [value, mounted]);

  const previous = previousRef.current;

  return (
    <div
      className={cn(
        // Contenedor: alto fijo, perspective para 3D
        "relative h-20 w-16 sm:h-24 sm:w-20",
        "rounded-md overflow-hidden",
        // Sombra sutil para dar profundidad
        "shadow-[0_4px_12px_rgba(0,85,184,0.35)]"
      )}
      style={{ perspective: "200px" }}
    >
      {/* Panel SUPERIOR (mitad de arriba): muestra el digito ANTERIOR.
          Animacion: rota de 0 a -90deg (cae hacia adelante). */}
      <div
        className={cn(
          "flip-card__top",
          flipping && "flip-card__top--flipping"
        )}
      >
        <span className="flip-card__num">{flipping ? previous : value}</span>
      </div>

      {/* Panel INFERIOR (mitad de abajo): muestra el digito NUEVO.
          Animacion: rota de 90deg a 0 (aparece desde atras). */}
      <div
        className={cn(
          "flip-card__bottom",
          flipping && "flip-card__bottom--flipping"
        )}
      >
        <span className="flip-card__num">{value}</span>
      </div>

      {/* Linea de division central (la "bisagra" del flip clock). */}
      <div className="flip-card__divider" />
    </div>
  );
}

/**
 * Componente FlipClock: agrupa varios FlipCard con sus labels.
 * Layout: [card] : [card] : [card] con label debajo.
 */
function FlipClock({ hh, mm, ss }: { hh: string; mm: string; ss: string }) {
  return (
    <div className="flex items-start gap-1 sm:gap-1">
      <FlipClockGroup label="hh" value={hh} />
      <FlipSeparator />
      <FlipClockGroup label="mm" value={mm} />
      <FlipSeparator />
      <FlipClockGroup label="ss" value={ss} />
    </div>
  );
}

function FlipClockGroup({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1 sm:gap-1">
        <FlipCard value={value[0]} />
        <FlipCard value={value[1]} />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 sm:text-xs">
        {label}
      </span>
    </div>
  );
}

/**
 * Separador ":" entre los grupos (HH : MM : SS).
 * Sin animacion: solo decorativo.
 */
function FlipSeparator() {
  return (
    <div className="flex h-20 sm:h-24 items-center pb-5 sm:pb-6">
      <span className="text-4xl font-light text-slate-400 sm:text-5xl">:</span>
    </div>
  );
}

export function ParoEnCursoModal({
  open,
  segundosTranscurridos,
  rutaResumen,
  onDetener,
}: ParoEnCursoModalProps) {
  const { hh, mm, ss } = splitHMS(segundosTranscurridos);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        // No-op intencional: el modal NO se cierra al cambiar `open`.
        // Solo el boton "Detener Paro" puede cerrarlo.
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="backdrop-blur-lg bg-black/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="border-0 bg-transparent p-0 shadow-none sm:max-w-2xl"
      >

        {/* Accesibilidad: Radix exige DialogTitle para lectores de pantalla.
            Como el modal es casi 100% visual (flip clock), el titulo va
            oculto con sr-only para no romper el diseno. */}
        <DialogTitle className="sr-only">Paro en curso</DialogTitle>
        <DialogDescription className="sr-only">
          Cronometro contando el tiempo transcurrido del paro en curso. Use
          el boton rojo Detener Paro para finalizarlo.
        </DialogDescription>

        <TooltipProvider>
          <Tooltip>
            {/* asChild permite que TooltipTrigger pase sus props directamente al Button */}
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={onDetener}
                variant="destructive"
                size="lg"
                className="absolute -top-1 -right-12 z-50 flex items-center justify-center w-12 h-12 flex-shrink-0 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors"
              >
                <StopCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>

            {/* El contenido que se mostrará al hacer hover */}
            <TooltipContent side="top" sideOffset={5}>
              <p>Detener Paro</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>


        <div className="flex flex-col items-center gap-6 p-8 sm:gap-8 sm:p-10">

          {/* FlipClock con HH : MM : SS */}
          <FlipClock hh={hh} mm={mm} ss={ss} />

        </div>
      </DialogContent>
    </Dialog>
  );
}