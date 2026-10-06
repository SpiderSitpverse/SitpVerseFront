import { troncales, type TroncalRoute } from "@/data/routes";

/**
 * "Map matching" propio: los buses de TransMilenio van por troncales fijas, así que una lectura GPS ruidosa
 * (que salta entre calles) se proyecta sobre la línea de la troncal del bus. No hace falta ningún servicio externo.
 *
 * Solo corrige cuando el bus está CLARAMENTE sobre la troncal (a `MAX_SNAP_METERS` o menos de su línea, que además
 * une estaciones con tramos rectos y no las calles exactas). Más lejos —patios, calles laterales, desvíos— se muestra
 * la posición real tal cual: lo que importa es ver dónde va el bus, no forzarlo a una línea.
 */
export const MAX_SNAP_METERS = 35;

export type LatLng = [number, number];

export interface SnapResult {
  point: LatLng;
  /** Distancia en metros entre la lectura original y la línea. */
  distance: number;
  /** Troncal a la que se pegó. */
  troncalId: string;
}

const METERS_PER_DEG_LAT = 110_540;
const METERS_PER_DEG_LNG = 111_320;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\btroncal\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nombres con los que el bus llama a su ruta y que no aparecen igual en el mapa. */
const ALIASES: Record<string, string> = {
  autonorte: "autopista norte",
  americas: "av americas",
};

/**
 * Troncales posibles para el nombre de ruta de un bus. Puede haber más de una ("NQS" → central y sur): luego
 * se pega a la más cercana.
 */
export function troncalesFor(routeName: string): TroncalRoute[] {
  const raw = normalize(routeName);
  if (!raw) return [];
  const wanted = ALIASES[raw] ?? raw;
  return troncales.filter((t) => {
    const name = normalize(t.nombre);
    return name === wanted || name.includes(wanted) || wanted.includes(name);
  });
}

/** Punto más cercano de un segmento A→B a un origen (0,0); coordenadas planas en metros. */
function closestOnSegment(ax: number, ay: number, bx: number, by: number): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

/** Pega `point` a la línea más cercana de las dadas. `null` si ninguna queda a menos de `maxMeters`. */
export function snapToLines(
  point: LatLng,
  lines: { id: string; coords: LatLng[] }[],
  maxMeters = MAX_SNAP_METERS,
): SnapResult | null {
  const [lat, lng] = point;
  const kx = METERS_PER_DEG_LNG * Math.cos((lat * Math.PI) / 180);
  let best: { x: number; y: number; d: number; id: string } | null = null;

  for (const line of lines) {
    for (let i = 0; i < line.coords.length - 1; i++) {
      const ax = (line.coords[i][1] - lng) * kx;
      const ay = (line.coords[i][0] - lat) * METERS_PER_DEG_LAT;
      const bx = (line.coords[i + 1][1] - lng) * kx;
      const by = (line.coords[i + 1][0] - lat) * METERS_PER_DEG_LAT;
      const c = closestOnSegment(ax, ay, bx, by);
      const d = Math.hypot(c.x, c.y);
      if (!best || d < best.d) best = { ...c, d, id: line.id };
    }
  }

  if (!best || best.d > maxMeters) return null;
  return {
    point: [lat + best.y / METERS_PER_DEG_LAT, lng + best.x / kx],
    distance: best.d,
    troncalId: best.id,
  };
}

/** Pega la posición de un bus a su troncal (por el nombre de su ruta). `null` = no se pudo o está lejos. */
export function snapToRoute(point: LatLng, routeName: string): SnapResult | null {
  const lines = troncalesFor(routeName);
  return lines.length === 0 ? null : snapToLines(point, lines);
}

/** Distancia aproximada en metros entre dos puntos cercanos. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const kx = METERS_PER_DEG_LNG * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot((b[1] - a[1]) * kx, (b[0] - a[0]) * METERS_PER_DEG_LAT);
}
