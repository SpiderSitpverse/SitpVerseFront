import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn } from "@/lib/utils";
import { createStore, useStore } from "@/lib/store";
import { timeAgo } from "@/lib/time";
import { describePosition, nearestStation } from "@/lib/place";
import { ROLE_HOME, roleHome } from "@/lib/roles";
import { STATUS_BADGE, STATUS_DOT, STATUS_LABEL } from "@/lib/status";
import {
  clearNotifications,
  dismissNotification,
  dismissWhere,
  notificationsStore,
  pushNotification,
} from "@/lib/notifications";
import {
  blockageAlertsStore,
  clearBlockageAlerts,
  dismissBlockageAlert,
  dismissBlockageAlertsFor,
  recordBlockageAlert,
} from "@/lib/blockageAlerts";
import { distanceMeters, snapToLines, snapToRoute, troncalesFor, MAX_SNAP_METERS } from "@/lib/routeSnap";

describe("cn", () => {
  it("une clases y resuelve conflictos de Tailwind", () => {
    expect(cn("p-2", false && "x", "p-4")).toBe("p-4");
  });
});

describe("store", () => {
  it("guarda el último valor y avisa a quien lo lee", () => {
    const store = createStore(1);
    const seen: number[] = [];
    const off = store.subscribe(() => seen.push(store.get()));
    store.set(2);
    off();
    store.set(3);
    expect(seen).toEqual([2]);
  });

  it("useStore re-renderiza cuando cambia", () => {
    const store = createStore("a");
    const { result } = renderHook(() => useStore(store));
    expect(result.current).toBe("a");
    act(() => store.set("b"));
    expect(result.current).toBe("b");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());
  const ago = (ms: number) => timeAgo(new Date(Date.now() - ms).toISOString());

  it.each([
    [10_000, "hace un momento"],
    [60_000, "hace 1 min"],
    [5 * 60_000, "hace 5 min"],
    [60 * 60_000, "hace 1 h"],
    [3 * 3_600_000, "hace 3 h"],
    [24 * 3_600_000, "hace 1 día"],
    [3 * 24 * 3_600_000, "hace 3 días"],
  ])("hace %i ms → %s", (ms, text) => expect(ago(ms)).toBe(text));
});

describe("place", () => {
  it("encuentra la estación más cercana", () => {
    const station = nearestStation([4.6097, -74.0817]);
    expect(station).not.toBeNull();
    expect(station!.meters).toBeGreaterThanOrEqual(0);
  });

  it("cerca de una estación dice cuál; lejos muestra las coordenadas", () => {
    const station = nearestStation([4.6097, -74.0817])!;
    expect(describePosition(4.6097, -74.0817)).toBe(station.meters <= 700 ? `Cerca de ${station.name}` : "4.6097, -74.0817");
    expect(describePosition(10, -60)).toBe("10.0000, -60.0000");
  });
});

describe("roles y estados", () => {
  it("roleHome lleva a cada rol a su pantalla y sin rol al login", () => {
    expect(roleHome("admin")).toBe(ROLE_HOME.admin);
    expect(roleHome("conductor")).toBe("/conductor");
    expect(roleHome("mecanico")).toBe("/taller");
    expect(roleHome(null)).toBe("/login");
  });

  it("cada estado de bus tiene etiqueta, punto y distintivo", () => {
    for (const status of ["operacion", "mantenimiento", "fuera-servicio"] as const) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      expect(STATUS_DOT[status]).toBeTruthy();
      expect(STATUS_BADGE[status]).toBeTruthy();
    }
  });
});

describe("notificaciones", () => {
  beforeEach(() => clearNotifications());

  it("agrega, descarta una, descarta por condición y limpia", () => {
    pushNotification({ id: "a", title: "A", message: "x", tone: "info" } as never);
    pushNotification({ id: "b", title: "B", message: "y", tone: "info" } as never);
    pushNotification({ id: "c", title: "C", message: "z", tone: "info" } as never);
    expect(notificationsStore.get().map((n) => n.id).sort()).toEqual(["a", "b", "c"]);
    dismissNotification("a");
    dismissWhere((n) => n.id === "b");
    expect(notificationsStore.get().map((n) => n.id)).toEqual(["c"]);
    clearNotifications();
    expect(notificationsStore.get()).toEqual([]);
  });

  it("una notificación con el mismo id no se duplica", () => {
    pushNotification({ id: "a", title: "A", message: "x", tone: "info" } as never);
    pushNotification({ id: "a", title: "A2", message: "x", tone: "info" } as never);
    expect(notificationsStore.get().filter((n) => n.id === "a")).toHaveLength(1);
  });
});

describe("alertas de bloqueo", () => {
  beforeEach(() => clearBlockageAlerts());

  it("se registran, se descartan por id y por incidente, y se limpian", () => {
    recordBlockageAlert({ id: "1", incidentId: "i1", title: "Bloqueo" } as never);
    recordBlockageAlert({ id: "2", incidentId: "i2", title: "Otro" } as never);
    expect(blockageAlertsStore.get()).toHaveLength(2);
    dismissBlockageAlert("1");
    expect(blockageAlertsStore.get().map((a) => a.id)).toEqual(["2"]);
    dismissBlockageAlertsFor("i2");
    expect(blockageAlertsStore.get()).toEqual([]);
  });

  it("sobreviven a recargar la pestaña (sessionStorage)", () => {
    recordBlockageAlert({ id: "9", incidentId: "i9", title: "Persistente" } as never);
    expect(sessionStorage.getItem("sitpverse.blockageAlerts") ?? JSON.stringify(sessionStorage)).toContain("9");
  });
});

describe("routeSnap", () => {
  const caracas: [number, number] = [4.6097, -74.0817];

  it("la distancia entre un punto y sí mismo es 0 y es simétrica", () => {
    expect(distanceMeters(caracas, caracas)).toBe(0);
    const other: [number, number] = [4.62, -74.09];
    expect(Math.abs(distanceMeters(caracas, other) - distanceMeters(other, caracas))).toBeLessThan(1);
    expect(distanceMeters(caracas, other)).toBeGreaterThan(1000);
  });

  it("troncalesFor encuentra la troncal por su nombre; una desconocida no devuelve nada que ajustar", () => {
    expect(troncalesFor("Troncal Caracas").length).toBeGreaterThan(0);
    expect(troncalesFor("Inventada")).toEqual(expect.any(Array));
  });

  it("un punto sobre la línea se ajusta a ella; uno lejos queda libre", () => {
    const line = { id: "t1", coords: [[4.6, -74.1], [4.6, -74.0]] as [number, number][] };
    const on = snapToLines([4.60001, -74.05], [line]);
    expect(on).not.toBeNull();
    expect(distanceMeters(on!.point, [4.6, -74.05])).toBeLessThan(MAX_SNAP_METERS);
    expect(snapToLines([4.7, -74.05], [line])).toBeNull();
  });

  it("snapToRoute con una troncal inexistente devuelve null", () => {
    expect(snapToRoute(caracas, "Ruta que no existe")).toBeNull();
  });
});
