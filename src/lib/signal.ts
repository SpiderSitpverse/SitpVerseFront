/**
 * «Sin señal» (ESC-OBS-01): un bus en servicio que lleva más de 15 s sin enviar su posición.
 *
 * Se mide con el reloj de ESTE navegador: cuándo llegó aquí la última posición del bus. Así no depende de que el reloj
 * del computador del operador esté sincronizado con el del servidor. Para un bus del que aún no ha llegado ninguna
 * posición en vivo (recién cargada la página) se usa la hora de su última actualización en el servidor.
 */
export const NO_SIGNAL_MS = 15_000;

const seenAt = new Map<string, number>();

/** Llegó una posición en vivo de este bus. */
export function markPositionSeen(busId: string, at: number = Date.now()): void {
  seenAt.set(busId, at);
}

export function clearSignals(): void {
  seenAt.clear();
}

/** Hace cuántos milisegundos se supo por última vez de este bus. */
export function signalAgeMs(busId: string, serverUpdatedAt: string | undefined, now: number = Date.now()): number {
  const local = seenAt.get(busId);
  if (local !== undefined) return Math.max(0, now - local);
  const server = serverUpdatedAt ? Date.parse(serverUpdatedAt) : NaN;
  return Number.isFinite(server) ? Math.max(0, now - server) : 0;
}

export function isWithoutSignal(busId: string, serverUpdatedAt: string | undefined, now: number = Date.now()): boolean {
  return signalAgeMs(busId, serverUpdatedAt, now) > NO_SIGNAL_MS;
}

/** "hace 20 s", "hace 3 min". */
export function formatSignalAge(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return seconds < 90 ? `hace ${seconds} s` : `hace ${Math.round(seconds / 60)} min`;
}
