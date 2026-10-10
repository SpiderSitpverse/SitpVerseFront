/** Tipos del front para bloqueos, rutas alternativas y grúas (se traducen desde `types/api.ts` en `lib/mappers.ts`). */

/** Un punto del mapa: `[latitud, longitud]`, el orden que usa Leaflet. */
export type LatLngTuple = [number, number];

export type RouteState = "propuesta" | "asignada" | "aceptada";

export interface AlternativeRoute {
  id: string;
  incidentId: string;
  nombre: string;
  estado: RouteState;
  puntos: LatLngTuple[];
  /** Id de usuario del conductor al que se asignó (si ya se asignó). */
  conductorId?: string;
  creadaEn: string;
  incidente?: { titulo: string; descripcion: string; placa?: string };
}

export type TowState = "asignada" | "en-curso" | "completada";

export interface TowAssignment {
  id: string;
  incidentId: string;
  busId: string;
  placa?: string;
  grua: string;
  cuadrilla: string;
  estado: TowState;
  creadoEn: string;
  completadoEn?: string;
  incidente?: { titulo: string; descripcion: string };
}

/** Aviso de bloqueo que recibió el conductor (`blockage.alerted`). */
export interface BlockageAlert {
  /** `eventId` del evento: evita duplicados al reconectar. */
  id: string;
  incidentId: string;
  busId?: string;
  placa?: string;
  tipo: string;
  descripcion: string;
  recibidaEn: string;
}
