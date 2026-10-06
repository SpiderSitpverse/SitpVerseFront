import { api } from "@/lib/api";
import { busesStore, callsStore, incidentsStore, refreshAll } from "@/lib/backend";
import type { ApiBus, ApiCall, ApiIncident } from "@/types/api";

/**
 * Acciones sobre viajes y alertas de apoyo, contra el back (docs/API.md §2). Las lecturas
 * salen de los stores de `lib/backend.ts` (ver hooks/useFleetActivity.ts); aquí solo se
 * escribe y luego se refresca la caché para que la pantalla se actualice al instante.
 */
export const fleetActivityClient = {
  async startTrip(busId: string): Promise<void> {
    await api(`/fleet/buses/${busId}/start-trip`, { method: "PATCH" });
    await refreshAll();
  },

  async endTrip(busId: string): Promise<void> {
    await api(`/fleet/buses/${busId}/finish-trip`, { method: "PATCH" });
    await refreshAll();
  },

  /** Posición del bus (solo con el viaje iniciado, si no responde 409). */
  async sendPosition(busId: string, latitude: number, longitude: number): Promise<void> {
    await api(`/fleet/buses/${busId}/position`, { method: "PATCH", body: { latitude, longitude } });
  },

  /** El conductor avisa a administración; el admin decide luego cuántos conductores necesita. */
  async reportIncident(busId: string, type: string, description: string): Promise<void> {
    await api("/assistance/incidents", { method: "POST", body: { busId, type, description: description || undefined } });
  },

  /** El conductor acepta apoyar. 409 `FULL` si los cupos ya se llenaron. */
  async acceptHelpRequest(callId: string): Promise<void> {
    await api(`/assistance/calls/${callId}/accept`, { method: "POST" });
    await refreshCalls();
  },

  /** Admin: lanza la solicitud de ayuda a conductores para un incidente reportado. */
  async launchSupportCall(incidentId: string, slots: number, rewardPoints: number): Promise<void> {
    await api(`/assistance/incidents/${incidentId}/support-call`, { method: "POST", body: { slots, rewardPoints } });
    await refreshAll();
  },

  /** Admin o conductor: genera una solicitud de reparación para los mecánicos. */
  async requestRepair(busId: string, description: string): Promise<void> {
    await api("/assistance/bus-faults", { method: "POST", body: { busId, description: description || undefined } });
    await refreshAll();
  },
};

async function refreshCalls() {
  const [calls, buses, incidents] = await Promise.allSettled([
    api<ApiCall[]>("/assistance/calls"),
    api<ApiBus[]>("/fleet/buses"),
    incidentsStore.get().length > 0 ? api<ApiIncident[]>("/assistance/incidents") : Promise.resolve(null),
  ]);
  if (calls.status === "fulfilled") callsStore.set(calls.value);
  if (buses.status === "fulfilled") busesStore.set(buses.value);
  if (incidents.status === "fulfilled" && incidents.value) incidentsStore.set(incidents.value);
}
