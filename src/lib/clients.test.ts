import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: vi.fn() };
});
vi.mock("@/lib/backend", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/backend")>();
  return { ...original, refreshAll: vi.fn(async () => undefined) };
});

import { API_URL, ApiError, api } from "@/lib/api";
import { busesStore, callsStore, incidentsStore, refreshAll } from "@/lib/backend";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { notificationsStore, pushNotification } from "@/lib/notifications";
import { routingClient } from "@/lib/routingClient";
import { repairClient } from "@/lib/repairClient";

const apiMock = vi.mocked(api);
const refreshMock = vi.mocked(refreshAll);

beforeEach(() => {
  apiMock.mockReset();
  apiMock.mockResolvedValue(undefined as never);
  refreshMock.mockClear();
  busesStore.set([]);
  callsStore.set([]);
  incidentsStore.set([]);
  notificationsStore.set([]);
});

describe("fleetActivityClient: viajes y alertas", () => {
  it.each([
    ["startTrip", () => fleetActivityClient.startTrip("b1"), "/fleet/buses/b1/start-trip", "PATCH"],
    ["endTrip", () => fleetActivityClient.endTrip("b1"), "/fleet/buses/b1/finish-trip", "PATCH"],
    ["launchSupportCall", () => fleetActivityClient.launchSupportCall("i1", 3, 50), "/assistance/incidents/i1/support-call", "POST"],
    ["deleteIncident", () => fleetActivityClient.deleteIncident("i1"), "/assistance/incidents/i1", "DELETE"],
    ["confirmHelpReceived", () => fleetActivityClient.confirmHelpReceived("c1"), "/assistance/calls/c1/complete", "POST"],
    ["setBusPhoto", () => fleetActivityClient.setBusPhoto("b1", "/uploads/a.jpg"), "/fleet/buses/b1", "PATCH"],
    ["requestRepair", () => fleetActivityClient.requestRepair("b1", "Frenos", "i1"), "/assistance/bus-faults", "POST"],
  ])("%s pega a la ruta correcta y refresca la caché", async (_name, run, path, method) => {
    await run();
    expect(apiMock).toHaveBeenCalledWith(path, expect.objectContaining({ method }));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("sendPosition manda las coordenadas y NO refresca (es el camino caliente)", async () => {
    await fleetActivityClient.sendPosition("b1", 4.6, -74.1);
    expect(apiMock).toHaveBeenCalledWith("/fleet/buses/b1/position", { method: "PATCH", body: { latitude: 4.6, longitude: -74.1 } });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("deleteIncident con force agrega ?force=true", async () => {
    await fleetActivityClient.deleteIncident("i1", true);
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents/i1?force=true", { method: "DELETE" });
  });

  it("requestRepair sin descripción manda undefined, y con incidente lo liga", async () => {
    await fleetActivityClient.requestRepair("b1", "");
    expect(apiMock).toHaveBeenCalledWith("/assistance/bus-faults", { method: "POST", body: { busId: "b1", incidentId: undefined, description: undefined } });
  });

  it("reportIncident crea el incidente y adjunta las fotos con URL relativa; cuenta las que fallan", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/assistance/incidents") return { id: "i9" } as never;
      if (String(path).includes("evidence") && (apiMock.mock.calls.length === 3)) throw new ApiError(400, "mala");
      return undefined as never;
    });
    const result = await fleetActivityClient.reportIncident("b1", "Llanta", "pinchada", [`${API_URL}/uploads/a.jpg`, `${API_URL}/uploads/b.jpg`]);
    expect(result).toEqual({ failedPhotos: 1 });
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents", { method: "POST", body: { busId: "b1", type: "Llanta", description: "pinchada" } });
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents/i9/evidence", { method: "POST", body: { url: "/uploads/a.jpg" } });
  });

  it("reportIncident sin fotos ni descripción", async () => {
    apiMock.mockResolvedValueOnce({ id: "i1" } as never);
    expect(await fleetActivityClient.reportIncident("b1", "Otro", "")).toEqual({ failedPhotos: 0 });
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents", { method: "POST", body: { busId: "b1", type: "Otro", description: undefined } });
  });

  it("acceptHelpRequest acepta, quita su aviso emergente y refresca solo las alertas", async () => {
    pushNotification({ id: "n1", title: "t", body: "b", callId: "c1" });
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/assistance/calls") return [{ id: "c1" }] as never;
      if (path === "/fleet/buses") return [{ id: "b1" }] as never;
      return [] as never;
    });
    await fleetActivityClient.acceptHelpRequest("c1");
    expect(apiMock).toHaveBeenCalledWith("/assistance/calls/c1/accept", { method: "POST" });
    expect(notificationsStore.get()).toEqual([]);
    expect(callsStore.get()).toEqual([{ id: "c1" }]);
    expect(busesStore.get()).toEqual([{ id: "b1" }]);
  });

  it("al aceptar, si el admin ya tenía incidentes cargados también los refresca; un fallo suelto no tumba al resto", async () => {
    incidentsStore.set([{ id: "i1" }] as never);
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/assistance/incidents") return [{ id: "i1", status: "HELP_REQUESTED" }] as never;
      if (path === "/assistance/calls") throw new ApiError(500, "boom");
      return [] as never;
    });
    await fleetActivityClient.acceptHelpRequest("c1");
    expect(incidentsStore.get()).toEqual([{ id: "i1", status: "HELP_REQUESTED" }]);
    expect(callsStore.get()).toEqual([]);
  });

  it("un 409 al aceptar (cupos llenos) se propaga a la pantalla", async () => {
    apiMock.mockRejectedValueOnce(new ApiError(409, "Los cupos ya fueron tomados", "FULL"));
    await expect(fleetActivityClient.acceptHelpRequest("c1")).rejects.toMatchObject({ status: 409, reason: "FULL" });
  });
});

