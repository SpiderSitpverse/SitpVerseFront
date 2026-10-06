import { useEffect, useRef, useState } from "react";
import { snapToRoute, type LatLng } from "@/lib/routeSnap";

const ANIMATION_MS = 900;

/**
 * Posición para DIBUJAR un bus a partir de las lecturas que llegan cada pocos segundos:
 *  1. si va claramente por su troncal (a menos de 35 m de su línea) se pega a ella; en un patio o una calle
 *     cualquiera se deja donde está;
 *  2. el marcador se anima entre una posición y la siguiente, en vez de teletransportarse.
 * El ruido del GPS ya se filtra en el teléfono del conductor (ver `lib/gpsFilter.ts`) antes de enviar la posición;
 * la posición guardada en el back es esa, sin ajuste a la ruta.
 */
export function useSmoothPosition(lat: number | undefined, lng: number | undefined, routeName: string): LatLng | null {
  const shown = useRef<LatLng | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const raw: LatLng = [lat, lng];
    const next = snapToRoute(raw, routeName)?.point ?? raw;

    const from = shown.current;
    if (!from) {
      shown.current = next;
      setPosition(next);
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ANIMATION_MS);
      const ease = 1 - Math.pow(1 - k, 3);
      const current: LatLng = [from[0] + (next[0] - from[0]) * ease, from[1] + (next[1] - from[1]) * ease];
      shown.current = current;
      setPosition(current);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lat, lng, routeName]);

  return position;
}
