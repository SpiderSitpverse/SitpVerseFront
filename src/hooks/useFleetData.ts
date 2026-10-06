import type { Bus, FleetSummary, Incident } from "@/types/bus";
import type { AssignedRoute } from "@/types/driver";
import type { StaffMember } from "@/types/user";

/**
 * Puntos de conexión con el back (contrato en SitpVerseBack/docs/API.md).
 * Hoy devuelven vacío: al conectar, cada hook carga con su GET (y se refresca por
 * WebSocket cuando aplica) sin tocar las pantallas, que ya manejan el estado vacío.
 */

const NO_BUSES: Bus[] = [];
const NO_INCIDENTS: Incident[] = [];
const NO_STAFF: StaffMember[] = [];

/** GET /fleet/buses — lat/lng salen de `latitude`/`longitude`. */
export function useBuses(): Bus[] {
  return NO_BUSES;
}

/** GET /fleet/summary + GET /assistance/summary. */
export function useFleetSummary(): FleetSummary | null {
  return null;
}

/** GET /fleet/home/operativo — el bus asignado al conductor que inició sesión. */
export function useAssignedRoute(): AssignedRoute | null {
  return null;
}

/** GET /assistance/incidents. */
export function useIncidents(): Incident[] {
  return NO_INCIDENTS;
}

/** GET /users (solo ADMIN). */
export function useStaff(): StaffMember[] {
  return NO_STAFF;
}
