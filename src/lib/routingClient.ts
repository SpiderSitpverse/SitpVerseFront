import { api, toRelativeUrl } from "@/lib/api";
import { refreshAll } from "@/lib/backend";
import type { ApiAlternativeRoute, ApiEvidence, ApiTowAssignment } from "@/types/api";
import type { LatLngTuple } from "@/types/routing";

export interface TowReportFilters {
  towTruck?: string;
  crew?: string;
  status?: ApiTowAssignment["status"];
  /** ISO 8601. */
  from?: string;
  to?: string;
}

/**
 * Acciones sobre bloqueos, rutas alternativas, grúas y evidencia, contra el back (docs/API.md §2).
 * Las lecturas salen de los stores de `lib/backend.ts`; aquí solo se escribe y luego se refresca la
 * caché para que la pantalla se actualice al instante. Los errores (409, 400…) traen el mensaje del
 * back en español: las pantallas lo muestran tal cual.
 */
export const routingClient = {
  /** HU-44: avisa del bloqueo a todos los conductores (no pide apoyo, solo informa). */
  async alertFleet(incidentId: string): Promise<void> {
    await api(`/assistance/blockages/${incidentId}/alert`, { method: "POST" });
  },

  /** HU-47: guarda una ruta alternativa dibujada en el mapa (puntos `[lat, lng]`, entre 2 y 2000). */
  async proposeRoute(incidentId: string, name: string, points: LatLngTuple[]): Promise<ApiAlternativeRoute> {
    const route = await api<ApiAlternativeRoute>(`/assistance/incidents/${incidentId}/routes`, {
      method: "POST",
      body: { name, geometry: points },
    });
    await refreshAll();
    return route;
  },

  /** HU-47: asigna la ruta a un conductor (`driverId` = id de usuario). 409 si ya fue aceptada. */
  async assignRoute(routeId: string, driverId: string): Promise<void> {
    await api(`/assistance/routes/${routeId}/assign`, { method: "POST", body: { driverId } });
    await refreshAll();
  },

  /** HU-17 / HU-52: el conductor acepta la ruta que le asignaron. */
  async acceptRoute(routeId: string): Promise<void> {
    await api(`/assistance/routes/${routeId}/accept`, { method: "POST" });
    await refreshAll();
  },

  /** HU-30: asigna grúa y cuadrilla. 409 `TOW_TRUCK_BUSY` / `CREW_BUSY` si ya están en un servicio activo. */
  async assignTow(incidentId: string, towTruck: string, crew: string): Promise<void> {
    await api(`/assistance/blockages/${incidentId}/tow`, { method: "POST", body: { towTruck, crew } });
    await refreshAll();
  },

  /** Termina el servicio de grúa y libera la grúa y la cuadrilla. */
  async completeTow(assignmentId: string): Promise<void> {
    await api(`/assistance/tow-assignments/${assignmentId}/complete`, { method: "POST" });
    await refreshAll();
  },

  /** HU-50: listado de grúas y cuadrillas, con filtros. */
  async listTowReports(filters: TowReportFilters = {}): Promise<ApiTowAssignment[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) query.set(key, value);
    }
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    return api<ApiTowAssignment[]>(`/assistance/tow-reports${suffix}`);
  },

  /** HU-22: fotos de un incidente. */
  listEvidence(incidentId: string): Promise<ApiEvidence[]> {
    return api<ApiEvidence[]>(`/assistance/incidents/${incidentId}/evidence`);
  },

  /**
   * HU-22: adjunta fotos ya subidas (`POST /files/images`) a un incidente. Devuelve cuántas fallaron:
   * las que sí se adjuntaron quedan, y reintentar solo con las que faltan evita duplicados.
   */
  async attachEvidence(incidentId: string, photoUrls: string[]): Promise<{ failed: string[] }> {
    const results = await Promise.allSettled(
      photoUrls.map((url) =>
        api(`/assistance/incidents/${incidentId}/evidence`, { method: "POST", body: { url: toRelativeUrl(url) } }),
      ),
    );
    return { failed: photoUrls.filter((_, i) => results[i].status === "rejected") };
  },
};
