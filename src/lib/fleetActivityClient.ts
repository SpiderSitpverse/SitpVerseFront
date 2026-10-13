import { api, toRelativeUrl } from "@/lib/api";
import { busesStore, callsStore, incidentsStore, refreshAll } from "@/lib/backend";
import { dismissWhere } from "@/lib/notifications";
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

  /**
   * El conductor avisa a administración; el admin decide luego cuántos conductores necesita.
   * `photos` (URLs ya subidas con `POST /files/images`) se adjuntan al incidente como evidencia (HU-22).
   * Si alguna foto no se puede adjuntar, el reporte igual queda creado: se devuelve cuántas fallaron.
   */
  async reportIncident(
    busId: string,
    type: string,
    description: string,
    photos: string[] = [],
  ): Promise<{ failedPhotos: number }> {
    const incident = await api<{ id: string }>("/assistance/incidents", {
      method: "POST",
      body: { busId, type, description: description || undefined },
    });
    const results = await Promise.allSettled(
      photos.map((url) =>
        api(`/assistance/incidents/${incident.id}/evidence`, { method: "POST", body: { url: toRelativeUrl(url) } }),
      ),
    );
    return { failedPhotos: results.filter((r) => r.status === "rejected").length };
  },

  /** El conductor acepta apoyar. 409 `FULL` si los cupos ya se llenaron. */
  async acceptHelpRequest(callId: string): Promise<void> {
    await api(`/assistance/calls/${callId}/accept`, { method: "POST" });
    dismissWhere((n) => n.callId === callId); // ya la tomaste: su aviso emergente sobra
    await refreshCalls();
  },

  /** Admin: lanza la solicitud de ayuda a conductores para un incidente reportado. */
  async launchSupportCall(incidentId: string, slots: number, rewardPoints: number): Promise<void> {
    await api(`/assistance/incidents/${incidentId}/support-call`, { method: "POST", body: { slots, rewardPoints } });
    await refreshAll();
  },

  /**
   * Admin: elimina un incidente. 409 con `reason`: `CLAIMED` (alguien lo atiende: con `force` se elimina igual y se
   * cancelan sus aceptaciones sin puntos), `TOW_ACTIVE` (grúa en servicio) o `ROUTE_ACTIVE` (ruta asignada).
   */
  async deleteIncident(incidentId: string, force = false): Promise<void> {
    await api(`/assistance/incidents/${incidentId}${force ? "?force=true" : ""}`, { method: "DELETE" });
    await refreshAll();
  },

  /**
   * "Atención recibida": el conductor que reportó el incidente confirma que ya le llegó la ayuda. Cierra la alerta,
   * paga los puntos a quienes ayudaron y el incidente queda resuelto.
   */
  async confirmHelpReceived(callId: string): Promise<void> {
    await api(`/assistance/calls/${callId}/complete`, { method: "POST" });
    await refreshAll();
  },

  /** Admin: cambia la foto del bus (URL relativa que devolvió `POST /files/images`) o la quita con `null`. */
  async setBusPhoto(busId: string, photoUrl: string | null): Promise<void> {
    await api(`/fleet/buses/${busId}`, { method: "PATCH", body: { photoUrl } });
    await refreshAll();
  },

  /**
   * Admin o conductor: genera una solicitud de reparación para los mecánicos. Con `incidentId` queda ligada
   * al incidente: si el admin lo elimina (y ningún mecánico la aceptó), la solicitud se elimina con él.
   */
  async requestRepair(busId: string, description: string, incidentId?: string): Promise<void> {
    await api("/assistance/bus-faults", {
      method: "POST",
      body: { busId, incidentId, description: description || undefined },
    });
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
