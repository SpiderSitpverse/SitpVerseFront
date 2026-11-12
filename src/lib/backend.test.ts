import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: vi.fn() };
});

let handlers: { onPosition: (e: unknown) => void; onAssistance: (e: unknown) => void; onUnauthorized: () => void } | null = null;
const disconnect = vi.fn();
vi.mock("@/lib/realtime", () => ({
  connectRealtime: vi.fn((_token: string, h: typeof handlers) => {
    handlers = h;
    return disconnect;
  }),
}));

import { ApiError, api } from "@/lib/api";
import {
  assignedRoutesStore,
  assistanceSummaryStore,
  blockagesStore,
  busesStore,
  callsStore,
  fleetSummaryStore,
  homeStore,
  incidentsStore,
  inspectionsStore,
  loadLatestInspection,
  refreshAll,
  repairReportsStore,
  startSync,
  staffStore,
  stopSync,
} from "@/lib/backend";
import { blockageAlertsStore } from "@/lib/blockageAlerts";
import { notificationsStore } from "@/lib/notifications";

const apiMock = vi.mocked(api);
const NOW = new Date("2026-11-11T12:00:00.000Z");

const bus = (over: Record<string, unknown> = {}) => ({
  id: "b1", plate: "TMX-001", route: "Troncal Caracas", status: "IDLE", latitude: 4.6, longitude: -74.1,
  locationLabel: null, model: null, year: null, operator: null, capacity: null, driverId: "d1", driver: "Carlos",
  tripStartedAt: null, photoUrl: null, updatedAt: NOW.toISOString(), ...over,
});

/** Respuestas del back por ruta (lo que no está listado devuelve una lista vacía). */
function serve(routes: Record<string, unknown> = {}) {
  apiMock.mockImplementation(async (path: string) => {
    if (path in routes) {
      const value = routes[path];
      if (value instanceof Error) throw value;
      return value as never;
    }
    return [] as never;
  });
}

const flush = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  apiMock.mockReset();
  disconnect.mockReset();
  handlers = null;
});
afterEach(() => {
  stopSync();
  vi.useRealTimers();
});

const event = (type: string, payload: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  eventId: `${type}-${Math.random()}`, seq: 1, type, occurredAt: NOW.toISOString(), payload, ...over,
});

describe("startSync según el rol", () => {
  it("ADMIN carga flota, alertas, informes, resúmenes, incidentes, bloqueos y personal", async () => {
    serve({
      "/fleet/buses": [bus()],
      "/fleet/summary": { total: 1, inService: 0, idle: 1, finished: 0 },
      "/assistance/summary": { incidentsLast24h: 2, repairsInProgress: 1 },
      "/users": [{ id: "u1", employeeId: "1001", name: "Kevin", role: "ADMIN" }],
    });
    startSync("ADMIN", "jwt", vi.fn(), "u1");
    await flush();
    expect(busesStore.get()).toHaveLength(1);
    expect(fleetSummaryStore.get()).toMatchObject({ total: 1 });
    expect(assistanceSummaryStore.get()).toMatchObject({ incidentsLast24h: 2 });
    expect(staffStore.get()).toHaveLength(1);
    const paths = apiMock.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(["/assistance/calls", "/assistance/repair-reports", "/assistance/incidents", "/assistance/blockages"]));
  });

  it("MECHANICAL solo carga lo suyo", async () => {
    serve();
    startSync("MECHANICAL", "jwt", vi.fn(), "m1");
    await flush();
    const paths = apiMock.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(["/fleet/buses", "/assistance/calls", "/assistance/repair-reports"]));
    expect(paths).not.toContain("/users");
  });

  it("DRIVER carga su inicio y sus rutas; sin bus asignado (404) el inicio queda vacío", async () => {
    serve({ "/fleet/home/operativo": new ApiError(404, "sin bus"), "/assistance/routes/assigned/me": [{ id: "r1" }] });
    startSync("DRIVER", "jwt", vi.fn(), "d1");
    await flush();
    expect(homeStore.get()).toBeNull();
    expect(assignedRoutesStore.get()).toEqual([{ id: "r1" }]);
  });

  it("DRIVER con bus: guarda su inicio; un fallo distinto no tumba al resto", async () => {
    serve({ "/fleet/home/operativo": { busId: "b1", plate: "TMX-001", route: "Caracas" }, "/assistance/routes/assigned/me": new ApiError(500, "boom") });
    startSync("DRIVER", "jwt", vi.fn(), "d1");
    await flush();
    expect(homeStore.get()).toMatchObject({ busId: "b1" });
    expect(assignedRoutesStore.get()).toEqual([]);
  });

  it("refresca cada 20 s mientras la pestaña está visible", async () => {
    serve();
    startSync("MECHANICAL", "jwt", vi.fn());
    await flush();
    const before = apiMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(apiMock.mock.calls.length).toBeGreaterThan(before);
  });

  it("stopSync vacía la caché, desconecta y apaga el refresco", async () => {
    serve({ "/fleet/buses": [bus()] });
    startSync("MECHANICAL", "jwt", vi.fn());
    await flush();
    stopSync();
    expect(disconnect).toHaveBeenCalled();
    expect(busesStore.get()).toEqual([]);
    expect(callsStore.get()).toEqual([]);
    expect(incidentsStore.get()).toEqual([]);
    expect(repairReportsStore.get()).toEqual([]);
    expect(blockagesStore.get()).toEqual([]);
    expect(inspectionsStore.get()).toEqual({});
    apiMock.mockClear();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("refreshAll no falla aunque un pedido falle", async () => {
    serve({ "/fleet/buses": new ApiError(500, "x") });
    startSync("MECHANICAL", "jwt", vi.fn());
    await expect(refreshAll()).resolves.toBeUndefined();
  });

  it("un 401 del WebSocket cierra la sesión", async () => {
    serve();
    const onUnauthorized = vi.fn();
    startSync("ADMIN", "jwt", onUnauthorized);
    handlers!.onUnauthorized();
    expect(onUnauthorized).toHaveBeenCalled();
  });
});

