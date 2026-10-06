import { useMemo } from "react";
import { callsStore, repairReportsStore } from "@/lib/backend";
import { mapRepairReport, mapRepairRequest } from "@/lib/mappers";
import { useStore } from "@/lib/store";
import type { RepairReport, RepairRequest } from "@/types/repair";

/** Alertas de reparación (`kind: REPAIR`): GET /assistance/calls. */
export function useRepairRequests(): RepairRequest[] {
  const calls = useStore(callsStore);
  return useMemo(() => calls.filter((c) => c.kind === "REPAIR").map(mapRepairRequest), [calls]);
}

/** Informes de reparación: GET /assistance/repair-reports (el mecánico ve los suyos, el admin todos). */
export function useRepairReports(): RepairReport[] {
  const reports = useStore(repairReportsStore);
  const calls = useStore(callsStore);
  return useMemo(() => {
    const busOfCall = new Map(calls.map((c) => [c.id, c.busId]));
    return reports.map((r) => mapRepairReport(r, busOfCall.get(r.callId) ?? ""));
  }, [reports, calls]);
}
