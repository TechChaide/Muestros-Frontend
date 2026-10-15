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

export function getUsuarioSession(fallback = "admin"): string {
  if (typeof window === "undefined") return fallback;
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "{}")?.usuario || fallback
    );
  } catch {
    return fallback;
  }
}

export function extractList<T>(res: unknown): T[] {
  const respAny = res as Record<string, unknown>;
  const candidates =
    (respAny?.data as Record<string, unknown>)?.data ??
    respAny?.data ??
    respAny?.payload ??
    respAny?.body ??
    [];
  return Array.isArray(candidates) ? (candidates as T[]) : [];
}
