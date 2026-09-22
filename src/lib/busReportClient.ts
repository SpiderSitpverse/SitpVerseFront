import type { BusReport } from "@/types/bus";

/**
 * Live, driver-submitted bus reports — same shape as the seeded ones in
 * data/buses.ts, but written at runtime (pre-trip inspections). Same
 * localStorage-backed, swappable-for-a-real-backend pattern as the other
 * clients in this app.
 */
export interface BusReportClient {
  getReport(busId: string): BusReport | undefined;
  saveReport(busId: string, report: BusReport): void;
  subscribe(callback: () => void): () => void;
}

const REPORTS_KEY = "sitpverse.liveBusReports";
const LOCAL_CHANGE_EVENT = "sitpverse:bus-report-changed";

function readMap(): Record<string, BusReport> {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, BusReport>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, BusReport>) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

class LocalStorageBusReportClient implements BusReportClient {
  getReport(busId: string): BusReport | undefined {
    return readMap()[busId];
  }

  saveReport(busId: string, report: BusReport): void {
    writeMap({ ...readMap(), [busId]: report });
  }

  subscribe(callback: () => void): () => void {
    function onStorage(e: StorageEvent) {
      if (e.key === REPORTS_KEY) callback();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
    };
  }
}

export const busReportClient: BusReportClient = new LocalStorageBusReportClient();