describe("routingClient: bloqueos, rutas y grúas", () => {
  it("alertFleet solo avisa (sin refrescar)", async () => {
    await routingClient.alertFleet("i1");
    expect(apiMock).toHaveBeenCalledWith("/assistance/blockages/i1/alert", { method: "POST" });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("proposeRoute guarda la ruta y la devuelve", async () => {
    apiMock.mockResolvedValueOnce({ id: "r1" } as never);
    const route = await routingClient.proposeRoute("i1", "Desvío", [[4.6, -74.1], [4.7, -74.2]]);
    expect(route).toEqual({ id: "r1" });
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents/i1/routes", { method: "POST", body: { name: "Desvío", geometry: [[4.6, -74.1], [4.7, -74.2]] } });
    expect(refreshMock).toHaveBeenCalled();
  });

  it.each([
    ["assignRoute", () => routingClient.assignRoute("r1", "d1"), "/assistance/routes/r1/assign", { driverId: "d1" }],
    ["acceptRoute", () => routingClient.acceptRoute("r1"), "/assistance/routes/r1/accept", undefined],
    ["assignTow", () => routingClient.assignTow("i1", "G-1", "C-1"), "/assistance/blockages/i1/tow", { towTruck: "G-1", crew: "C-1" }],
    ["completeTow", () => routingClient.completeTow("t1"), "/assistance/tow-assignments/t1/complete", undefined],
  ])("%s pega a la ruta correcta y refresca", async (_n, run, path, body) => {
    await run();
    expect(apiMock).toHaveBeenCalledWith(path, body ? { method: "POST", body } : { method: "POST" });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("listTowReports arma la query solo con los filtros que traen valor", async () => {
    await routingClient.listTowReports({ towTruck: "G-1", crew: "", status: "ASSIGNED", from: "2026-11-01" });
    expect(apiMock).toHaveBeenCalledWith("/assistance/tow-reports?towTruck=G-1&status=ASSIGNED&from=2026-11-01");
    await routingClient.listTowReports();
    expect(apiMock).toHaveBeenLastCalledWith("/assistance/tow-reports");
  });

  it("listEvidence pide las fotos del incidente", async () => {
    await routingClient.listEvidence("i1");
    expect(apiMock).toHaveBeenCalledWith("/assistance/incidents/i1/evidence");
  });

  it("attachEvidence devuelve solo las fotos que fallaron para reintentar sin duplicar", async () => {
    apiMock.mockImplementation((async (_p: string, opts?: { body?: { url?: string } }) => {
      if (opts?.body?.url === "/uploads/mala.jpg") throw new ApiError(400, "no");
      return undefined as never;
    }) as never);
    const out = await routingClient.attachEvidence("i1", [`${API_URL}/uploads/ok.jpg`, `${API_URL}/uploads/mala.jpg`]);
    expect(out).toEqual({ failed: [`${API_URL}/uploads/mala.jpg`] });
  });
});

describe("repairClient: reparaciones del mecánico", () => {
  const report = {
    requestId: "c1", busId: "b1", danosEncontrados: "Frenos", piezasReemplazadas: "Pastillas", gastos: [{ concepto: "Pastillas", valor: 120000 }],
    fotosBus: [`${API_URL}/uploads/bus.jpg`], fotosPiezas: [], mecanicoId: "m1", mecanicoNombre: "Fabián", actualizadoEn: "x",
  } as never;

  it("acceptRequest acepta, quita su aviso emergente y refresca", async () => {
    pushNotification({ id: "n1", title: "t", body: "b", callId: "c1" });
    await repairClient.acceptRequest("c1");
    expect(apiMock).toHaveBeenCalledWith("/assistance/calls/c1/accept", { method: "POST" });
    expect(notificationsStore.get()).toEqual([]);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("getReport lee el borrador de la caché (y el bus de la alerta) o devuelve undefined", async () => {
    const { repairReportsStore } = await import("@/lib/backend");
    expect(repairClient.getReport("c1")).toBeUndefined();
    callsStore.set([{ id: "c1", busId: "b1" }] as never);
    repairReportsStore.set([{ callId: "c1", damages: "Frenos", replacedParts: "x", expenses: [], busPhotos: [], partPhotos: [], mechanicId: "m1", mechanicName: "F", updatedAt: "x", completedAt: null }] as never);
    expect(repairClient.getReport("c1")).toMatchObject({ requestId: "c1", busId: "b1", danosEncontrados: "Frenos" });
  });

  it("saveDraft guarda SIN finalizar y finalizeReport finaliza; las fotos viajan con URL relativa", async () => {
    apiMock.mockResolvedValue({ report: { callId: "c1", damages: "Frenos" } } as never);
    await repairClient.saveDraft(report);
    expect(apiMock).toHaveBeenCalledWith("/assistance/calls/c1/repair-report", expect.objectContaining({ method: "PUT", body: expect.objectContaining({ finalize: false, busPhotos: ["/uploads/bus.jpg"] }) }));
    apiMock.mockResolvedValue({ callId: "c1", damages: "Frenos" } as never); // el back puede responder el informe suelto
    await repairClient.finalizeReport(report);
    expect(apiMock).toHaveBeenLastCalledWith("/assistance/calls/c1/repair-report", expect.objectContaining({ body: expect.objectContaining({ finalize: true }) }));
    const { repairReportsStore } = await import("@/lib/backend");
    expect(repairReportsStore.get().filter((r) => r.callId === "c1")).toHaveLength(1); // reemplaza, no duplica
  });

  it("finalizar sin daños (400) se propaga", async () => {
    apiMock.mockRejectedValueOnce(new ApiError(400, "Indica los daños encontrados"));
    await expect(repairClient.finalizeReport(report)).rejects.toMatchObject({ status: 400 });
  });
});
