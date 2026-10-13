import { useMemo } from "react";
import {
  assistanceSummaryStore,
  busesStore,
  callsStore,
  fleetSummaryStore,
  homeStore,
  incidentsStore,
  staffStore,
} from "@/lib/backend";
import { mapAssignedRoute, mapBus, mapIncident, mapStaff } from "@/lib/mappers";
import { useStore } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import type { Bus, FleetSummary, Incident } from "@/types/bus";
import type { AssignedRoute } from "@/types/driver";
import type { StaffMember } from "@/types/user";

/** Datos de flota que lee el front. Todo viene del back vía `lib/backend.ts` (docs/API.md). */

/** GET /fleet/buses — el estado "mantenimiento" sale de las alertas de reparación abiertas. */
export function useBuses(): Bus[] {
  const buses = useStore(busesStore);
  const calls = useStore(callsStore);
  return useMemo(() => {
    const inRepair = new Set(calls.filter((c) => c.kind === "REPAIR" && c.status !== "COMPLETED").map((c) => c.busId));
    // Por placa: el back no garantiza un orden y la lista saltaba (005, 004, 003…).
    return buses.map((bus) => mapBus(bus, inRepair)).sort((a, b) => a.placa.localeCompare(b.placa, "es", { numeric: true }));
  }, [buses, calls]);
}

/** GET /fleet/summary + GET /assistance/summary (solo ADMIN). */
export function useFleetSummary(): FleetSummary | null {
  const fleet = useStore(fleetSummaryStore);
  const assistance = useStore(assistanceSummaryStore);
  return useMemo(
    () =>
      fleet
        ? { total: fleet.total, enOperacion: fleet.inService, incidentesHoy: assistance?.incidentsLast24h ?? 0 }
        : null,
    [fleet, assistance],
  );
}

/** GET /fleet/home/operativo — el bus asignado al conductor que inició sesión. */
export function useAssignedRoute(): AssignedRoute | null {
  const home = useStore(homeStore);
  const { userId } = useAuth();
  return useMemo(() => (home && userId ? mapAssignedRoute(home, userId) : null), [home, userId]);
}

/** GET /assistance/incidents (solo ADMIN). */
export function useIncidents(): Incident[] {
  const incidents = useStore(incidentsStore);
  const buses = useStore(busesStore);
  return useMemo(() => {
    const plates = new Map(buses.map((b) => [b.id, b.plate]));
    // Los resueltos (todas sus alertas terminaron) ya no son trabajo pendiente: salen de la lista del admin.
    return incidents
      .filter((i) => i.status !== "RESOLVED")
      .map((i) => mapIncident(i, (busId) => plates.get(busId) ?? "—"));
  }, [incidents, buses]);
}

/** GET /users (solo ADMIN). */
export function useStaff(): StaffMember[] {
  const users = useStore(staffStore);
  return useMemo(() => users.map(mapStaff), [users]);
}
