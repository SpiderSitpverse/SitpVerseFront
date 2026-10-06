import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { busesStore, callsStore, homeStore } from "@/lib/backend";
import { mapActiveTrip, mapHelpRequest } from "@/lib/mappers";
import { useStore } from "@/lib/store";
import type { ActiveTrip, HelpRequest } from "@/types/driver";

/** Buses con viaje en curso (`status: IN_SERVICE`). El conductor solo ve el suyo. */
export function useActiveTrips(): ActiveTrip[] {
  const buses = useStore(busesStore);
  return useMemo(() => buses.filter((b) => b.status === "IN_SERVICE").map(mapActiveTrip), [buses]);
}

/** Alertas de apoyo entre conductores (`kind: DRIVER_SUPPORT`) que sigan abiertas o en curso. */
export function useHelpRequests(): HelpRequest[] {
  const calls = useStore(callsStore);
  const home = useStore(homeStore);
  const { userId, nombre } = useAuth();
  return useMemo(() => {
    if (!userId) return [];
    const me = { id: userId, nombre: nombre ?? "Tú", busId: home?.busId };
    return calls
      .filter((c) => c.kind === "DRIVER_SUPPORT" && c.status !== "COMPLETED")
      .map((c) => mapHelpRequest(c, me));
  }, [calls, home, userId, nombre]);
}
