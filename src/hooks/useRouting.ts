import { useMemo } from "react";
import { blockageAlertsStore } from "@/lib/blockageAlerts";
import { assignedRoutesStore, blockagesStore, busesStore } from "@/lib/backend";
import { mapAlternativeRoute, mapTowAssignment } from "@/lib/mappers";
import { useStore } from "@/lib/store";
import type { AlternativeRoute, BlockageAlert, TowAssignment } from "@/types/routing";

/** Bloqueos, rutas alternativas y grúas. Todo viene del back vía `lib/backend.ts` (docs/API.md). */

function usePlateOf(): (busId: string) => string {
  const buses = useStore(busesStore);
  return useMemo(() => {
    const plates = new Map(buses.map((b) => [b.id, b.plate]));
    return (busId: string) => plates.get(busId) ?? "—";
  }, [buses]);
}

/** Todas las rutas alternativas, de la más nueva a la más vieja (solo ADMIN). */
export function useAlternativeRoutes(): AlternativeRoute[] {
  const blockages = useStore(blockagesStore);
  const plateOf = usePlateOf();
  return useMemo(
    () =>
      blockages
        .flatMap((b) => (b.alternativeRoutes ?? []).map((r) => mapAlternativeRoute(r, b, plateOf)))
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn)),
    [blockages, plateOf],
  );
}

export function useIncidentRoutes(incidentId: string): AlternativeRoute[] {
  const routes = useAlternativeRoutes();
  return useMemo(() => routes.filter((r) => r.incidentId === incidentId), [routes, incidentId]);
}

export function useIncidentTows(incidentId: string): TowAssignment[] {
  const blockages = useStore(blockagesStore);
  const plateOf = usePlateOf();
  return useMemo(() => {
    const blockage = blockages.find((b) => b.id === incidentId);
    return (blockage?.towAssignments ?? [])
      .map((t) => mapTowAssignment(t, plateOf))
      .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  }, [blockages, incidentId, plateOf]);
}

/** Rutas asignadas al conductor que inició sesión (`GET /assistance/routes/assigned/me`). */
export function useMyAssignedRoutes(): AlternativeRoute[] {
  const routes = useStore(assignedRoutesStore);
  const plateOf = usePlateOf();
  return useMemo(() => routes.map((r) => mapAlternativeRoute(r, r.incident, plateOf)), [routes, plateOf]);
}

/** Avisos de bloqueo que recibió el conductor y aún no descartó. */
export function useBlockageAlerts(): BlockageAlert[] {
  return useStore(blockageAlertsStore);
}

/** Conductores a los que se les puede asignar una ruta: los buses que tienen conductor. */
export function useAssignableDrivers(): { driverId: string; label: string }[] {
  const buses = useStore(busesStore);
  return useMemo(
    () =>
      buses
        .filter((b) => b.driverId)
        .map((b) => ({ driverId: b.driverId as string, label: `${b.plate} · ${b.driver ?? "Conductor"}` })),
    [buses],
  );
}
