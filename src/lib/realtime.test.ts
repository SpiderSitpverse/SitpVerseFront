import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (...args: unknown[]) => void;
type FakeSocket = {
  options: Record<string, unknown>;
  listeners: Record<string, Listener>;
  on: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};
const sockets: FakeSocket[] = [];

vi.mock("socket.io-client", () => ({
  io: vi.fn((_url: string, options: Record<string, unknown>) => {
    const listeners: Record<string, Listener> = {};
    const socket = {
      options,
      listeners,
      on: vi.fn((event: string, handler: Listener) => void (listeners[event] = handler)),
      removeAllListeners: vi.fn(),
      disconnect: vi.fn(),
    };
    sockets.push(socket);
    return socket;
  }),
}));

// El arranque de las pruebas reemplaza este módulo por un simulado: aquí se prueba el real.
vi.unmock("@/lib/realtime");
import { connectRealtime } from "@/lib/realtime";

const position = (busId: string) => ({ busId, plate: busId, route: "R", status: "IN_SERVICE" as const, latitude: 4.6, longitude: -74.1, updatedAt: "2026-11-15T00:00:00Z" });

describe("conexión en tiempo real", () => {
  beforeEach(() => {
    sockets.length = 0;
    sessionStorage.clear();
  });

  function connect() {
    const handlers = { onPosition: vi.fn(), onAssistance: vi.fn(), onUnauthorized: vi.fn() };
    const disconnect = connectRealtime("jwt", handlers);
    return { handlers, socket: sockets[0], disconnect };
  }

  it("usa solo WebSocket y pide las posiciones agrupadas, mandando el token y el último seq", () => {
    const { socket } = connect();
    expect(socket.options.transports).toEqual(["websocket"]);
    const cb = vi.fn();
    (socket.options.auth as (cb: (data: unknown) => void) => void)(cb);
    expect(cb).toHaveBeenCalledWith({ token: "jwt", lastSeq: undefined, batch: true });
  });

  it("un lote de posiciones se reparte al mismo manejador, una por bus", () => {
    const { socket, handlers } = connect();
    socket.listeners["fleet:positions-batch"]([position("b1"), position("b2")]);
    expect(handlers.onPosition.mock.calls.map(([event]) => event.busId)).toEqual(["b1", "b2"]);
  });

  it("una posición suelta sigue funcionando", () => {
    const { socket, handlers } = connect();
    socket.listeners["fleet:position-updated"](position("b1"));
    expect(handlers.onPosition).toHaveBeenCalledTimes(1);
  });

  it("recuerda el seq de las alertas, descarta repetidas y solo avanza", () => {
    const { socket, handlers } = connect();
    const alert = (eventId: string, seq: number) => ({ eventId, seq, type: "call.opened", occurredAt: "", payload: {} });
    socket.listeners["assistance:event"](alert("e1", 5));
    socket.listeners["assistance:event"](alert("e1", 5)); // repetida
    socket.listeners["assistance:event"](alert("e0", 3)); // más vieja: no hace retroceder
    expect(handlers.onAssistance).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem("sitpverse.lastSeq")).toBe("5");
  });

  it("al identificarse la primera vez toma el seq del servidor como punto de partida", () => {
    const { socket } = connect();
    socket.listeners["identified"]({ seq: "42" });
    expect(sessionStorage.getItem("sitpverse.lastSeq")).toBe("42");
  });

  it("cerrar quita los oyentes y desconecta", () => {
    const { disconnect, socket } = connect();
    disconnect();
    expect(socket.removeAllListeners).toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
