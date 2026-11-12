import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import { setToken } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { stopSync } from "@/lib/backend";

export const NOW_ISO = "2026-11-11T12:00:00.000Z";

export const BUSES = [
  { id: "b1", plate: "TMX-001", route: "Troncal Caracas", status: "IN_SERVICE", latitude: 4.6097, longitude: -74.0817, locationLabel: "Calle 26", model: "Marcopolo", year: 2020, operator: "Consorcio", capacity: 160, driverId: "d1", driver: "Carlos Pérez", tripStartedAt: NOW_ISO, photoUrl: null, updatedAt: NOW_ISO },
  { id: "b2", plate: "TMX-002", route: "Troncal NQS", status: "IDLE", latitude: 4.65, longitude: -74.09, locationLabel: "Portal Eldorado", model: null, year: null, operator: null, capacity: null, driverId: "d2", driver: "Laura Gómez", tripStartedAt: null, photoUrl: null, updatedAt: NOW_ISO },
  { id: "b3", plate: "TMX-003", route: "Troncal Autonorte", status: "FINISHED", latitude: 4.71, longitude: -74.05, locationLabel: null, model: null, year: null, operator: null, capacity: null, driverId: null, driver: null, tripStartedAt: null, photoUrl: null, updatedAt: NOW_ISO },
];

export const INCIDENTS = [
  { id: "i1", busId: "b1", type: "Falla de motor", description: "Humo en el motor", status: "REPORTED", reportedByName: "Carlos Pérez", createdAt: NOW_ISO },
  { id: "i2", busId: "b2", type: "Llanta", description: null, status: "HELP_REQUESTED", reportedByName: null, createdAt: NOW_ISO },
];

export const CALLS = [
  { id: "c1", busId: "b1", kind: "DRIVER_SUPPORT", status: "OPEN", slots: 3, claimedCount: 0, rewardPoints: 50, description: "Falla de motor", incidentId: "i1", createdAt: NOW_ISO, claims: [], bus: { plate: "TMX-001", route: "Troncal Caracas", locationLabel: "Calle 26", driverName: "Carlos Pérez" }, incident: { type: "Falla de motor", description: "Humo", reportedByName: "Carlos Pérez" } },
  { id: "c2", busId: "b2", kind: "REPAIR", status: "OPEN", slots: 1, claimedCount: 0, rewardPoints: 20, description: "Frenos", incidentId: null, createdAt: NOW_ISO, claims: [], bus: { plate: "TMX-002", route: "Troncal NQS", locationLabel: "Portal Eldorado", driverName: "Laura" }, incident: null },
  { id: "c3", busId: "b3", kind: "REPAIR", status: "FILLED", slots: 1, claimedCount: 1, rewardPoints: 20, description: "Luces", incidentId: null, createdAt: NOW_ISO, claims: [{ userId: "m1", userName: "Fabián Castro", status: "ACTIVE", createdAt: NOW_ISO }], bus: { plate: "TMX-003", route: "Troncal Autonorte", locationLabel: null, driverName: null }, incident: null },
];

export const USERS = [
  { id: "u-admin", employeeId: "1001", name: "Kevin Cuitiva", role: "ADMIN", email: "kevin@gmail.com", active: true },
  { id: "d1", employeeId: "2001", name: "Carlos Pérez", role: "DRIVER", email: "carlos@gmail.com", active: true },
  { id: "m1", employeeId: "3001", name: "Fabián Castro", role: "MECHANICAL", email: "fabian@gmail.com", active: false },
];

export const REQUESTS = [
  { id: "r1", email: "nuevo@gmail.com", name: "Persona Nueva", photoUrl: null, status: "PENDING", requestedAt: NOW_ISO, lastAttemptAt: NOW_ISO },
  { id: "r2", email: "rechazado@gmail.com", name: "Rechazada Ya", photoUrl: "https://example.com/a.png", status: "REJECTED", requestedAt: NOW_ISO, lastAttemptAt: NOW_ISO },
];

export type Routes = Record<string, unknown | ((init: RequestInit) => { status?: number; body?: unknown })>;

/** Servidor falso: responde por ruta (y método). Lo que no esté listado devuelve `[]` (GET) o `{}`. */
export function installFetch(routes: Routes = {}) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const handler = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = (init.method ?? "GET").toUpperCase();
    const key = `${method} ${url.pathname}`;
    let body: unknown = undefined;
    try {
      body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    } catch {
      body = init.body;
    }
    calls.push({ method, path: url.pathname, body });
    const route = routes[key] ?? routes[url.pathname];
    const result = typeof route === "function" ? (route as (i: RequestInit) => { status?: number; body?: unknown })(init) : { body: route };
    const status = result.status ?? 200;
    const payload = result.body === undefined ? (method === "GET" ? [] : {}) : result.body;
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", handler);
  return { handler, calls };
}

const SESSIONS = {
  admin: { userId: "u-admin", employeeId: "1001", role: "admin", nombre: "Kevin Cuitiva" },
  conductor: { userId: "d1", employeeId: "2001", role: "conductor", nombre: "Carlos Pérez" },
  mecanico: { userId: "m1", employeeId: "3001", role: "mecanico", nombre: "Fabián Castro" },
} as const;

const ME = {
  admin: { id: "u-admin", employeeId: "1001", name: "Kevin Cuitiva", role: "ADMIN" },
  conductor: { id: "d1", employeeId: "2001", name: "Carlos Pérez", role: "DRIVER" },
  mecanico: { id: "m1", employeeId: "3001", name: "Fabián Castro", role: "MECHANICAL" },
} as const;

/** Datos de ejemplo que el back devolvería a cada rol. */
export const baseRoutes = (role: keyof typeof SESSIONS): Routes => ({
  "/auth/me": ME[role],
  "/fleet/buses": BUSES,
  "/assistance/calls": CALLS,
  "/assistance/incidents": INCIDENTS,
  "/assistance/blockages": INCIDENTS.map((i) => ({ ...i, routes: [], towAssignments: [] })),
  "/fleet/summary": { total: 3, inService: 1, idle: 1, finished: 1 },
  "/assistance/summary": { incidentsLast24h: 2, repairsInProgress: 1 },
  "/users": USERS,
  "/access-requests": REQUESTS,
  "/fleet/home/operativo": { busId: "b1", plate: "TMX-001", route: "Troncal Caracas", status: "IDLE", tripStartedAt: null, latitude: 4.6, longitude: -74.1, locationLabel: "Calle 26", model: null, year: null, operator: null, capacity: 160, photoUrl: null },
});

/** Renderiza la app completa con la sesión de un rol ya iniciada. */
export function renderApp(path: string, role: keyof typeof SESSIONS | null, routes: Routes = {}) {
  stopSync();
  const server = installFetch({ ...(role ? baseRoutes(role) : {}), ...routes });
  if (role) {
    setToken("jwt-de-prueba");
    saveSession(SESSIONS[role] as never);
  }
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  return { ...view, ...server };
}
