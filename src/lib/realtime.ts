import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

export interface FleetPositionEvent {
  busId: string;
  plate: string;
  route: string;
  status: "IDLE" | "IN_SERVICE" | "FINISHED";
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface AssistanceEvent {
  eventId: string;
  seq: string | number;
  type: string;
  occurredAt: string;
  payload: unknown;
}

interface RealtimeHandlers {
  onPosition: (event: FleetPositionEvent) => void;
  onAssistance: (event: AssistanceEvent) => void;
  onUnauthorized: () => void;
}

const LAST_SEQ_KEY = "sitpverse.lastSeq";

/**
 * Conexión Socket.IO al namespace `/realtime` (docs/API.md §5). La entrega de eventos es
 * "al menos una vez": se descartan duplicados por `eventId` y se recuerda el último `seq`
 * para que el servidor reenvíe lo perdido al reconectar. Devuelve la función para cerrar.
 */
export function connectRealtime(token: string, handlers: RealtimeHandlers): () => void {
  const seen = new Set<string>();
  let lastSeq: string | undefined;
  try {
    lastSeq = sessionStorage.getItem(LAST_SEQ_KEY) ?? undefined;
  } catch {
    lastSeq = undefined;
  }

  const remember = (seq: string | number) => {
    lastSeq = String(seq);
    try {
      sessionStorage.setItem(LAST_SEQ_KEY, lastSeq);
    } catch {
      // sin sessionStorage: se reconcilia con los GET
    }
  };

  const socket: Socket = io(`${API_URL}/realtime`, {
    // `auth` es una función: en CADA reconexión se manda el último `seq` visto (no el del primer intento), para que el
    // servidor reenvíe exactamente lo que se perdió mientras el socket estuvo caído.
    // `batch`: las posiciones llegan agrupadas (la última de cada bus cada 250 ms) en vez de una por mensaje.
    auth: (cb) => cb({ token, lastSeq, batch: true }),
    // Solo WebSocket (sin "long polling"): el back corre en varias instancias SIN afinidad de sesión, y el polling
    // necesita que todas las peticiones de una conexión caigan en la misma. Así, si una instancia cae, el socket se
    // reconecta a cualquiera de las otras (ESC-DISP-01).
    transports: ["websocket"],
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });

  // Al identificarse por primera vez el servidor dice por dónde va el flujo de alertas: es el punto de partida para
  // pedir lo perdido si el socket se cae antes de recibir su primer evento.
  socket.on("identified", (info: { seq?: string | number } | undefined) => {
    if (lastSeq === undefined && info?.seq !== undefined) remember(info.seq);
  });
  socket.on("unauthorized", handlers.onUnauthorized);
  socket.on("fleet:position-updated", handlers.onPosition);
  socket.on("fleet:positions-batch", (batch: FleetPositionEvent[]) => batch.forEach(handlers.onPosition));
  socket.on("assistance:event", (event: AssistanceEvent) => {
    if (seen.has(event.eventId)) return;
    seen.add(event.eventId);
    // Solo avanza: un evento reenviado (más viejo) no debe hacer retroceder el punto de reanudación.
    if (lastSeq === undefined || Number(event.seq) > Number(lastSeq)) remember(event.seq);
    handlers.onAssistance(event);
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
