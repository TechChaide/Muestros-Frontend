/**
 * Utilidades para leer el código de persona del usuario logueado desde
 * `localStorage` (clave "user") en el flujo de Paros
 * (`/dashboard/procesos/paros`).
 *
 * Centralizamos aquí la lectura del `codigo_empleado` / `id_usuario`
 * para:
 *   1. Tener una sola fuente de verdad sobre qué campo leer.
 *   2. Ser defensivos ante JSON corrupto o `localStorage` bloqueado.
 *
 * NOTA: el `DEPARTAMENTO` del usuario NO se lee del `localStorage`
 * (puede estar desactualizado). Se consulta AUTORITATIVAMENTE al
 * backend mediante el endpoint `getInfUsrByCodigoEmpleado`
 * (equivalente a `loginColaborador`).
 */

/**
 * Lee el objeto `user` desde `localStorage`. Devuelve `null` si no existe
 * o si el JSON está corrupto.
 */
function readUserFromStorage(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Devuelve el `codigo_empleado` del usuario logueado desde `localStorage`.
 * Si el usuario es "Usuario Externo", devuelve su `id_usuario` en su lugar
 * (es lo que el backend espera como "CodigoPersona" en este caso).
 */
export function getCodigoPersonaFromStorage(): string {
  const user = readUserFromStorage();
  if (!user) return "";
  if (user.condicion === "Usuario Externo") {
    return (user.id_usuario as string) ?? "";
  }
  return (user.codigo_empleado as string) ?? "";
}

export { formatDateForSQLServer } from "@/lib/datetime2";
