import { createStore } from "@/lib/store";

export interface Notification {
  id: string;
  title: string;
  body: string;
  detail?: string;
  /** Ruta a la que lleva el aviso al pulsarlo. */
  to?: string;
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

export function clearNotifications() {
  notificationsStore.set([]);
}
