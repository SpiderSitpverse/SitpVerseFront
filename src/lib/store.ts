import { useSyncExternalStore } from "react";

/** Mini store observable: guarda el último dato traído del back y avisa a quien lo lee. */
export interface Store<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (callback: () => void) => () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const subscribers = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      value = next;
      subscribers.forEach((cb) => cb());
    },
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
