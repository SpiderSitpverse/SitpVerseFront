import { useEffect, useState } from "react";
import { busReportClient } from "@/lib/busReportClient";
import type { BusReport } from "@/types/bus";

/** La inspección más reciente de un bus. Al conectar: GET /inspections/buses/:id/latest. */
export function useBusReport(busId: string | undefined): BusReport | undefined {
  const [, bump] = useState(0);

  useEffect(() => {
    return busReportClient.subscribe(() => bump((n) => n + 1));
  }, []);

  if (!busId) return undefined;
  return busReportClient.getReport(busId);
}
