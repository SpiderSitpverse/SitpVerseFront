import { useEffect } from "react";
import { inspectionsStore, loadLatestInspection } from "@/lib/backend";
import { useStore } from "@/lib/store";
import type { BusReport } from "@/types/bus";

/** La inspección más reciente de un bus: GET /inspections/buses/:id/latest (se carga al abrir). */
export function useBusReport(busId: string | undefined): BusReport | undefined {
  const reports = useStore(inspectionsStore);

  useEffect(() => {
    if (busId) void loadLatestInspection(busId).catch(() => undefined);
  }, [busId]);

  if (!busId) return undefined;
  return reports[busId] ?? undefined;
}
