import { api, ApiError } from "@/lib/api";
import { clearBlockageAlerts, recordBlockageAlert } from "@/lib/blockageAlerts";
import { mapInspection } from "@/lib/mappers";
import { clearNotifications, pushNotification } from "@/lib/notifications";
import { connectRealtime, type AssistanceEvent, type FleetPositionEvent } from "@/lib/realtime";
import { createStore } from "@/lib/store";
import type {
  ApiAlternativeRoute,
  ApiAssistanceSummary,
  ApiBlockage,
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
/** Incidentes con sus rutas alternativas y grúas (solo ADMIN). */
export const blockagesStore = createStore<ApiBlockage[]>([]);
/** Rutas alternativas asignadas al conductor que inició sesión (solo DRIVER). */
export const assignedRoutesStore = createStore<ApiAlternativeRoute[]>([]);
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
      async () => blockagesStore.set(await api<ApiBlockage[]>("/assistance/blockages")),
      async () => staffStore.set(await api<ApiUser[]>("/users")),
    ];
  }
  if (role === "MECHANICAL") return [buses, calls, reports];
  return [
    buses,
    calls,
    async () => assignedRoutesStore.set(await api<ApiAlternativeRoute[]>("/assistance/routes/assigned/me")),
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
      api<ApiBlockage[]>("/assistance/blockages").then((v) => blockagesStore.set(v)),
      api<ApiAssistanceSummary>("/assistance/summary").then((v) => assistanceSummaryStore.set(v)),
    );
  }
  if (role === "DRIVER") {
    tasks.push(api<ApiAlternativeRoute[]>("/assistance/routes/assigned/me").then((v) => assignedRoutesStore.set(v)));
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

/** Los eventos más viejos que esto (reenviados al reconectar) no se avisan: ya no son noticia. */
const NOTIFY_MAX_AGE_MS = 2 * 60_000;

interface EventPayload {
  busId?: string;
  type?: string;
  kind?: "DRIVER_SUPPORT" | "REPAIR";
  description?: string | null;
  slots?: number;
  remainingSlots?: number;
  rewardPoints?: number;
  resent?: boolean;
  reportedById?: string;
  reportedBy?: { name?: string };
  incidentId?: string;
  name?: string;
}

/**
 * Aviso emergente según el rol (los eventos ya llegan filtrados por sala desde el back):
 *  - ADMIN: un conductor reportó un problema (`incident.reported`); un conductor aceptó su ruta (`route.accepted`).
 *  - DRIVER: el admin avisó de un bloqueo (`blockage.alerted`) o le asignó una ruta (`route.assigned`);
 *    el admin abrió o reenvió una alerta con cupos (`call.opened`).
 *  - MECHANICAL: el admin abrió o reenvió una solicitud de reparación (`call.opened`).
 */
function notifyAssistanceEvent(role: ApiRole, userId: string | undefined, event: AssistanceEvent) {
  const p = event.payload as EventPayload;
  const plate = busesStore.get().find((b) => b.id === p.busId)?.plate;

  // El back no guarda los avisos de bloqueo: se recuerdan siempre (aunque lleguen reenviados y viejos),
  // y el aviso emergente solo sale si el evento es reciente.
  if (role === "DRIVER" && event.type === "blockage.alerted" && p.incidentId) {
    recordBlockageAlert({
      id: event.eventId,
      incidentId: p.incidentId,
      busId: p.busId,
      placa: plate,
      tipo: p.type ?? "Bloqueo",
      descripcion: p.description ?? "",
      recibidaEn: event.occurredAt,
    });
  }

  if (Date.now() - new Date(event.occurredAt).getTime() > NOTIFY_MAX_AGE_MS) return;

  if (role === "DRIVER" && event.type === "blockage.alerted") {
    pushNotification({
      id: event.eventId,
      title: "Bloqueo en la vía",
      body: `${plate ? `Bus ${plate}` : "Un bus"}: ${p.type ?? "bloqueo"}`,
      detail: p.description ?? undefined,
      to: "/conductor",
    });
    return;
  }

  if (role === "DRIVER" && event.type === "route.assigned") {
    pushNotification({
      id: event.eventId,
      title: "Te asignaron una ruta alternativa",
      body: "Revísala y acéptala para tomar el desvío.",
      to: "/conductor",
    });
    return;
  }

  if (role === "ADMIN" && event.type === "route.accepted") {
    pushNotification({
      id: event.eventId,
      title: "Ruta alternativa aceptada",
      body: "Un conductor aceptó el desvío que le asignaste.",
      to: "/buses",
    });
    return;
  }

  if (role === "ADMIN" && event.type === "incident.reported") {
    pushNotification({
      id: event.eventId,
      title: "Nuevo reporte de conductor",
      body: `${p.reportedBy?.name ?? "Un conductor"}${plate ? ` · ${plate}` : ""}: ${p.type ?? "problema"}`,
      detail: p.description ?? undefined,
      to: "/incidentes",
    });
    return;
  }

  if (event.type !== "call.opened") return;
  if (role === "DRIVER") {
    // El conductor que reportó el problema no necesita el aviso de su propia alerta.
    if (userId && p.reportedById === userId) return;
    pushNotification({
      id: event.eventId,
      title: p.resent ? "Alerta de apoyo reenviada" : "Un compañero necesita apoyo",
      body: `${plate ? `Bus ${plate}` : "Un bus"}: ${p.description ?? "requiere asistencia"}`,
      detail: callDetail(p),
      to: "/conductor/ayuda",
    });
  } else if (role === "MECHANICAL") {
    pushNotification({
      id: event.eventId,
      title: p.resent ? "Solicitud de reparación reenviada" : "Nueva solicitud de reparación",
      body: `${plate ? `Bus ${plate}` : "Un bus"}: ${p.description ?? "requiere reparación"}`,
      detail: callDetail(p),
      to: "/taller",
    });
  }
}

function callDetail(p: EventPayload): string | undefined {
  const parts: string[] = [];
  const slots = p.remainingSlots ?? p.slots;
  if (slots !== undefined) parts.push(`${slots} cupo${slots === 1 ? "" : "s"} disponible${slots === 1 ? "" : "s"}`);
  if (p.rewardPoints) parts.push(`${p.rewardPoints} puntos`);
  return parts.length ? parts.join(" · ") : undefined;
}

let stopFn: (() => void) | null = null;

export function startSync(role: ApiRole, token: string, onUnauthorized: () => void, userId?: string) {
  stopSync();
  activeLoaders = loaders(role);
  void refreshAll();

  const disconnect = connectRealtime(token, {
    onPosition: (event) => {
      if (role !== "DRIVER") applyPosition(event);
    },
    onAssistance: (event: AssistanceEvent) => {
      notifyAssistanceEvent(role, userId, event);
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
  blockagesStore.set([]);
  assignedRoutesStore.set([]);
  clearBlockageAlerts();
  homeStore.set(null);
  fleetSummaryStore.set(null);
  assistanceSummaryStore.set(null);
  inspectionsStore.set({});
  clearNotifications();
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
