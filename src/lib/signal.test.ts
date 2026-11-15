import { beforeEach, describe, expect, it } from "vitest";
import { NO_SIGNAL_MS, clearSignals, formatSignalAge, isWithoutSignal, markPositionSeen, signalAgeMs } from "@/lib/signal";

const NOW = Date.parse("2026-11-14T12:00:00.000Z");
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe("«Sin señal» (ESC-OBS-01)", () => {
  beforeEach(() => clearSignals());

  it("un bus cuya última posición llegó hace 15 s o menos tiene señal", () => {
    markPositionSeen("bus-1", NOW - NO_SIGNAL_MS);
    expect(isWithoutSignal("bus-1", undefined, NOW)).toBe(false);
  });

  it("pasados 15 s sin posición queda «Sin señal»", () => {
    markPositionSeen("bus-1", NOW - NO_SIGNAL_MS - 1);
    expect(isWithoutSignal("bus-1", undefined, NOW)).toBe(true);
  });

  it("al llegar una posición nueva recupera la señal", () => {
    markPositionSeen("bus-1", NOW - 60_000);
    expect(isWithoutSignal("bus-1", undefined, NOW)).toBe(true);
    markPositionSeen("bus-1", NOW - 1000);
    expect(isWithoutSignal("bus-1", undefined, NOW)).toBe(false);
  });

  it("sin posiciones en vivo todavía usa la hora del servidor (página recién cargada)", () => {
    expect(isWithoutSignal("bus-2", iso(40_000), NOW)).toBe(true);
    expect(isWithoutSignal("bus-2", iso(5_000), NOW)).toBe(false);
  });

  it("una posición en vivo manda sobre la hora del servidor (no depende de relojes sincronizados)", () => {
    markPositionSeen("bus-3", NOW - 2000);
    expect(isWithoutSignal("bus-3", iso(10 * 60_000), NOW)).toBe(false);
  });

  it("un reloj del servidor adelantado o una fecha inválida no marcan «Sin señal»", () => {
    expect(signalAgeMs("bus-4", iso(-30_000), NOW)).toBe(0);
    expect(isWithoutSignal("bus-4", "no-es-fecha", NOW)).toBe(false);
    expect(isWithoutSignal("bus-4", undefined, NOW)).toBe(false);
  });

  it("cada bus lleva su propia cuenta", () => {
    markPositionSeen("a", NOW - 1000);
    markPositionSeen("b", NOW - 20_000);
    expect([isWithoutSignal("a", undefined, NOW), isWithoutSignal("b", undefined, NOW)]).toEqual([false, true]);
  });

  it("dice hace cuánto fue la última posición", () => {
    expect(formatSignalAge(20_400)).toBe("hace 20 s");
    expect(formatSignalAge(180_000)).toBe("hace 3 min");
  });
});
