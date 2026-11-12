import { GpsFilter, type GpsFix } from "@/lib/gpsFilter";
import { distanceMeters, type LatLng } from "@/lib/routeSnap";

/**
 * Decide QUÉ posición del conductor se publica y CUÁNDO. Convierte las lecturas crudas del GPS del navegador
 * (ruidosas, a veces con ±100 m) en una posición estable:
 *
 *  1. Espera inicial: no usa las primeras lecturas aproximadas (red/wifi) hasta que llegue una buena.
 *  2. Filtro de Kalman: pesa cada lectura según su margen de error.
 *  3. Zona muerta: la posición suavizada solo se publica cuando SALE de un círculo alrededor de la última publicada.
 *     El radio sale de lo que se observa —cuánto se alejan las lecturas de la posición suavizada— y del margen de
 *     error que reporta el dispositivo, así que se agranda solo cuando el dispositivo "baila" (aunque diga que es
 *     preciso). Estando quieto casi no se publica nada; en movimiento se publica cada vez que el bus avanza un
 *     radio, y siempre que el GPS reporta velocidad real.
 *
 * No toca el DOM ni la red: recibe lecturas y devuelve qué hacer, para poder probarlo con secuencias simuladas.
 */
export interface PublisherOptions {
  /** Margen de error (m) o mejor: la lectura cuenta como "señal GPS buena". */
  goodFixMeters: number;
  /** La espera inicial dura como mínimo esto y termina antes solo si la precisión deja de mejorar. */
  minWarmupMs: number;
  /** Tiempo sin que mejore la mejor lectura para dar por terminada la espera. */
  stallMs: number;
  /** Tope de la espera inicial. */
  warmupMs: number;
  /** Radio mínimo de la zona muerta (m). */
  holdMinMeters: number;
  /** Radio máximo de la zona muerta (m). */
  holdMaxMeters: number;
  /** Velocidad (m/s) a partir de la cual el GPS indica movimiento real. */
  movingSpeed: number;
  /** Separación mínima entre dos publicaciones (ms). */
  sendEveryMs: number;
}

const DEFAULT_OPTIONS: PublisherOptions = {
  goodFixMeters: 50,
  minWarmupMs: 8_000,
  stallMs: 8_000,
  warmupMs: 30_000,
  holdMinMeters: 25,
  holdMaxMeters: 200,
  movingSpeed: 1,
  sendEveryMs: 3_000,
};

export type MotionState = "searching" | "still" | "moving";

export interface PublisherUpdate {
  state: MotionState;
  /** Posición a enviar al back, o `null` si no hay nada nuevo que publicar. */
  publish: LatLng | null;
  /** Margen de error de la lectura recibida (para mostrarlo al conductor). */
  accuracy: number;
}

/** Peso de cada lectura nueva en los promedios móviles (margen reportado y ruido observado). */
const EMA = 0.2;
/** Cuántas veces el ruido observado se toma como radio de incertidumbre. */
const NOISE_FACTOR = 2;
/** Libertad de movimiento del filtro (m/s) con el bus quieto y en marcha (si el GPS no reporta velocidad). */
const STILL_PROCESS_SPEED = 2;
const MOVING_PROCESS_SPEED = 8;
const PINNED_PROCESS_SPEED = 0.3;
/** Tras detectar movimiento, durante este tiempo el filtro es más ágil y el desplazamiento no cuenta como ruido. */
const MOVING_HOLD_MS = 20_000;
/** Dos salidas de la zona muerta hacia el mismo lado dentro de este tiempo confirman que el bus se mueve. */
const EXIT_CONFIRM_MS = 60_000;
/** Dos salidas cuentan como "el mismo lado" si sus rumbos difieren menos que esto. */
const SAME_DIRECTION_DEG = 60;

/** Una lectura con este margen de error (m) o mejor cuenta como "posición aprovechable". */
const USABLE_FIX_METERS = 150;
/** Después de una posición aprovechable, las lecturas con más margen que esto se ignoran (p. ej. ubicación por IP). */
const REJECT_ABOVE_METERS = 500;
/** Velocidad máxima creíble de un bus (m/s, ~144 km/h) y distancia mínima para sospechar de un salto. */
const MAX_BUS_SPEED = 40;
const JUMP_MIN_METERS = 400;
/** Lecturas seguidas con un salto imposible para aceptarlo como reubicación real (≈ 18 s a una lectura cada 3 s). */
const TELEPORT_CONFIRM_READINGS = 6;

/** Rumbo en grados (0 = norte, 90 = este) de `from` a `to`, en un plano local. */
function bearing(from: LatLng, to: LatLng): number {
  const dN = (to[0] - from[0]) * 110_540;
  const dE = (to[1] - from[1]) * 111_320 * Math.cos((from[0] * Math.PI) / 180);
  return (Math.atan2(dE, dN) * 180) / Math.PI;
}

