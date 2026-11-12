import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  mapActiveTrip,
  mapAlternativeRoute,
  mapAssignedRoute,
  mapBus,
  mapHelpRequest,
  mapIncident,
  mapInspection,
  mapRepairReport,
  mapRepairRequest,
  mapStaff,
  mapTowAssignment,
  sanitizeGeometry,
} from "@/lib/mappers";
import type { ApiBus, ApiCall, ApiIncident, ApiUser } from "@/types/api";

const bus = (over: Partial<ApiBus> = {}): ApiBus => ({
  id: "b1",
  plate: "TMX-001",
  route: "Troncal Caracas",
  status: "IDLE",
  latitude: 4.6097,
  longitude: -74.0817,
  locationLabel: "Calle 26",
  model: "Marcopolo",
  year: 2020,
  operator: "Consorcio",
  capacity: 160,
  driverId: "d1",
  driver: "Carlos Pérez",
  tripStartedAt: null,
  photoUrl: null,
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...over,
});

const call = (over: Partial<ApiCall> = {}): ApiCall =>
  ({
    id: "c1",
    busId: "b1",
    kind: "SUPPORT",
    status: "OPEN",
    description: "No enciende",
    createdAt: "2026-11-01T10:00:00.000Z",
    claims: [],
    bus: { plate: "TMX-001", route: "Troncal Caracas", locationLabel: "Calle 26", driverName: "Carlos" },
    incident: { type: "Falla de motor", description: "Humo", reportedByName: "Carlos Pérez" },
    ...over,
  }) as unknown as ApiCall;

describe("mapBus", () => {
  it("un bus en reposo muestra la etiqueta de su ficha y está fuera de servicio", () => {
    expect(mapBus(bus(), new Set())).toMatchObject({ placa: "TMX-001", ubicacion: "Calle 26", estado: "fuera-servicio", lat: 4.6097 });
  });

  it("un bus con una alerta de reparación abierta está en mantenimiento", () => {
    expect(mapBus(bus(), new Set(["b1"])).estado).toBe("mantenimiento");
  });

  it("un bus en servicio se describe por su posición real, no por la etiqueta de la ficha", () => {
    const mapped = mapBus(bus({ status: "IN_SERVICE", latitude: 4.9, longitude: -74.5 }), new Set());
    expect(mapped.estado).toBe("operacion");
    expect(mapped.ubicacion).toBe("4.9000, -74.5000");
  });

  it("sin coordenadas ni etiqueta → 'Sin ubicación'; con coordenadas en texto las convierte", () => {
    expect(mapBus(bus({ latitude: null, longitude: null, locationLabel: null }), new Set()).ubicacion).toBe("Sin ubicación");
    expect(mapBus(bus({ latitude: "4.61", longitude: "-74.08" }), new Set()).lat).toBe(4.61);
    expect(mapBus(bus({ latitude: "x" }), new Set()).lat).toBeUndefined();
  });

  it("convierte la foto relativa en una URL absoluta", () => {
    expect(mapBus(bus({ photoUrl: "/uploads/a.jpg" }), new Set()).foto).toMatch(/\/uploads\/a\.jpg$/);
  });
});

describe("viajes y rutas asignadas", () => {
  it("mapActiveTrip usa los textos por defecto cuando faltan datos", () => {
    expect(mapActiveTrip(bus({ driver: null, driverId: null }))).toMatchObject({ driverName: "Conductor", driverId: "", startedAt: "2026-11-01T10:00:00.000Z" });
    expect(mapActiveTrip(bus({ tripStartedAt: "2026-11-01T09:00:00.000Z" })).startedAt).toBe("2026-11-01T09:00:00.000Z");
  });

  it("mapAssignedRoute", () => {
    expect(mapAssignedRoute({ busId: "b1", plate: "TMX-001", route: "Caracas" } as never, "d1")).toEqual({
      driverId: "d1", busId: "b1", placa: "TMX-001", troncal: "Caracas",
    });
  });
});

describe("mapHelpRequest", () => {
  const me = { id: "d2", nombre: "Diana", busId: "b2" };

  it("una alerta abierta sin aceptar está pendiente", () => {
    expect(mapHelpRequest(call(), me)).toMatchObject({ status: "pendiente", driverId: "", driverName: "Carlos Pérez", motivo: "Falla de motor" });
  });

  it("si es de mi bus, el conductor soy yo", () => {
    expect(mapHelpRequest(call({ busId: "b2" }), me).driverId).toBe("d2");
  });

  it("aceptada por mí: dice mi nombre; aceptada por otro: dice el suyo", () => {
    const mine = call({ claims: [{ userId: "d2", userName: "Diana", status: "ACTIVE" }] } as never);
    const other = call({ status: "FILLED", claims: [{ userId: "d3", userName: "Mateo", status: "ACTIVE" }] } as never);
    expect(mapHelpRequest(mine, me)).toMatchObject({ status: "aceptada", aceptadoPor: "Diana" });
    expect(mapHelpRequest(other, me)).toMatchObject({ status: "aceptada", aceptadoPor: "Mateo" });
  });

  it("completada sin reclamos activos: aceptada sin nombre; y textos por defecto sin incidente", () => {
    const done = mapHelpRequest(call({ status: "COMPLETED", incident: undefined, bus: undefined, description: null } as never), me);
    expect(done).toMatchObject({ status: "aceptada", aceptadoPor: undefined, placa: "—", driverName: "Conductor", motivo: "Solicitud de ayuda", detalle: "" });
  });
});

