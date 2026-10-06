/**
 * Filtro de Kalman para lecturas GPS. Cada lectura del navegador trae su margen de error (`accuracy`, en metros):
 * una lectura de ±10 m pesa mucho, una de ±800 m casi nada. Así el punto no "baila" entre calles y, cuando por fin
 * llega una lectura buena, el filtro la sigue sin saltos. No depende de mapas ni de servicios externos.
 */
export interface GpsFix {
  lat: number;
  lng: number;
  /** Margen de error de la lectura, en metros. */
  accuracy: number;
  /** Instante de la lectura (ms, como `Position.timestamp`). */
  timestamp: number;
  /** Velocidad que reporta el GPS en m/s (`Coordinates.speed`); `null` si el dispositivo no la da. */
  speed?: number | null;
}

export interface FilteredFix {
  lat: number;
  lng: number;
  /** Margen de error estimado tras filtrar, en metros (baja a medida que llegan lecturas buenas). */
  accuracy: number;
}

/** Margen de error mínimo creíble: ningún GPS de teléfono es mejor que esto. */
const MIN_ACCURACY_M = 3;

export class GpsFilter {
  private lat = 0;
  private lng = 0;
  private variance = -1; // m²; negativo = aún sin lecturas
  private timestamp = 0;
  private readonly speedMetersPerSecond: number;

  /**
   * @param speedMetersPerSecond cuánto puede moverse el vehículo entre lecturas (la incertidumbre crece con el
   *   tiempo). 2 m/s por defecto: un bus quieto o en tráfico lento no se "arrastra" con el ruido; cuando el GPS
   *   reporta velocidad real (un bus en marcha) se usa esa.
   */
  constructor(speedMetersPerSecond = 2) {
    this.speedMetersPerSecond = speedMetersPerSecond;
  }

  reset() {
    this.variance = -1;
  }

  get initialized() {
    return this.variance >= 0;
  }

  /** Posición estimada actual, sin incorporar ninguna lectura nueva (`null` si aún no hay ninguna). */
  get estimate(): FilteredFix | null {
    return this.variance < 0 ? null : { lat: this.lat, lng: this.lng, accuracy: Math.sqrt(this.variance) };
  }

  update(fix: GpsFix): FilteredFix {
    const accuracy = Math.max(fix.accuracy, MIN_ACCURACY_M);

    if (this.variance < 0) {
      this.lat = fix.lat;
      this.lng = fix.lng;
      this.variance = accuracy * accuracy;
      this.timestamp = fix.timestamp;
    } else {
      const seconds = Math.max(0, fix.timestamp - this.timestamp) / 1000;
      // Predicción: el vehículo pudo moverse, así que la incertidumbre crece con el tiempo transcurrido. Si el GPS
      // reporta velocidad se usa (un bus a 30 km/h se mueve 8 m cada segundo: con un valor fijo bajo el punto
      // se quedaría ~18 m atrás); si no, el valor por defecto.
      const speed = Math.max(this.speedMetersPerSecond, (fix.speed ?? 0) * 1.2);
      this.variance += seconds * speed * speed;
      this.timestamp = fix.timestamp;

      // Corrección: se mezcla la lectura nueva según qué tan confiable es frente a lo que ya se sabía.
      const gain = this.variance / (this.variance + accuracy * accuracy);
      this.lat += gain * (fix.lat - this.lat);
      this.lng += gain * (fix.lng - this.lng);
      this.variance = (1 - gain) * this.variance;
    }
    return { lat: this.lat, lng: this.lng, accuracy: Math.sqrt(this.variance) };
  }
}
