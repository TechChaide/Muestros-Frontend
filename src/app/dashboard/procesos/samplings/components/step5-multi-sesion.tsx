"use client";

/**
 * Varias sesiones de captura en paralelo (opción pestañas).
 * Cada sesión mantiene montado su propio Step5 para no perder
 * cronómetro, muestras ni orden al cambiar de pestaña.
 * Solo la sesión activa muestra los botones flotantes.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
} from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Step5CapturarMuestreo, {
  type CapturaData,
  type CronometroEstado,
} from "./step5-capturar-muestreo";

type SesionTab = {
  id: string;
  numero: number;
  estado: CronometroEstado;
  /** Fuerza remount limpio tras guardar. */
  instanceKey: number;
};

type Step5Props = ComponentProps<typeof Step5CapturarMuestreo>;

type Step5MultiSesionProps = Omit<
  Step5Props,
  "isActive" | "sessionLabel" | "onCronometroChange" | "onGuardadoExitoso"
> & {
  onChange?: (data: CapturaData) => void;
};

const ESTADO_DOT: Record<CronometroEstado, string> = {
  idle: "bg-muted-foreground/40",
  running: "bg-green-500 animate-pulse",
  paused: "bg-amber-500",
  stopped: "bg-red-500",
};

const ESTADO_LABEL: Record<CronometroEstado, string> = {
  idle: "Listo",
  running: "En curso",
  paused: "En pausa",
  stopped: "Listo p/ guardar",
};

function crearSesion(numero: number): SesionTab {
  return {
    id: `sesion-${numero}`,
    numero,
    estado: "idle",
    instanceKey: 0,
  };
}

export default function Step5MultiSesion(props: Step5MultiSesionProps) {
  const { onChange, ...stepProps } = props;
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [sesiones, setSesiones] = useState<SesionTab[]>(() => [crearSesion(1)]);
  const [activaId, setActivaId] = useState("sesion-1");
  const [siguienteNumero, setSiguienteNumero] = useState(2);

  useEffect(() => {
    setMounted(true);
  }, []);

  const agregarSesion = useCallback(() => {
    if (!mounted) return;
    const numero = siguienteNumero;
    const nueva = crearSesion(numero);
    setSiguienteNumero((n) => n + 1);
    setSesiones((prev) => [...prev, nueva]);
    setActivaId(nueva.id);
  }, [mounted, siguienteNumero]);

  const cerrarSesion = useCallback(
    (id: string) => {
      const sesion = sesiones.find((s) => s.id === id);
      if (!sesion || sesiones.length <= 1) return;
      if (sesion.estado === "running" || sesion.estado === "paused") {
        toast({
          title: "Detén o reinicia el muestreo",
          description:
            "No se puede cerrar una sesión en curso. Detén el cronómetro o reinícialo antes de cerrarla.",
          variant: "destructive",
        });
        return;
      }
      const next = sesiones.filter((s) => s.id !== id);
      setSesiones(next);
      if (activaId === id) {
        setActivaId(next[next.length - 1]?.id ?? next[0].id);
      }
    },
    [activaId, sesiones, toast],
  );

  const setEstadoSesion = useCallback((id: string, estado: CronometroEstado) => {
    setSesiones((prev) => {
      const actual = prev.find((s) => s.id === id);
      if (!actual || actual.estado === estado) return prev;
      return prev.map((s) => (s.id === id ? { ...s, estado } : s));
    });
  }, []);

  const alGuardarSesion = useCallback(
    (id: string) => {
      setSesiones((prev) => {
        if (prev.length <= 1) {
          return prev.map((s) =>
            s.id === id
              ? { ...s, estado: "idle", instanceKey: s.instanceKey + 1 }
              : s,
          );
        }
        const next = prev.filter((s) => s.id !== id);
        if (activaId === id) {
          setActivaId(next[0]?.id ?? "sesion-1");
        }
        return next;
      });
    },
    [activaId],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Carril de sesiones — scroll horizontal en móvil */}
      <div className="sticky top-0 z-30 -mx-1 border-b bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-2">
          <div
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Sesiones de muestreo"
          >
            {sesiones.map((sesion) => {
              const activa = sesion.id === activaId;
              const sePuedeCerrar =
                sesiones.length > 1 &&
                sesion.estado !== "running" &&
                sesion.estado !== "paused";
              return (
                <div
                  key={sesion.id}
                  role="tab"
                  aria-selected={activa}
                  tabIndex={activa ? 0 : -1}
                  onClick={() => setActivaId(sesion.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActivaId(sesion.id);
                    }
                  }}
                  className={cn(
                    "group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                    "min-h-11 touch-manipulation select-none",
                    activa
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      activa ? "bg-primary-foreground/90" : ESTADO_DOT[sesion.estado],
                    )}
                    aria-hidden
                  />
                  <span className="font-medium whitespace-nowrap">
                    Muestreo {sesion.numero}
                  </span>
                  <Badge
                    variant={activa ? "secondary" : "outline"}
                    className={cn(
                      "hidden h-5 px-1.5 text-[10px] font-normal sm:inline-flex",
                      activa && "bg-primary-foreground/20 text-primary-foreground border-0",
                    )}
                  >
                    {ESTADO_LABEL[sesion.estado]}
                  </Badge>
                  {sePuedeCerrar && (
                    <button
                      type="button"
                      className={cn(
                        "ml-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                        activa
                          ? "hover:bg-primary-foreground/20"
                          : "hover:bg-background",
                      )}
                      aria-label={`Cerrar muestreo ${sesion.numero}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        cerrarSesion(sesion.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-11 shrink-0 gap-1.5 px-3 touch-manipulation"
            onClick={agregarSesion}
            disabled={!mounted}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Nuevo</span>
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground sm:text-xs">
          Puedes pausar un muestreo, abrir otro y retomarlo después. En el celular
          desliza las pestañas hacia los lados.
        </p>
      </div>

      {sesiones.map((sesion) => {
        const activa = sesion.id === activaId;
        return (
          <div
            key={`${sesion.id}-${sesion.instanceKey}`}
            className={cn(!activa && "hidden")}
            aria-hidden={!activa}
          >
            <Step5CapturarMuestreo
              {...stepProps}
              isActive={activa}
              sessionLabel={`Muestreo ${sesion.numero}`}
              onCronometroChange={(estado) => setEstadoSesion(sesion.id, estado)}
              onGuardadoExitoso={() => alGuardarSesion(sesion.id)}
              onChange={activa ? onChange : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