describe("posiciones en vivo", () => {
  it("actualiza la posición del bus sin pedir nada si el estado no cambió", async () => {
    serve({ "/fleet/buses": [bus({ status: "IN_SERVICE" })] });
    startSync("ADMIN", "jwt", vi.fn());
    await flush();
    apiMock.mockClear();
    handlers!.onPosition({ busId: "b1", status: "IN_SERVICE", latitude: 4.7, longitude: -74.2, updatedAt: "x" });
    expect(busesStore.get()[0]).toMatchObject({ latitude: 4.7, longitude: -74.2 });
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("si cambia el estado (inició o terminó el viaje) vuelve a pedir la flota", async () => {
    serve({ "/fleet/buses": [bus()] });
    startSync("ADMIN", "jwt", vi.fn());
    await flush();
    apiMock.mockClear();
    handlers!.onPosition({ busId: "b1", status: "IN_SERVICE", latitude: 4.7, longitude: -74.2, updatedAt: "x" });
    expect(apiMock).toHaveBeenCalledWith("/fleet/buses");
  });

  it("un bus desconocido provoca recargar la flota; el conductor ignora las posiciones", async () => {
    serve({ "/fleet/buses": [bus()] });
    startSync("ADMIN", "jwt", vi.fn());
    await flush();
    apiMock.mockClear();
    handlers!.onPosition({ busId: "nuevo", status: "IDLE", latitude: 1, longitude: 1, updatedAt: "x" });
    expect(apiMock).toHaveBeenCalledWith("/fleet/buses");

    startSync("DRIVER", "jwt", vi.fn(), "d1");
    await flush();
    apiMock.mockClear();
    handlers!.onPosition({ busId: "nuevo", status: "IDLE", latitude: 1, longitude: 1, updatedAt: "x" });
    expect(apiMock).not.toHaveBeenCalled();
  });
});

describe("avisos emergentes por rol", () => {
  const titles = () => notificationsStore.get().map((n) => n.title);

  async function sync(role: "ADMIN" | "DRIVER" | "MECHANICAL", userId = "me") {
    serve({ "/fleet/buses": [bus()] });
    startSync(role, "jwt", vi.fn(), userId);
    await flush();
  }

  it("ADMIN: reporte de un conductor → aviso con el nombre, la placa y el motivo", async () => {
    await sync("ADMIN");
    handlers!.onAssistance(event("incident.reported", { busId: "b1", type: "Llanta", description: "Pinchada", incidentId: "i1", reportedBy: { name: "Carlos" } }));
    expect(titles()).toEqual(["Nuevo reporte de conductor"]);
    expect(notificationsStore.get()[0]).toMatchObject({ body: "Carlos · TMX-001: Llanta", incidentId: "i1", to: "/incidentes" });
  });

  it("ADMIN: ruta aceptada", async () => {
    await sync("ADMIN");
    handlers!.onAssistance(event("route.accepted", {}));
    expect(titles()).toEqual(["Ruta alternativa aceptada"]);
  });

  it("DRIVER: bloqueo en la vía → aviso y se recuerda aunque el evento sea viejo", async () => {
    await sync("DRIVER");
    handlers!.onAssistance(event("blockage.alerted", { busId: "b1", incidentId: "i1", type: "Manifestación" }));
    expect(titles()).toEqual(["Bloqueo en la vía"]);
    expect(blockageAlertsStore.get()).toHaveLength(1);

    handlers!.onAssistance(event("blockage.alerted", { busId: "b1", incidentId: "i2" }, { occurredAt: "2026-11-11T10:00:00.000Z" }));
    expect(blockageAlertsStore.get()).toHaveLength(2); // recordada
    expect(titles()).toHaveLength(1); // pero sin aviso emergente (ya es viejo)
  });

  it("DRIVER: ruta asignada", async () => {
    await sync("DRIVER");
    handlers!.onAssistance(event("route.assigned", {}));
    expect(titles()).toEqual(["Te asignaron una ruta alternativa"]);
  });

  it("DRIVER: alerta de apoyo con cupos y puntos; la del propio reporte no se avisa", async () => {
    await sync("DRIVER");
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c1", description: "Sin frenos", slots: 3, rewardPoints: 50, reportedById: "otro" }));
    expect(notificationsStore.get()[0]).toMatchObject({ title: "Un compañero necesita apoyo", detail: "3 cupos disponibles · 50 puntos", to: "/conductor/ayuda" });
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c2", reportedById: "me" }));
    expect(notificationsStore.get()).toHaveLength(1);
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c3", resent: true, remainingSlots: 1 }));
    expect(notificationsStore.get()[0]).toMatchObject({ title: "Alerta de apoyo reenviada", detail: "1 cupo disponible" });
  });

  it("MECHANICAL: solicitud de reparación nueva y reenviada", async () => {
    await sync("MECHANICAL");
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c1", kind: "REPAIR" }));
    expect(titles()).toEqual(["Nueva solicitud de reparación"]);
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c2", resent: true }));
    expect(titles()[0]).toBe("Solicitud de reparación reenviada");
  });

  it("'se quita': una alerta cerrada o completada quita sus avisos; un incidente eliminado o resuelto, también", async () => {
    await sync("DRIVER");
    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c1", incidentId: "i1" }));
    expect(notificationsStore.get()).toHaveLength(1);
    handlers!.onAssistance(event("call.closed", { callId: "c1" }));
    expect(notificationsStore.get()).toHaveLength(0);

    handlers!.onAssistance(event("call.opened", { busId: "b1", callId: "c2", incidentId: "i2" }));
    handlers!.onAssistance(event("incident.deleted", { incidentId: "i2" }));
    expect(notificationsStore.get()).toHaveLength(0);

    handlers!.onAssistance(event("blockage.alerted", { busId: "b1", incidentId: "i3" }));
    handlers!.onAssistance(event("incident.resolved", { incidentId: "i3" }));
    expect(blockageAlertsStore.get().some((a) => a.incidentId === "i3")).toBe(false);
  });

  it("avisos personales: ayuda cancelada, aceptación cancelada y atención confirmada", async () => {
    await sync("DRIVER", "me");
    handlers!.onAssistance(event("incident.deleted", { incidentId: "i9", affectedUserIds: ["me"] }));
    handlers!.onAssistance(event("claim.cancelled", { userId: "me" }));
    handlers!.onAssistance(event("call.completed", { callId: "c1", awardedUserIds: ["me"], rewardPoints: 50 }));
    expect(titles()).toEqual(expect.arrayContaining(["Ayuda cancelada", "Aceptación cancelada", "Atención confirmada"]));
    expect(notificationsStore.get().find((n) => n.title === "Atención confirmada")!.body).toBe("Ganaste 50 puntos por ayudar.");

    handlers!.onAssistance(event("incident.deleted", { incidentId: "i10", affectedUserIds: ["otro"] }));
    expect(notificationsStore.get().filter((n) => n.title === "Ayuda cancelada")).toHaveLength(1); // no era para mí
  });

  it("eventos viejos (reenviados al reconectar) no generan aviso", async () => {
    await sync("ADMIN");
    handlers!.onAssistance(event("incident.reported", { busId: "b1" }, { occurredAt: "2026-11-11T11:00:00.000Z" }));
    expect(notificationsStore.get()).toHaveLength(0);
  });

  it("cada evento refresca las alertas (y, según el rol, incidentes, bloqueos y rutas)", async () => {
    await sync("ADMIN");
    apiMock.mockClear();
    handlers!.onAssistance(event("call.opened", { busId: "b1" }));
    await flush();
    const adminPaths = apiMock.mock.calls.map((c) => c[0]);
    expect(adminPaths).toEqual(expect.arrayContaining(["/assistance/calls", "/fleet/buses", "/assistance/incidents", "/assistance/blockages", "/assistance/summary", "/assistance/repair-reports"]));

    startSync("DRIVER", "jwt", vi.fn(), "d1");
    await flush();
    apiMock.mockClear();
    handlers!.onAssistance(event("call.opened", { busId: "b1" }));
    await flush();
    expect(apiMock.mock.calls.map((c) => c[0])).toContain("/assistance/routes/assigned/me");
  });
});

describe("loadLatestInspection", () => {
  it("guarda la última inspección del bus", async () => {
    serve({ "/inspections/buses/b1/latest": { inspectorName: "Carlos", inspectorRole: "DRIVER", createdAt: NOW.toISOString(), note: "Todo bien", comment: "", photos: [] } });
    await loadLatestInspection("b1");
    expect(inspectionsStore.get().b1).toMatchObject({ nombre: "Carlos", comentario: "Todo bien" });
  });

  it("404 = nunca inspeccionado (null); otro error se propaga", async () => {
    serve({ "/inspections/buses/b2/latest": new ApiError(404, "nada"), "/inspections/buses/b3/latest": new ApiError(500, "boom") });
    await loadLatestInspection("b2");
    expect(inspectionsStore.get().b2).toBeNull();
    await expect(loadLatestInspection("b3")).rejects.toMatchObject({ status: 500 });
  });
});
