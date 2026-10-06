import type { RepairReport, RepairRequest } from "@/types/repair";

/**
 * Same shape as FleetActivityClient (see fleetActivityClient.ts): an
 * interface backed by localStorage today, swappable for a real backend
 * later without touching any component — everything goes through the hooks
 * in useRepairs.ts, never localStorage directly.
 */
export interface RepairClient {
  getRequests(): RepairRequest[];
  acceptRequest(id: string, mecanicoId: string, mecanicoNombre: string): void;
  getReports(): RepairReport[];
  getReport(requestId: string): RepairReport | undefined;
  /** Upserts the report without touching the request's estado — progress is kept, service stays open. */
  saveDraft(report: RepairReport): void;
  /** Upserts the report and marks the request "completada" — this is what closes out the service. */
  finalizeReport(report: RepairReport): void;
  subscribe(callback: () => void): () => void;
}

const REQUESTS_KEY = "sitpverse.repairRequests";
const REPORTS_KEY = "sitpverse.repairReports";
const LOCAL_CHANGE_EVENT = "sitpverse:repair-changed";

function readList<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function writeList<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

class LocalStorageRepairClient implements RepairClient {
  private seedRequests: RepairRequest[];

  constructor(seedRequests: RepairRequest[]) {
    this.seedRequests = seedRequests;
  }

  getRequests(): RepairRequest[] {
    return readList<RepairRequest>(REQUESTS_KEY, this.seedRequests);
  }

  acceptRequest(id: string, mecanicoId: string, mecanicoNombre: string): void {
    writeList(
      REQUESTS_KEY,
      this.getRequests().map((r) =>
        r.id === id && r.estado === "pendiente"
          ? { ...r, estado: "aceptada" as const, mecanicoId, mecanicoNombre, aceptadaEn: new Date().toISOString() }
          : r,
      ),
    );
  }

  getReports(): RepairReport[] {
    return readList<RepairReport>(REPORTS_KEY, []);
  }

  getReport(requestId: string): RepairReport | undefined {
    return this.getReports().find((r) => r.requestId === requestId);
  }

  saveDraft(report: RepairReport): void {
    const reports = this.getReports();
    const idx = reports.findIndex((r) => r.requestId === report.requestId);
    const next = idx === -1 ? [report, ...reports] : reports.map((r, i) => (i === idx ? report : r));
    writeList(REPORTS_KEY, next);
  }

  finalizeReport(report: RepairReport): void {
    this.saveDraft(report);
    writeList(
      REQUESTS_KEY,
      this.getRequests().map((r) => (r.id === report.requestId ? { ...r, estado: "completada" as const } : r)),
    );
  }

  subscribe(callback: () => void): () => void {
    function onStorage(e: StorageEvent) {
      if (e.key === REQUESTS_KEY || e.key === REPORTS_KEY) callback();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
    };
  }
}

/** TODO: reemplazar por la implementación contra el back (ver docs/API.md, flujo de reparaciones). */
export const repairClient: RepairClient = new LocalStorageRepairClient([]);
