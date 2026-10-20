"use client";

/**
 * Mantiene viva la cookie/JWT de seguridades mientras el dashboard esté abierto.
 * Llama a POST /api/auths/refresh de forma periódica y al volver a la pestaña.
 * Si el backend aún no tiene /refresh, falla en silencio (no rompe la app).
 */

import { useEffect, useRef } from "react";
import { authService } from "@/services/seguridades/auth.service";

/** Cada 20 min (JWT por defecto 12h; margen amplio para sliding). */
const REFRESH_INTERVAL_MS = 20 * 60 * 1000;

export function SessionKeepAlive() {
  const refreshingRef = useRef(false);

  useEffect(() => {
    const refresh = async () => {
      if (refreshingRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      refreshingRef.current = true;
      try {
        await authService.refreshSession();
      } finally {
        refreshingRef.current = false;
      }
    };

    // Primera renovación al montar el dashboard (tras login o F5)
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
