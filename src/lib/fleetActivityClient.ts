import type { ActiveTrip, HelpRequest } from "@/types/driver";

/**
 * Contract for fleet activity (active trips + driver help requests). The
 * localStorage implementation below is a stand-in for a real backend —
 * swap it for one backed by REST/WebSocket calls without touching any
 * component: everything consumes this interface (via the hooks in
 * useFleetActivity.ts), never localStorage directly.
 */
export interface FleetActivityClient {
  getActiveTrips(): ActiveTrip[];
  startTrip(trip: ActiveTrip): void;
  endTrip(busId: string): void;

  getHelpRequests(): HelpRequest[];
  createHelpRequest(request: Omit<HelpRequest, "id" | "createdAt" | "status">): HelpRequest;
  acceptHelpRequest(id: string, acceptedBy: string): void;

  /** Fires on any mutation, from this tab or another (via the storage event). */
  subscribe(callback: () => void): () => void;
}

const ACTIVE_TRIPS_KEY = "sitpverse.activeTrips";
const HELP_REQUESTS_KEY = "sitpverse.helpRequests";
const LOCAL_CHANGE_EVENT = "sitpverse:fleet-activity-changed";

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]) {
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

class LocalStorageFleetActivityClient implements FleetActivityClient {
  getActiveTrips(): ActiveTrip[] {
    return readList<ActiveTrip>(ACTIVE_TRIPS_KEY);
  }

  startTrip(trip: ActiveTrip): void {
    const trips = this.getActiveTrips().filter((t) => t.busId !== trip.busId);
    trips.push(trip);
    writeList(ACTIVE_TRIPS_KEY, trips);
  }

  endTrip(busId: string): void {
    writeList(
      ACTIVE_TRIPS_KEY,
      this.getActiveTrips().filter((t) => t.busId !== busId),
    );
  }

  getHelpRequests(): HelpRequest[] {
    return readList<HelpRequest>(HELP_REQUESTS_KEY);
  }

  createHelpRequest(request: Omit<HelpRequest, "id" | "createdAt" | "status">): HelpRequest {
    const fullRequest: HelpRequest = {
      ...request,
      id: `hr-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      status: "pendiente",
    };
    writeList(HELP_REQUESTS_KEY, [fullRequest, ...this.getHelpRequests()]);
    return fullRequest;
  }

  acceptHelpRequest(id: string, acceptedBy: string): void {
    writeList(
      HELP_REQUESTS_KEY,
      this.getHelpRequests().map((r) => (r.id === id ? { ...r, status: "aceptada", aceptadoPor: acceptedBy } : r)),
    );
  }

  subscribe(callback: () => void): () => void {
    function onStorage(e: StorageEvent) {
      if (e.key === ACTIVE_TRIPS_KEY || e.key === HELP_REQUESTS_KEY) callback();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_CHANGE_EVENT, callback);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
    };
  }
}

export const fleetActivityClient: FleetActivityClient = new LocalStorageFleetActivityClient();
