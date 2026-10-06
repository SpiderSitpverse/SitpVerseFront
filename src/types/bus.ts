export type BusStatus = "operacion" | "mantenimiento" | "fuera-servicio";

export interface Bus {
  id: string;
  placa: string;
  troncal: string;
  ubicacion: string;
  estado: BusStatus;
  modelo?: string;
  anio?: number;
  operador?: string;
  capacidad?: number;
  ultimaActualizacion?: string;
  lat?: number;
  lng?: number;
}

export interface FleetSummary {
  total: number;
  enOperacion: number;
  incidentesHoy: number;
}

export interface BusReport {
  nombre: string;
  rol: string;
  fecha: string;
  nota: string;
  comentario: string;
  fotos: string[];
}

export type IncidentSeverity = "critico" | "alerta" | "info";

export type IncidentState = "reportado" | "ayuda-solicitada";

export interface Incident {
  id: string;
  busId: string;
  placa: string;
  titulo: string;
  descripcion: string;
  reportadoPor: string;
  severidad: IncidentSeverity;
  estado: IncidentState;
  /** ISO de cuando se reportó. */
  creadoEn: string;
}
