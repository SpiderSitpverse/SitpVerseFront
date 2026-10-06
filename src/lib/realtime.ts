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

  const socket: Socket = io(`${API_URL}/realtime`, { auth: { token, lastSeq } });

  socket.on("unauthorized", handlers.onUnauthorized);
  socket.on("fleet:position-updated", handlers.onPosition);
  socket.on("assistance:event", (event: AssistanceEvent) => {
    if (seen.has(event.eventId)) return;
    seen.add(event.eventId);
    try {
      sessionStorage.setItem(LAST_SEQ_KEY, String(event.seq));
    } catch {
      // sin sessionStorage: se reconcilia con los GET
    }
    handlers.onAssistance(event);
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}
