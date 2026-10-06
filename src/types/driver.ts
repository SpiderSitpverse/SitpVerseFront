export type Role = "admin" | "conductor" | "mecanico";

export interface AssignedRoute {
  driverId: string;
  busId: string;
  placa: string;
  troncal: string;
  /** El back aún no maneja turnos: si no vienen, la pantalla no los muestra. */
  turno?: string;
  horaSalida?: string;
}

export interface ActiveTrip {
  busId: string;
  placa: string;
  troncal: string;
  driverId: string;
  driverName: string;
  startedAt: string;
  lat?: number;
  lng?: number;
}

export type HelpRequestStatus = "pendiente" | "aceptada";

export interface HelpRequest {
  id: string;
  busId: string;
  placa: string;
  driverId: string;
  driverName: string;
  motivo: string;
  detalle: string;
  createdAt: string;
  status: HelpRequestStatus;
  aceptadoPor?: string;
}