describe("mapRepairRequest / mapRepairReport", () => {
  it("el estado sale del de la alerta y trae al mecánico que la tomó", () => {
    const claims = [{ userId: "m1", userName: "Fabián", status: "ACTIVE", createdAt: "2026-11-01T11:00:00.000Z" }];
    expect(mapRepairRequest(call())).toMatchObject({ estado: "pendiente", problema: "No enciende" });
    expect(mapRepairRequest(call({ status: "FILLED", claims } as never))).toMatchObject({ estado: "aceptada", mecanicoNombre: "Fabián" });
    expect(mapRepairRequest(call({ status: "COMPLETED", bus: undefined, description: null } as never))).toMatchObject({
      estado: "completada", placa: "—", troncal: "—", ubicacion: "Sin ubicación", problema: "Sin descripción",
    });
  });

  it("mapRepairReport convierte las fotos y completa lo que falta", () => {
    const report = mapRepairReport(
      { callId: "c1", damages: "Frenos", replacedParts: "Pastillas", expenses: undefined, busPhotos: ["/uploads/a.jpg"], partPhotos: undefined, mechanicId: "m1", mechanicName: "Fabián", updatedAt: "x", completedAt: null } as never,
      "b1",
    );
    expect(report).toMatchObject({ requestId: "c1", busId: "b1", gastos: [], fotosPiezas: [], completadaEn: undefined });
    expect(report.fotosBus[0]).toMatch(/uploads\/a\.jpg$/);
  });
});

describe("mapIncident", () => {
  const incident = (status: ApiIncident["status"]): ApiIncident =>
    ({ id: "i1", busId: "b1", type: "Llanta", description: null, reportedByName: null, status, createdAt: "x" }) as ApiIncident;

  it("reportado = alerta; con ayuda solicitada = informativo", () => {
    expect(mapIncident(incident("REPORTED"), () => "TMX-001")).toMatchObject({ severidad: "alerta", estado: "reportado", placa: "TMX-001", reportadoPor: "Conductor", descripcion: "" });
    expect(mapIncident(incident("HELP_REQUESTED"), () => "TMX-001")).toMatchObject({ severidad: "info", estado: "ayuda-solicitada" });
  });
});

describe("mapStaff / mapInspection", () => {
  it("mapStaff traduce el rol y trata la cuenta como activa salvo que diga lo contrario", () => {
    const user: ApiUser = { id: "u1", employeeId: "2001", name: "Carlos", role: "DRIVER", email: "c@x.com" };
    expect(mapStaff(user)).toMatchObject({ rol: "Conductor", rolApi: "DRIVER", correo: "c@x.com", activo: true });
    expect(mapStaff({ ...user, active: false, email: undefined })).toMatchObject({ activo: false, correo: "" });
  });

  it("mapInspection usa la nota si no hay comentario y convierte las fotos", () => {
    const inspection = mapInspection({ inspectorName: "Carlos", inspectorRole: "DRIVER", createdAt: "2026-11-01T10:00:00.000Z", note: "Bien", comment: "", photos: ["/uploads/p.jpg"] } as never);
    expect(inspection).toMatchObject({ nombre: "Carlos", rol: "Conductor", comentario: "Bien" });
    expect(inspection.fotos[0]).toMatch(/p\.jpg$/);
    expect(mapInspection({ inspectorName: "X", inspectorRole: "OTRO", createdAt: "x", note: "n", comment: "c" } as never)).toMatchObject({ rol: "OTRO", comentario: "c", fotos: [] });
  });
});

describe("sanitizeGeometry", () => {
  it("solo deja pares [lat, lng] numéricos y en rango", () => {
    expect(
      sanitizeGeometry([[4.6, -74.1], [91, 0], [0, 181], ["a", 1], [1], null, [Infinity, 0], [4.7, -74.2]]),
    ).toEqual([[4.6, -74.1], [4.7, -74.2]]);
  });
  it("algo que no es una lista → vacío", () => {
    expect(sanitizeGeometry("hola")).toEqual([]);
    expect(sanitizeGeometry(undefined)).toEqual([]);
  });
});

describe("rutas alternativas y grúas", () => {
  const route: Record<string, unknown> = { id: "r1", incidentId: "i1", name: "Desvío", status: "ASSIGNED", geometry: [[4.6, -74.1]], assignedToId: "d1", createdAt: "x" };

  it("mapAlternativeRoute enriquece con el incidente y la placa", () => {
    expect(mapAlternativeRoute(route as never, { type: "Bloqueo", description: null, busId: "b1" }, () => "TMX-001")).toMatchObject({
      estado: "asignada", conductorId: "d1", puntos: [[4.6, -74.1]], incidente: { titulo: "Bloqueo", descripcion: "", placa: "TMX-001" },
    });
    expect(mapAlternativeRoute({ ...route, status: "RARO", assignedToId: null } as never)).toMatchObject({ estado: "propuesta", conductorId: undefined, incidente: undefined });
  });

  it("mapTowAssignment traduce el estado y el incidente", () => {
    const tow: Record<string, unknown> = { id: "t1", incidentId: "i1", busId: "b1", towTruck: "G-1", crew: "C-1", status: "IN_PROGRESS", createdAt: "x", completedAt: null, incident: { type: "Choque", description: null } };
    expect(mapTowAssignment(tow as never, () => "TMX-001")).toMatchObject({ estado: "en-curso", placa: "TMX-001", grua: "G-1", incidente: { titulo: "Choque", descripcion: "" } });
    expect(mapTowAssignment({ ...tow, status: "RARO", incident: undefined, completedAt: "y" } as never)).toMatchObject({ estado: "asignada", completadoEn: "y", incidente: undefined });
  });
});

describe("formatDateTime", () => {
  it("formatea en es-CO y deja intacto un texto que no es fecha", () => {
    expect(formatDateTime("2026-11-01T15:30:00.000Z")).toMatch(/2026/);
    expect(formatDateTime("no-es-fecha")).toBe("no-es-fecha");
  });
});
