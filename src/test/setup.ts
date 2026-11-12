import "@testing-library/jest-dom/vitest";
import { createElement, type ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Mapa (Leaflet) y WebSocket no existen en jsdom: se reemplazan por piezas simples que dibujan sus hijos. Así las pruebas
 * de pantallas recorren TODA la lógica de la interfaz sin depender de un navegador real.
 */
vi.mock("react-leaflet", () => {
  const box = (name: string) => ({ children }: { children?: ReactNode }) => createElement("div", { "data-leaflet": name }, children);
  const map = { setView: vi.fn(), fitBounds: vi.fn(), flyTo: vi.fn(), getZoom: () => 13, getBounds: () => ({}), invalidateSize: vi.fn(), on: vi.fn(), off: vi.fn() };
  return {
    MapContainer: box("map"),
    TileLayer: box("tiles"),
    Marker: box("marker"),
    Polyline: box("polyline"),
    CircleMarker: box("circle"),
    Popup: box("popup"),
    Tooltip: box("tooltip"),
    useMap: () => map,
    useMapEvent: vi.fn(),
    useMapEvents: vi.fn(),
  };
});

vi.mock("@/lib/realtime", () => ({
  connectRealtime: vi.fn(() => () => undefined),
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
Element.prototype.scrollIntoView = vi.fn();
class FakeResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= FakeResizeObserver as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
});
