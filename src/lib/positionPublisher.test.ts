import { describe, expect, it } from "vitest";
import type { GpsFix } from "@/lib/gpsFilter";
import { PositionPublisher } from "@/lib/positionPublisher";
import { distanceMeters, type LatLng } from "@/lib/routeSnap";

const HOME: LatLng = [4.586, -74.146];
const M_LAT = 110_540;
const M_LNG = 111_320 * Math.cos((4.58 * Math.PI) / 180);
/** Punto a `n` metros al norte y `e` al este de casa. */
const at = (n: number, e: number): LatLng => [HOME[0] + n / M_LAT, HOME[1] + e / M_LNG];

/** Generador pseudoaleatorio con semilla: las pruebas son repetibles. */
function rng(seed: number) {
  let s = seed;
  const next = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  return () => Math.sqrt(-2 * Math.log(next() + 1e-12)) * Math.cos(2 * Math.PI * next());
}

function run(readings: GpsFix[]) {
  const publisher = new PositionPublisher();
  publisher.reset(0);
  const published: { t: number; at: LatLng }[] = [];
  const states: string[] = [];
  for (const reading of readings) {
    const update = publisher.push(reading, reading.timestamp);
    states.push(update.state);
    if (update.publish) published.push({ t: reading.timestamp, at: update.publish });
  }
  return { published, states };
}

const IP_LOCATION: LatLng = [4.742, -74.052];
const wifi = (gauss: () => number, t: number, accuracy = 60): GpsFix => {
  const [lat, lng] = at(gauss() * 25, gauss() * 25);
  return { lat, lng, accuracy, timestamp: t * 3000, speed: null };
};
const ipReading = (gauss: () => number, t: number, accuracy: number): GpsFix => ({
  lat: IP_LOCATION[0] + gauss() * 0.0005,
  lng: IP_LOCATION[1] + gauss() * 0.0005,
  accuracy,
  timestamp: t * 3000,
  speed: null,
});

