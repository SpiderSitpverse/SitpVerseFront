import { troncales } from "@/data/routes";
import { distanceMeters, type LatLng } from "@/lib/routeSnap";

/** Hasta esta distancia a una estación se dice "Cerca de <estación>"; más lejos se muestran las coordenadas. */
const NEAR_STATION_METERS = 700;

export interface NearStation {
  name: string;
  meters: number;
}

/** Estación o portal de troncal más cercano a un punto (o `null` si no hay datos). */
export function nearestStation(point: LatLng): NearStation | null {
  let best: NearStation | null = null;
  for (const troncal of troncales) {
    for (const stop of [...troncal.estaciones, ...troncal.portales]) {
      const meters = distanceMeters(point, stop.coords);
      if (!best || meters < best.meters) best = { name: stop.nombre, meters };
    }
  }
  return best;
}

/**
 * Texto de dónde está un bus según su POSICIÓN real. La etiqueta fija de la ficha ("Portal Eldorado", "Patio…") solo
 * dice dónde se registró el bus; si el bus anda por otro lado, esa etiqueta miente.
 */
export function describePosition(lat: number, lng: number): string {
  const station = nearestStation([lat, lng]);
  if (station && station.meters <= NEAR_STATION_METERS) return `Cerca de ${station.name}`;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
