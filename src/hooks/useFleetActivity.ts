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

/**
 * Alertas de apoyo entre conductores (`kind: DRIVER_SUPPORT`) que le importan a ESTE conductor:
 *  - las abiertas (todavía puede ayudar);
 *  - las que él tomó;
 *  - las de su propio bus (para saber que le llegó ayuda).
 * Una alerta que otro conductor ya tomó (cupos llenos) o que ya terminó "se quita" de su lista. El back ya manda
 * solo esas; el filtro de aquí hace que desaparezca al instante, sin esperar al siguiente refresco.
 */
export function useHelpRequests(): HelpRequest[] {
  const calls = useStore(callsStore);
  const home = useStore(homeStore);
  const { userId, nombre } = useAuth();
  return useMemo(() => {
    if (!userId) return [];
    const me = { id: userId, nombre: nombre ?? "Tú", busId: home?.busId };
    return calls
      .filter((c) => c.kind === "DRIVER_SUPPORT" && c.status !== "COMPLETED")
      .filter(
        (c) =>
          c.status === "OPEN" ||
          c.busId === me.busId ||
          c.claims.some((claim) => claim.userId === userId && claim.status === "ACTIVE"),
      )
      .map((c) => mapHelpRequest(c, me));
  }, [calls, home, userId, nombre]);
}