describe("PositionPublisher", () => {
  it("espera una lectura buena antes de publicar la primera posición", () => {
    const gauss = rng(1);
    const { states, published } = run(Array.from({ length: 3 }, (_, t) => wifi(gauss, t, 400)));
    expect(states.every((s) => s === "searching")).toBe(true);
    expect(published).toHaveLength(0);
  });

  it("con una lectura buena publica de inmediato y queda como ancla", () => {
    const gauss = rng(2);
    const { published } = run([wifi(gauss, 0, 10)]);
    expect(published).toHaveLength(1);
    expect(distanceMeters(published[0].at, HOME)).toBeLessThan(60);
  });

  it("si nunca llega una lectura buena, tras la espera usa la mejor que vio", () => {
    const gauss = rng(3);
    const { published } = run(Array.from({ length: 40 }, (_, t) => wifi(gauss, t, 900)));
    expect(published.length).toBeGreaterThan(0);
  });

  it("quieto con ruido: publica muy poco (la zona muerta absorbe el ruido)", () => {
    const gauss = rng(4);
    const { published } = run(Array.from({ length: 120 }, (_, t) => wifi(gauss, t)));
    expect(published.length).toBeLessThan(30);
    expect(published.every((p) => distanceMeters(p.at, HOME) < 150)).toBe(true);
  });

  it("un bus en marcha con velocidad reportada publica casi cada lectura y va pegado al bus", () => {
    const gauss = rng(5);
    const readings: GpsFix[] = Array.from({ length: 60 }, (_, t) => {
      const [lat, lng] = at(24 * t + gauss() * 6, gauss() * 6);
      return { lat, lng, accuracy: 8, timestamp: t * 3000, speed: 8 };
    });
    const { published, states } = run(readings);
    expect(published.length).toBeGreaterThanOrEqual(50);
    expect(states.slice(5).every((s) => s === "moving")).toBe(true);
    expect(distanceMeters(published.at(-1)!.at, at(24 * 59, 0))).toBeLessThan(40);
  });

  describe("lecturas que no sirven", () => {
    it("la ubicación por IP (miles de metros de margen, a 20 km) NUNCA se publica y al volver la wifi sigue en casa", () => {
      const gauss = rng(6);
      const readings = [
        ...Array.from({ length: 40 }, (_, t) => wifi(gauss, t)),
        ...Array.from({ length: 60 }, (_, t) => ipReading(gauss, 40 + t, 4000)),
        ...Array.from({ length: 20 }, (_, t) => wifi(gauss, 100 + t)),
      ];
      const { published } = run(readings);
      expect(published.filter((p) => distanceMeters(p.at, HOME) > 2000)).toHaveLength(0);
      expect(distanceMeters(published.at(-1)!.at, HOME)).toBeLessThan(150);
    });

    it("un salto imposible aunque diga ±30 m se ignora si dura pocas lecturas", () => {
      const gauss = rng(7);
      const readings = [
        ...Array.from({ length: 40 }, (_, t) => wifi(gauss, t)),
        ...Array.from({ length: 3 }, (_, t) => ipReading(gauss, 40 + t, 30)),
        ...Array.from({ length: 30 }, (_, t) => wifi(gauss, 43 + t)),
      ];
      expect(run(readings).published.filter((p) => distanceMeters(p.at, HOME) > 2000)).toHaveLength(0);
    });

    it("si el salto se sostiene 6 lecturas seguidas se acepta como reubicación real, y no antes", () => {
      const gauss = rng(8);
      const readings = [
        ...Array.from({ length: 40 }, (_, t) => wifi(gauss, t)),
        ...Array.from({ length: 30 }, (_, t) => ipReading(gauss, 40 + t, 30)),
      ];
      const moved = run(readings).published.filter((p) => distanceMeters(p.at, IP_LOCATION) < 500);
      expect(moved.length).toBeGreaterThan(0);
      expect(moved[0].t / 3000 - 40).toBeGreaterThanOrEqual(5);
    });

    it("un dispositivo que solo da lecturas imprecisas igual publica", () => {
      const gauss = rng(9);
      expect(run(Array.from({ length: 40 }, (_, t) => wifi(gauss, t, 900))).published.length).toBeGreaterThan(0);
    });

    it("una lectura suelta de 600 m de margen no mueve al bus", () => {
      const readings: GpsFix[] = [];
      for (let t = 0; t < 40; t++) {
        const [lat, lng] = t === 30 ? IP_LOCATION : at(24 * t, 0);
        readings.push({ lat, lng, accuracy: t === 30 ? 600 : 10, timestamp: t * 3000, speed: 8 });
      }
      expect(run(readings).published.filter((p) => distanceMeters(p.at, IP_LOCATION) < 2000)).toHaveLength(0);
    });
  });

  describe("punto marcado a mano (pin)", () => {
    it("se publica ya y las lecturas imprecisas y sin movimiento no lo arrastran de vuelta", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      const pinned = publisher.pin(HOME, 0);
      expect(pinned).toEqual(HOME);
      const gauss = rng(10);
      let moved = 0;
      for (let t = 1; t < 30; t++) {
        const [lat, lng] = at(gauss() * 200, gauss() * 200);
        const update = publisher.push({ lat, lng, accuracy: 300, timestamp: t * 3000, speed: null }, t * 3000);
        if (update.publish && distanceMeters(update.publish, HOME) > 100) moved++;
      }
      expect(moved).toBe(0);
    });

    it("un GPS bueno libera el pin", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      publisher.pin(HOME, 0);
      const far = at(500, 500);
      let last: LatLng | null = null;
      for (let t = 1; t < 30; t++) {
        const update = publisher.push({ lat: far[0], lng: far[1], accuracy: 5, timestamp: t * 3000, speed: 8 }, t * 3000);
        if (update.publish) last = update.publish;
      }
      expect(last && distanceMeters(last, far)).toBeLessThan(100);
    });
  });

  describe("latido (keepAlive)", () => {
    it("sin posición conocida todavía no hay nada que repetir", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      expect(publisher.keepAlive(60_000)).toBeNull();
    });

    it("un bus quieto repite la última posición pasado el plazo, y solo entonces", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      publisher.pin(HOME, 0);
      expect(publisher.keepAlive(7_999)).toBeNull();
      expect(publisher.keepAlive(8_000)).toEqual(HOME);
      expect(publisher.keepAlive(12_000)).toBeNull(); // acaba de repetirse
      expect(publisher.keepAlive(16_000)).toEqual(HOME);
    });

    it("mantiene el bus por debajo de los 15 s de «Sin señal» aunque no se mueva", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      publisher.pin(HOME, 0);
      let last = 0;
      for (let t = 0; t <= 120_000; t += 2_000) {
        if (publisher.keepAlive(t)) last = t;
        expect(t - last).toBeLessThan(15_000);
      }
    });

    it("reset() olvida la posición: ya no repite la del viaje anterior", () => {
      const publisher = new PositionPublisher();
      publisher.reset(0);
      publisher.pin(HOME, 0);
      publisher.reset(1_000);
      expect(publisher.keepAlive(60_000)).toBeNull();
    });
  });

  it("reset() empieza de cero (nuevo viaje)", () => {
    const gauss = rng(11);
    const publisher = new PositionPublisher();
    publisher.reset(0);
    publisher.push(wifi(gauss, 0, 10), 0);
    publisher.reset(10_000);
    const update = publisher.push({ ...wifi(gauss, 4, 400), timestamp: 10_000 }, 10_000);
    expect(update.state).toBe("searching");
  });
});
