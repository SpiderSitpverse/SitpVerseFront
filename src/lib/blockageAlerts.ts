import { createStore } from "@/lib/store";
import type { BlockageAlert } from "@/types/routing";

/**
 * Avisos de bloqueo que recibió el conductor (`blockage.alerted`).
 *
 * El back NO los guarda: llegan una sola vez por WebSocket. Por eso se recuerdan aquí (y en
 * sessionStorage, para que sobrevivan a recargar la pestaña) hasta que el conductor los descarte.
 */
const KEY = "sitpverse.blockageAlerts";
const MAX_ALERTS = 20;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

function isAlert(value: unknown): value is BlockageAlert {
  const v = value as Partial<BlockageAlert> | null;
  return Boolean(v) && typeof v?.id === "string" && typeof v?.incidentId === "string" && typeof v?.recibidaEn === "string";
}

function load(): BlockageAlert[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(isAlert).filter((a) => now - new Date(a.recibidaEn).getTime() < MAX_AGE_MS);
  } catch {
    return [];
  }
}

function save(alerts: BlockageAlert[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(alerts));
  } catch {
    // sin sessionStorage: el aviso vive solo mientras la pestaña no se recargue
  }
}

export const blockageAlertsStore = createStore<BlockageAlert[]>(load());

export function recordBlockageAlert(alert: BlockageAlert) {
  const current = blockageAlertsStore.get();
  if (current.some((a) => a.id === alert.id)) return;
  const next = [alert, ...current].slice(0, MAX_ALERTS);
  blockageAlertsStore.set(next);
  save(next);
}

export function dismissBlockageAlert(id: string) {
  const next = blockageAlertsStore.get().filter((a) => a.id !== id);
  blockageAlertsStore.set(next);
  save(next);
}

export function clearBlockageAlerts() {
  blockageAlertsStore.set([]);
  save([]);
}
