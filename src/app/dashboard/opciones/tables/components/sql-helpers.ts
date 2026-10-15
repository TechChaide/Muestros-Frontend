/**
 * Helpers específicos del módulo "Diseño de tablas".
 *
 * NO se exportan desde `lib/` porque son utilities internas del wizard.
 * Si en el futuro otros módulos necesitan esto, promover a `lib/`.
 */

/**
 * Formatea una fecha JS a string compatible con SQL Server `datetime2`:
 *   YYYY-MM-DD HH:mm:ss.SSS
 *
 * Es el formato que el backend espera al recibir un payload con
 * `fecha_modificacion` para hacer UPDATE.
 */
export function formatDateForSQLServer(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Lee el `codigo_empleado` del usuario logueado desde `localStorage`.
 * El objeto `user` se guarda en el login (ver `use-auth.tsx` / login page).
 *
 * Retorna `null` si:
 *  - Estamos en SSR (no hay `window`)
 *  - No hay datos en localStorage
 *  - El objeto no tiene `codigo_empleado`
 *
 * El llamador es responsable de aplicar un fallback
 * (ej. `"admin"` o el código del sistema).
 */
export function getCodigoEmpleadoFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.codigo_empleado ?? null;
  } catch {
    return null;
  }
}