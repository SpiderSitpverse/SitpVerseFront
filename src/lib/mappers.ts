import { toAbsoluteUrl } from "@/lib/api";
import type {
  ApiBus,
  ApiCall,
  ApiIncident,
  ApiInspection,
  ApiOperativeHome,
  ApiRepairReport,
  ApiRole,
  ApiUser,
} from "@/types/api";
import type { Bus, BusReport, Incident } from "@/types/bus";
import type { ActiveTrip, AssignedRoute, HelpRequest, Role } from "@/types/driver";
import type { RepairReport, RepairRequest } from "@/types/repair";
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
