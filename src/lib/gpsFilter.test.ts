import { describe, expect, it } from "vitest";
import { GpsFilter } from "@/lib/gpsFilter";
import { distanceMeters } from "@/lib/routeSnap";

const fix = (lat: number, lng: number, accuracy: number, timestamp: number) => ({ lat, lng, accuracy, timestamp });

describe("GpsFilter", () => {
  it("la primera lectura se toma tal cual", () => {
    const filter = new GpsFilter();
    expect(filter.initialized).toBe(false);
    expect(filter.estimate).toBeNull();
    const first = filter.update(fix(4.6, -74.1, 10, 0));
    expect(first).toMatchObject({ lat: 4.6, lng: -74.1 });
    expect(filter.initialized).toBe(true);
    expect(filter.estimate).not.toBeNull();
  });

  it("una lectura imprecisa pesa mucho menos que una precisa", () => {
    const filter = new GpsFilter();
    filter.update(fix(4.6, -74.1, 5, 0));
    const after = filter.update(fix(4.61, -74.1, 800, 1000)); // ~1,1 km de diferencia pero ±800 m de margen
    expect(distanceMeters([after.lat, after.lng], [4.6, -74.1])).toBeLessThan(700);
  });

  it("una lectura precisa arrastra al filtro hacia la nueva posición", () => {
    const filter = new GpsFilter();
    filter.update(fix(4.6, -74.1, 100, 0));
    let last = filter.update(fix(4.601, -74.1, 5, 60_000));
    for (let t = 2; t < 6; t++) last = filter.update(fix(4.601, -74.1, 5, 60_000 + t * 1000));
    expect(distanceMeters([last.lat, last.lng], [4.601, -74.1])).toBeLessThan(10);
  });

  it("el margen de error estimado baja a medida que llegan lecturas buenas", () => {
    const filter = new GpsFilter();
    const first = filter.update(fix(4.6, -74.1, 50, 0));
    let last = first;
    for (let t = 1; t < 10; t++) last = filter.update(fix(4.6, -74.1, 50, t * 1000));
    expect(last.accuracy).toBeLessThan(first.accuracy);
  });

  it("ningún margen es mejor que el mínimo creíble (3 m)", () => {
    const filter = new GpsFilter();
    expect(filter.update(fix(4.6, -74.1, 0.1, 0)).accuracy).toBeGreaterThanOrEqual(3);
  });

  it("reset() olvida las lecturas", () => {
    const filter = new GpsFilter();
    filter.update(fix(4.6, -74.1, 10, 0));
    filter.reset();
    expect(filter.initialized).toBe(false);
  });

  it("con más libertad de movimiento (bus en marcha) sigue más rápido al vehículo", () => {
    const slow = new GpsFilter(0.3);
    const fast = new GpsFilter(8);
    for (const f of [slow, fast]) f.update(fix(4.6, -74.1, 10, 0));
    const target = fix(4.6005, -74.1, 10, 3000);
    const slowAfter = slow.update(target);
    const fastAfter = fast.update(target);
    expect(distanceMeters([fastAfter.lat, fastAfter.lng], [4.6005, -74.1])).toBeLessThan(
      distanceMeters([slowAfter.lat, slowAfter.lng], [4.6005, -74.1]),
    );
  });
});