/** Diferencia entre dos rumbos, en grados (0 a 180). */
function angleBetween(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export class PositionPublisher {
  private readonly options: PublisherOptions;
  private filter = new GpsFilter();
  private openedAt = 0;
  private best: GpsFix | null = null;
  private bestAt = 0;
  private accepted = false;
  private pinned = false;

  private anchor: LatLng | null = null; // última posición publicada
  private estimate: LatLng | null = null; // última posición suavizada
  private lastSentAt = -Infinity;
  private accuracyEma: number | null = null;
  private noiseEma: number | null = null;
  private movingUntil = -Infinity;
  private lastExit: { at: number; heading: number } | null = null;
  private baseSpeed = STILL_PROCESS_SPEED;
  private usableFix = false; // ya hubo al menos una lectura de precisión aprovechable
  private teleports = 0; // lecturas seguidas con un salto imposible
  private lastReadingAt = 0;

  constructor(options: Partial<PublisherOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Empieza de cero (nuevo viaje). */
  reset(now: number) {
    this.filter = new GpsFilter();
    this.openedAt = now;
    this.best = null;
    this.bestAt = now;
    this.accepted = false;
    this.pinned = false;
    this.anchor = null;
    this.estimate = null;
    this.lastSentAt = -Infinity;
    this.accuracyEma = null;
    this.noiseEma = null;
    this.movingUntil = -Infinity;
    this.lastExit = null;
    this.baseSpeed = STILL_PROCESS_SPEED;
    this.usableFix = false;
    this.teleports = 0;
    this.lastReadingAt = 0;
  }

  /** El conductor marca a mano dónde está: se publica ya y el GPS impreciso no lo arrastra de vuelta. */
  pin(point: LatLng, now: number): LatLng {
    const pinned = new GpsFilter(PINNED_PROCESS_SPEED);
    pinned.update({ lat: point[0], lng: point[1], accuracy: 5, timestamp: now });
    this.filter = pinned;
    this.baseSpeed = PINNED_PROCESS_SPEED;
    this.movingUntil = -Infinity;
    this.accepted = true;
    this.pinned = true;
    this.anchor = point;
    this.estimate = point;
    this.lastSentAt = now;
    return point;
  }

  push(reading: GpsFix, now: number): PublisherUpdate {
    const accuracy = reading.accuracy;
    const warmed = this.warmUp(reading, now);
    if (!warmed) return { state: "searching", publish: null, accuracy };
    if (this.shouldIgnore(reading, warmed)) return { state: this.holdState(now), publish: null, accuracy };
    this.lastReadingAt = reading.timestamp;
    return this.track(reading, warmed, now);
  }

  /** 1. Espera inicial: devuelve la lectura a usar, o null mientras se sigue buscando una buena. */
  private warmUp(reading: GpsFix, now: number): GpsFix | null {
    if (this.accepted) return reading;
    const o = this.options;
    const accuracy = reading.accuracy;
    if (!this.best || accuracy < this.best.accuracy) {
      this.best = reading;
      this.bestAt = now;
    }
    const good = accuracy <= o.goodFixMeters;
    const stalled = now - this.openedAt >= o.minWarmupMs && now - this.bestAt >= o.stallMs;
    if (!good && !stalled && now - this.openedAt < o.warmupMs) return null;
    this.accepted = true;
    return good ? reading : this.best;
  }

  /**
   * 1b. Lecturas que no sirven, una vez que ya hubo una posición aprovechable:
   *  (a) precisión pésima: típico de un navegador de escritorio que de pronto cae a la ubicación por IP (a decenas de
   *      km, con miles de metros de margen). No dice dónde está el bus: se ignora.
   *  (b) un salto físicamente imposible (un bus no recorre 20 km en 2 s): puede ser un fallo del proveedor. Se
   *      ignora hasta que se repita varias lecturas seguidas; entonces se acepta como una reubicación real.
   */
  private shouldIgnore(reading: GpsFix, fix: GpsFix): boolean {
    const accuracy = reading.accuracy;
    if (!this.usableFix) {
      if (accuracy <= USABLE_FIX_METERS) this.usableFix = true;
      return false;
    }
    if (accuracy > REJECT_ABOVE_METERS) return true;
    if (!this.estimate) return false;

    const seconds = Math.max(1, (reading.timestamp - this.lastReadingAt) / 1000);
    const limit = Math.max(JUMP_MIN_METERS, MAX_BUS_SPEED * seconds + 3 * accuracy);
    if (distanceMeters(this.estimate, [fix.lat, fix.lng]) <= limit) {
      this.teleports = 0;
      return false;
    }
    this.teleports += 1;
    if (this.teleports < TELEPORT_CONFIRM_READINGS) {
      this.lastReadingAt = reading.timestamp;
      return true;
    }
    this.relocate();
    return false;
  }

  /** 2 a 6: filtra la lectura y decide si hay algo nuevo que publicar. */
  private track(reading: GpsFix, fix: GpsFix, now: number): PublisherUpdate {
    const o = this.options;
    const accuracy = reading.accuracy;

    // 2. Un punto marcado a mano se sostiene frente a lecturas imprecisas y sin movimiento; un GPS bueno lo libera.
    if (this.pinned && accuracy <= o.goodFixMeters) this.pinned = false;
    const speedMoving = (reading.speed ?? 0) >= o.movingSpeed;
    const holdPin = this.pinned && !speedMoving;

    // Con el bus en marcha el desplazamiento no es ruido: no se cuenta como tal y el filtro se vuelve más ágil
    // (si no, un dispositivo sin velocidad reportada se quedaba cientos de metros atrás de un bus a 30 km/h).
    const inMotion = speedMoving || now < this.movingUntil;

    // 3. Ruido observado: cuánto se aleja la lectura de la posición suavizada que ya teníamos.
    if (this.estimate && !holdPin && !inMotion) {
      const deviation = distanceMeters([fix.lat, fix.lng], this.estimate);
      this.noiseEma = this.noiseEma === null ? deviation : this.noiseEma + EMA * (deviation - this.noiseEma);
    }
    this.accuracyEma = this.accuracyEma === null ? accuracy : this.accuracyEma + EMA * (accuracy - this.accuracyEma);

    // 4. Filtro de Kalman.
    this.filter.speedMetersPerSecond = inMotion ? Math.max(this.baseSpeed, MOVING_PROCESS_SPEED) : this.baseSpeed;
    const fixed = (holdPin ? this.filter.estimate : null) ?? this.filter.update(fix);
    const here: LatLng = [fixed.lat, fixed.lng];
    this.estimate = here;

    // 5. Primera posición: se publica de inmediato y queda como ancla.
    if (this.anchor === null) return this.send(here, now, accuracy, "still");

    // 6. Zona muerta: solo se publica si la posición suavizada salió del círculo, o si el GPS reporta velocidad real.
    if (speedMoving) {
      this.movingUntil = now + MOVING_HOLD_MS;
      return this.send(here, now, accuracy, "moving");
    }
    if (distanceMeters(this.anchor, here) > this.radius()) {
      this.registerExit(here, now);
      return this.send(here, now, accuracy, "moving");
    }
    return { state: inMotion ? "moving" : "still", publish: null, accuracy };
  }

  /**
   * Una salida suelta de la zona muerta puede ser ruido (sale hacia cualquier lado); dos seguidas hacia el MISMO lado
   * en poco tiempo son un bus que avanza.
   */
  private registerExit(here: LatLng, now: number) {
    const heading = bearing(this.anchor as LatLng, here);
    const last = this.lastExit;
    if (last && now - last.at <= EXIT_CONFIRM_MS && angleBetween(heading, last.heading) <= SAME_DIRECTION_DEG) {
      this.movingUntil = now + MOVING_HOLD_MS;
    }
    this.lastExit = { at: now, heading };
  }

  private holdState(now: number): MotionState {
    return now < this.movingUntil ? "moving" : "still";
  }

  /** El dispositivo se "mudó" de verdad (saltos imposibles repetidos): se reinicia el seguimiento en el sitio nuevo. */
  private relocate() {
    this.filter = new GpsFilter(this.baseSpeed);
    this.anchor = null;
    this.estimate = null;
    this.lastSentAt = -Infinity;
    this.noiseEma = null;
    this.teleports = 0;
    this.movingUntil = -Infinity;
    this.lastExit = null;
  }

  /**
   * Radio de la zona muerta en metros: lo que reporta el dispositivo o lo que se ve que "baila", lo que sea mayor.
   * El ruido aprendido se congela mientras el bus está en marcha (el desplazamiento no es ruido).
   */
  private radius(): number {
    const o = this.options;
    return Math.min(o.holdMaxMeters, Math.max(o.holdMinMeters, this.accuracyEma ?? 0, NOISE_FACTOR * (this.noiseEma ?? 0)));
  }

  private send(point: LatLng, now: number, accuracy: number, state: MotionState): PublisherUpdate {
    if (now - this.lastSentAt < this.options.sendEveryMs && this.anchor !== null) {
      return { state, publish: null, accuracy };
    }
    this.lastSentAt = now;
    this.anchor = point;
    return { state, publish: point, accuracy };
  }
}
