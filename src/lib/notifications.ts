import { createStore } from "@/lib/store";

export interface Notification {
  id: string;
  title: string;
  body: string;
  detail?: string;
  /** Ruta a la que lleva el aviso al pulsarlo. */
  to?: string;
  /** Alerta de la que habla el aviso: si otro la toma o termina, el aviso se quita solo. */
  callId?: string;
  /** Incidente del que habla el aviso: si el admin lo elimina, el aviso se quita solo. */
  incidentId?: string;
}

/** Avisos emergentes pendientes de mostrar (los pinta `NotificationToasts`). */
export const notificationsStore = createStore<Notification[]>([]);

const MAX_VISIBLE = 4;

export function pushNotification(notification: Notification) {
  const current = notificationsStore.get();
  if (current.some((n) => n.id === notification.id)) return;
  notificationsStore.set([notification, ...current].slice(0, MAX_VISIBLE));
}

export function dismissNotification(id: string) {
  notificationsStore.set(notificationsStore.get().filter((n) => n.id !== id));
}

/** Quita los avisos que cumplan la condición (p. ej. los de una alerta que ya se llenó). */
export function dismissWhere(predicate: (notification: Notification) => boolean) {
  const current = notificationsStore.get();
  const next = current.filter((n) => !predicate(n));
  if (next.length !== current.length) notificationsStore.set(next);
}

export function clearNotifications() {
  notificationsStore.set([]);
}
