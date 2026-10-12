import { toAbsoluteUrl } from "@/lib/api";
import type {
  ApiAlternativeRoute,
  ApiBus,
  ApiCall,
  ApiIncident,
  ApiInspection,
  ApiOperativeHome,
  ApiRepairReport,
  ApiRole,
  ApiTowAssignment,
  ApiUser,
} from "@/types/api";
import type { Bus, BusReport, Incident } from "@/types/bus";
import type { ActiveTrip, AssignedRoute, HelpRequest, Role } from "@/types/driver";
import type { RepairReport, RepairRequest } from "@/types/repair";
import type { AlternativeRoute, LatLngTuple, RouteState, TowAssignment, TowState } from "@/types/routing";
import type { StaffMember } from "@/types/user";

/** Traducciones entre el contrato del back y los tipos del front (tabla en docs/API.md §3). */

export const ROLE_FROM_API: Record<ApiRole, Role> = {
  ADMIN: "admin",
  DRIVER: "conductor",
  MECHANICAL: "mecanico",
};

export const ROLE_LABEL: Record<ApiRole, string> = {
  ADMIN: "Administrador",
  DRIVER: "Conductor",
  MECHANICAL: "Mecánico",
};

function num(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** `mantenimiento` = el bus tiene una alerta de reparación abierta o en curso (OPEN/FILLED). */
export function mapBus(bus: ApiBus, repairBusIds: Set<string>): Bus {
  const estado = bus.status === "IN_SERVICE" ? "operacion" : repairBusIds.has(bus.id) ? "mantenimiento" : "fuera-servicio";
  return {
    id: bus.id,
    placa: bus.plate,
    troncal: bus.route,
    ubicacion: bus.locationLabel ?? "Sin ubicación",
    estado,
    modelo: bus.model ?? undefined,
    anio: bus.year ?? undefined,
    operador: bus.operator ?? undefined,
    capacidad: bus.capacity ?? undefined,
    foto: bus.photoUrl ? toAbsoluteUrl(bus.photoUrl) : undefined,
    ultimaActualizacion: formatDateTime(bus.updatedAt),
    lat: num(bus.latitude),
    lng: num(bus.longitude),
  };
}

export function mapActiveTrip(bus: ApiBus): ActiveTrip {
  return {
    busId: bus.id,
    placa: bus.plate,
    troncal: bus.route,
    driverId: bus.driverId ?? "",
    driverName: bus.driver ?? "Conductor",
    startedAt: bus.tripStartedAt ?? bus.updatedAt,
    lat: num(bus.latitude),
    lng: num(bus.longitude),
  };
}

export function mapAssignedRoute(home: ApiOperativeHome, driverId: string): AssignedRoute {
  return { driverId, busId: home.busId, placa: home.plate, troncal: home.route };
}

/** Una alerta de apoyo entre conductores. `mine` = es del bus del propio conductor. */
export function mapHelpRequest(call: ApiCall, me: { id: string; nombre: string; busId?: string }): HelpRequest {
  const active = call.claims.filter((c) => c.status === "ACTIVE");
  const mineClaim = active.find((c) => c.userId === me.id);
  const accepted = call.status !== "OPEN" || Boolean(mineClaim);
  const first = mineClaim ?? active[0];
  return {
    id: call.id,
    busId: call.busId,
    placa: call.bus?.plate ?? "—",
    driverId: call.busId === me.busId ? me.id : "",
    driverName: call.incident?.reportedByName ?? call.bus?.driverName ?? "Conductor",
    motivo: call.incident?.type ?? "Solicitud de ayuda",
    detalle: call.incident?.description ?? call.description ?? "",
    createdAt: call.createdAt,
    status: accepted ? "aceptada" : "pendiente",
    aceptadoPor: accepted ? (first ? (first.userId === me.id ? me.nombre : first.userName) : undefined) : undefined,
  };
}

export function mapRepairRequest(call: ApiCall): RepairRequest {
  const claim = call.claims.find((c) => c.status === "ACTIVE");
  return {
    id: call.id,
    busId: call.busId,
    placa: call.bus?.plate ?? "—",
    troncal: call.bus?.route ?? "—",
    ubicacion: call.bus?.locationLabel ?? "Sin ubicación",
    problema: call.description ?? "Sin descripción",
    estado: call.status === "OPEN" ? "pendiente" : call.status === "FILLED" ? "aceptada" : "completada",
    mecanicoId: claim?.userId,
    mecanicoNombre: claim?.userName,
    aceptadaEn: claim?.createdAt,
  };
}

export function mapRepairReport(report: ApiRepairReport, busId: string): RepairReport {
  return {
    requestId: report.callId,
    busId,
    danosEncontrados: report.damages,
    piezasReemplazadas: report.replacedParts,
    gastos: report.expenses ?? [],
    fotosBus: (report.busPhotos ?? []).map(toAbsoluteUrl),
    fotosPiezas: (report.partPhotos ?? []).map(toAbsoluteUrl),
    mecanicoId: report.mechanicId,
    mecanicoNombre: report.mechanicName,
    actualizadoEn: report.updatedAt,
    completadaEn: report.completedAt ?? undefined,
  };
}

export function mapIncident(incident: ApiIncident, plateOf: (busId: string) => string): Incident {
  const reported = incident.status === "REPORTED";
  return {
    id: incident.id,
    busId: incident.busId,
    placa: plateOf(incident.busId),
    titulo: incident.type,
    descripcion: incident.description ?? "",
    reportadoPor: incident.reportedByName ?? "Conductor",
    // Pendiente de gestionar = alerta; con ayuda ya solicitada = informativo.
    severidad: reported ? "alerta" : "info",
    estado: reported ? "reportado" : "ayuda-solicitada",
    creadoEn: incident.createdAt,
  };
}

export function mapStaff(user: ApiUser): StaffMember {
  return {
    id: user.id,
    nombre: user.name,
    rol: ROLE_LABEL[user.role] ?? user.role,
    numeroEmpleado: user.employeeId,
    activo: user.active !== false,
  };
}

export function mapInspection(inspection: ApiInspection): BusReport {
  return {
    nombre: inspection.inspectorName,
    rol: ROLE_LABEL[inspection.inspectorRole as ApiRole] ?? inspection.inspectorRole,
    fecha: formatDateTime(inspection.createdAt),
    nota: inspection.note,
    comentario: inspection.comment || inspection.note,
    fotos: (inspection.photos ?? []).map(toAbsoluteUrl),
  };
}

/**
 * El trazado llega como JSON suelto: se queda solo con los pares `[lat, lng]` numéricos y en rango.
 * Un punto mal formado dibujaría la polilínea de Leaflet en cualquier lado o la rompería.
 */
export function sanitizeGeometry(raw: unknown): LatLngTuple[] {
  if (!Array.isArray(raw)) return [];
  const points: LatLngTuple[] = [];
  for (const point of raw) {
    if (!Array.isArray(point) || point.length !== 2) continue;
    const [lat, lng] = point;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    points.push([lat, lng]);
  }
  return points;
}

const ROUTE_STATE: Record<ApiAlternativeRoute["status"], RouteState> = {
  PROPOSED: "propuesta",
  ASSIGNED: "asignada",
  ACCEPTED: "aceptada",
};

/** `incident` y `plateOf` enriquecen la ruta con el incidente al que pertenece. */
export function mapAlternativeRoute(
  route: ApiAlternativeRoute,
  incident?: Pick<ApiIncident, "type" | "description" | "busId">,
  plateOf?: (busId: string) => string,
): AlternativeRoute {
  return {
    id: route.id,
    incidentId: route.incidentId,
    nombre: route.name,
    estado: ROUTE_STATE[route.status] ?? "propuesta",
    puntos: sanitizeGeometry(route.geometry),
    conductorId: route.assignedToId ?? undefined,
    creadaEn: route.createdAt,
    incidente: incident
      ? { titulo: incident.type, descripcion: incident.description ?? "", placa: plateOf?.(incident.busId) }
      : undefined,
  };
}

const TOW_STATE: Record<ApiTowAssignment["status"], TowState> = {
  ASSIGNED: "asignada",
  IN_PROGRESS: "en-curso",
  COMPLETED: "completada",
};

export function mapTowAssignment(tow: ApiTowAssignment, plateOf?: (busId: string) => string): TowAssignment {
  return {
    id: tow.id,
    incidentId: tow.incidentId,
    busId: tow.busId,
    placa: plateOf?.(tow.busId),
    grua: tow.towTruck,
    cuadrilla: tow.crew,
    estado: TOW_STATE[tow.status] ?? "asignada",
    creadoEn: tow.createdAt,
    completadoEn: tow.completedAt ?? undefined,
    incidente: tow.incident ? { titulo: tow.incident.type, descripcion: tow.incident.description ?? "" } : undefined,
  };
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
