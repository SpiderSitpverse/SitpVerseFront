import { api, ApiError } from "@/lib/api";
import { mapInspection } from "@/lib/mappers";
import { connectRealtime, type AssistanceEvent, type FleetPositionEvent } from "@/lib/realtime";
import { createStore } from "@/lib/store";
import type {
  ApiAssistanceSummary,
  ApiBus,
  ApiCall,
  ApiFleetSummary,
  ApiIncident,
  ApiInspection,
  ApiOperativeHome,
  ApiRepairReport,
  ApiRole,
  ApiUser,
} from "@/types/api";
import type { BusReport } from "@/types/bus";

/**
 * Caché en memoria de lo que devuelve el back. Las pantallas leen estos stores (vía los hooks);
 * `startSync` los llena con los GET según el rol y los mantiene al día con el WebSocket
 * (+ un refresco periódico de respaldo). `stopSync` los vacía al cerrar sesión.
 */
export const busesStore = createStore<ApiBus[]>([]);
export const callsStore = createStore<ApiCall[]>([]);
export const incidentsStore = createStore<ApiIncident[]>([]);
export const repairReportsStore = createStore<ApiRepairReport[]>([]);
export const staffStore = createStore<ApiUser[]>([]);
export const homeStore = createStore<ApiOperativeHome | null>(null);
export const fleetSummaryStore = createStore<ApiFleetSummary | null>(null);
export const assistanceSummaryStore = createStore<ApiAssistanceSummary | null>(null);
/** Última inspección por bus; `null` = ya se consultó y nunca fue inspeccionado. */
export const inspectionsStore = createStore<Record<string, BusReport | null>>({});

const POLL_MS = 20_000;

type Loader = () => Promise<void>;

function loaders(role: ApiRole): Loader[] {
  const buses: Loader = async () => busesStore.set(await api<ApiBus[]>("/fleet/buses"));
  const calls: Loader = async () => callsStore.set(await api<ApiCall[]>("/assistance/calls"));
  const reports: Loader = async () =>
    repairReportsStore.set(await api<ApiRepairReport[]>("/assistance/repair-reports"));

  if (role === "ADMIN") {
    return [
      buses,
      calls,
      reports,
      async () => fleetSummaryStore.set(await api<ApiFleetSummary>("/fleet/summary")),
      async () => assistanceSummaryStore.set(await api<ApiAssistanceSummary>("/assistance/summary")),
      async () => incidentsStore.set(await api<ApiIncident[]>("/assistance/incidents")),
      async () => staffStore.set(await api<ApiUser[]>("/users")),
    ];
  }
  if (role === "MECHANICAL") return [buses, calls, reports];
  return [
    buses,
    calls,
    async () => {
      try {
        homeStore.set(await api<ApiOperativeHome>("/fleet/home/operativo"));
      } catch (error) {
        // 404 = el conductor no tiene bus asignado
        if (error instanceof ApiError && error.status === 404) homeStore.set(null);
        else throw error;
      }
    },
  ];
}

let activeLoaders: Loader[] = [];

/** Vuelve a pedir todo lo que el rol necesita. Los fallos sueltos no tumban al resto. */
export async function refreshAll(): Promise<void> {
  await Promise.allSettled(activeLoaders.map((load) => load()));
}

/** Refresca solo lo que cambia con las alertas (las posiciones llegan por su propio evento). */
async function refreshAssistance(role: ApiRole): Promise<void> {
  const tasks: Promise<unknown>[] = [
    api<ApiCall[]>("/assistance/calls").then((v) => callsStore.set(v)),
    api<ApiBus[]>("/fleet/buses").then((v) => busesStore.set(v)),
  ];
  if (role !== "DRIVER") {
    tasks.push(api<ApiRepairReport[]>("/assistance/repair-reports").then((v) => repairReportsStore.set(v)));
  }
  if (role === "ADMIN") {
    tasks.push(
      api<ApiIncident[]>("/assistance/incidents").then((v) => incidentsStore.set(v)),
      api<ApiAssistanceSummary>("/assistance/summary").then((v) => assistanceSummaryStore.set(v)),
    );
  }
  await Promise.allSettled(tasks);
}

function applyPosition(event: FleetPositionEvent) {
  const buses = busesStore.get();
  const current = buses.find((b) => b.id === event.busId);
  if (!current) {
    void api<ApiBus[]>("/fleet/buses").then((v) => busesStore.set(v));
    return;
  }
  const statusChanged = current.status !== event.status;
  busesStore.set(
    buses.map((b) =>
      b.id === event.busId
        ? { ...b, status: event.status, latitude: event.latitude, longitude: event.longitude, updatedAt: event.updatedAt }
        : b,
    ),
  );
  // Al iniciar o terminar un viaje cambian también el conductor y la hora de inicio.
  if (statusChanged) void api<ApiBus[]>("/fleet/buses").then((v) => busesStore.set(v));
}

let stopFn: (() => void) | null = null;

export function startSync(role: ApiRole, token: string, onUnauthorized: () => void) {
  stopSync();
  activeLoaders = loaders(role);
  void refreshAll();

  const disconnect = connectRealtime(token, {
    onPosition: (event) => {
      if (role !== "DRIVER") applyPosition(event);
    },
    onAssistance: (_event: AssistanceEvent) => {
      void refreshAssistance(role);
    },
    onUnauthorized,
  });
  const timer = window.setInterval(() => {
    if (!document.hidden) void refreshAll();
  }, POLL_MS);

  stopFn = () => {
    disconnect();
    window.clearInterval(timer);
  };
}

export function stopSync() {
  stopFn?.();
  stopFn = null;
  activeLoaders = [];
  busesStore.set([]);
  callsStore.set([]);
  incidentsStore.set([]);
  repairReportsStore.set([]);
  staffStore.set([]);
  homeStore.set(null);
  fleetSummaryStore.set(null);
  assistanceSummaryStore.set(null);
  inspectionsStore.set({});
}

/** `GET /inspections/buses/:id/latest` (404 = nunca inspeccionado). Se cachea por bus. */
export async function loadLatestInspection(busId: string): Promise<void> {
  try {
    const inspection = await api<ApiInspection>(`/inspections/buses/${busId}/latest`);
    inspectionsStore.set({ ...inspectionsStore.get(), [busId]: mapInspection(inspection) });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      inspectionsStore.set({ ...inspectionsStore.get(), [busId]: null });
      return;
    }
    throw error;
  }
}
