import { Eraser, MapPin, Route as RouteIcon, Undo2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import { routingClient } from "@/lib/routingClient";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/bus";
import type { AlternativeRoute, LatLngTuple, RouteState } from "@/types/routing";

/** El back acepta entre 2 y 2000 puntos y un nombre de hasta 120 caracteres. */
const MIN_POINTS = 2;
const MAX_POINTS = 2000;
const MAX_NAME = 120;

const STATE_BADGE: Record<RouteState, string> = {
  propuesta: "bg-status-warning/10 text-status-warning ring-status-warning/25",
  asignada: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
  aceptada: "bg-status-online/10 text-status-online ring-status-online/25",
};
const STATE_LABEL: Record<RouteState, string> = { propuesta: "Propuesta", asignada: "Asignada", aceptada: "Aceptada" };

interface RoutePlannerProps {
  incidents: Incident[];
  routes: AlternativeRoute[];
  /** Conductores a los que se puede asignar (`driverId` = id de usuario). */
  drivers: { driverId: string; label: string }[];
  incidentId: string;
  onIncidentChange: (incidentId: string) => void;
  drawing: boolean;
  onDrawingChange: (drawing: boolean) => void;
  draft: LatLngTuple[];
  onDraftChange: (points: LatLngTuple[]) => void;
}

const inputClass =
  "w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 disabled:opacity-50";

/**
 * HU-46 / HU-47: el administrador elige un incidente, dibuja el desvío tocando el mapa, lo guarda y lo
 * asigna a un conductor. El mapa vive en la página; este panel solo maneja el borrador y las acciones.
 */
export function RoutePlanner({
  incidents,
  routes,
  drivers,
  incidentId,
  onIncidentChange,
  drawing,
  onDrawingChange,
  draft,
  onDraftChange,
}: RoutePlannerProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [driverByRoute, setDriverByRoute] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSave = Boolean(incidentId) && name.trim().length > 0 && draft.length >= MIN_POINTS && !saving;

  function fail(e: unknown) {
    setMessage(null);
    setError(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
  }

  async function save() {
    if (!canSave) return;
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await routingClient.proposeRoute(incidentId, name.trim(), draft);
      onDraftChange([]);
      onDrawingChange(false);
      setName("");
      setMessage("Ruta guardada. Asígnala a un conductor para que la reciba.");
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function assign(route: AlternativeRoute) {
    const driverId = driverByRoute[route.id];
    if (!driverId) return;
    setError(null);
    setMessage(null);
    setAssigningId(route.id);
    try {
      await routingClient.assignRoute(route.id, driverId);
      setMessage(`Ruta "${route.nombre}" asignada. El conductor recibe el aviso al instante.`);
    } catch (e) {
      fail(e);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <Card id="rutas-alternativas">
      <CardHeader>
        <CardTitle>Rutas alternativas</CardTitle>
        <span className="text-xs text-base-400">{routes.length} en total</span>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 pt-0 lg:grid-cols-2">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Trazar un desvío</p>

          <label className="block space-y-1 text-xs font-medium text-base-300">
            Incidente
            <select
              value={incidentId}
              onChange={(e) => onIncidentChange(e.target.value)}
              className={inputClass}
              aria-label="Incidente"
            >
              <option value="">Elige el incidente que bloquea la vía…</option>
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {incident.placa} · {incident.titulo} ({timeAgo(incident.creadoEn)})
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!incidentId}
              onClick={() => onDrawingChange(!drawing)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors disabled:opacity-50",
                drawing
                  ? "bg-brand-500/10 text-brand-400 ring-brand-500/30"
                  : "bg-base-800 text-base-200 ring-base-600 hover:bg-base-700",
              )}
            >
              <MapPin className="size-3.5" />
              {drawing ? "Terminar de marcar" : "Marcar puntos en el mapa"}
            </button>
            <button
              type="button"
              disabled={draft.length === 0}
              onClick={() => onDraftChange(draft.slice(0, -1))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-base-800 px-3 py-1.5 text-xs font-medium text-base-200 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-40"
            >
              <Undo2 className="size-3.5" />
              Deshacer
            </button>
            <button
              type="button"
              disabled={draft.length === 0}
              onClick={() => onDraftChange([])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-base-800 px-3 py-1.5 text-xs font-medium text-base-200 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-40"
            >
              <Eraser className="size-3.5" />
              Limpiar
            </button>
          </div>

          <p className={cn("text-xs", drawing ? "text-brand-400" : "text-base-400")}>
            {drawing
              ? `Toca el mapa para marcar cada punto del desvío, en orden. Llevas ${draft.length} (mínimo ${MIN_POINTS}).`
              : draft.length > 0
                ? `Trazado con ${draft.length} puntos. Ponle nombre y guárdalo.`
                : "Elige el incidente y marca el recorrido del desvío sobre el mapa."}
          </p>

          <label className="block space-y-1 text-xs font-medium text-base-300">
            Nombre de la ruta
            <input
              value={name}
              maxLength={MAX_NAME}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Desvío por la calle 26"
              className={inputClass}
            />
          </label>

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
          >
            <RouteIcon className="size-4" />
            {saving ? "Guardando…" : "Guardar ruta"}
          </button>
          {draft.length >= MAX_POINTS && <p className="text-xs text-status-warning">Llegaste al máximo de {MAX_POINTS} puntos.</p>}
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Rutas guardadas</p>

          {routes.length === 0 && <p className="py-6 text-center text-sm text-base-400">Aún no hay rutas alternativas.</p>}

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {routes.map((route) => (
              <div key={route.id} className="rounded-xl border border-base-700 bg-base-800/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-base-100">{route.nombre}</p>
                    <p className="text-xs text-base-400">
                      {route.incidente ? `${route.incidente.placa ?? ""} · ${route.incidente.titulo}` : "Incidente"} ·{" "}
                      {timeAgo(route.creadaEn)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                      STATE_BADGE[route.estado],
                    )}
                  >
                    {STATE_LABEL[route.estado]}
                  </span>
                </div>

                {route.estado !== "aceptada" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      value={driverByRoute[route.id] ?? ""}
                      onChange={(e) => setDriverByRoute((prev) => ({ ...prev, [route.id]: e.target.value }))}
                      className={cn(inputClass, "min-w-0 flex-1")}
                      aria-label={`Conductor para ${route.nombre}`}
                    >
                      <option value="">{drivers.length === 0 ? "No hay buses con conductor" : "Asignar a un bus…"}</option>
                      {drivers.map((d) => (
                        <option key={d.driverId} value={d.driverId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => assign(route)}
                      disabled={!driverByRoute[route.id] || assigningId === route.id}
                      className="shrink-0 rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
                    >
                      {assigningId === route.id ? "Asignando…" : route.estado === "asignada" ? "Reasignar" : "Asignar"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {(error || message) && (
          <div className="lg:col-span-2">
            {error && (
              <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-lg bg-status-online/10 px-3 py-2 text-sm text-status-online ring-1 ring-inset ring-status-online/25">
                {message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
