import { useEffect, useState } from "react";
import { busReports as staticBusReports } from "@/data/buses";
import { busReportClient } from "@/lib/busReportClient";
import type { BusReport } from "@/types/bus";

/** The driver's live pre-trip report for a bus, falling back to the seeded mock report. */
export function useBusReport(busId: string | undefined): BusReport | undefined {
  const [, bump] = useState(0);

  useEffect(() => {
    return busReportClient.subscribe(() => bump((n) => n + 1));
  }, []);

  if (!busId) return undefined;
  return busReportClient.getReport(busId) ?? staticBusReports[busId];
}
