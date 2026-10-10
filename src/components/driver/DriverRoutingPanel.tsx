import { Check, Route as RouteIcon, Siren, X } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useBlockageAlerts, useMyAssignedRoutes } from "@/hooks/useRouting";
import { ApiError } from "@/lib/api";
import { dismissBlockageAlert } from "@/lib/blockageAlerts";
import { routingClient } from "@/lib/routingClient";
import { timeAgo } from "@/lib/time";

/**
 * Lo que el conductor recibe del centro de control ante un bloqueo:
 *  - HU-16: avisos de bloqueo (llegan una vez por WebSocket; se quedan aquí hasta que los descarte).
 *  - HU-48: la ruta alternativa que le asignaron.
 *  - HU-17 / HU-52: aceptarla.
 * No pinta nada si no hay avisos ni rutas.
 */
export function DriverRoutingPanel() {
  const alerts = useBlockageAlerts();
  const routes = useMyAssignedRoutes();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (alerts.length === 0 && routes.length === 0) return null;

  async function accept(routeId: string) {
    setError(null);
    setAcceptingId(routeId);
    try {
      await routingClient.acceptRoute(routeId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo aceptar la ruta.");
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
      {alerts.length > 0 && (
        <Card className="border-status-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className="size-4 text-status-danger" />
              Bloqueos en la vía
            </CardTitle>
            <span className="text-xs text-base-400">{alerts.length}</span>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-base-700 bg-base-800/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-base-100">
                    {alert.placa ? `${alert.placa} · ` : ""}
                    {alert.tipo}
                  </p>
                  {alert.descripcion && <p className="mt-0.5 text-sm text-base-400">{alert.descripcion}</p>}
                  <p className="mt-1 text-xs text-base-500">{timeAgo(alert.recibidaEn)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissBlockageAlert(alert.id)}
                  aria-label="Descartar aviso"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-base-400 transition-colors hover:bg-base-700 hover:text-base-100"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="size-4 text-sky-400" />
              Ruta alternativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {routes.map((route) => (
              <div key={route.id} className="rounded-lg border border-base-700 bg-base-800/40 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-base-100">{route.nombre}</p>
                    {route.incidente && (
                      <p className="text-xs text-base-400">Por: {route.incidente.titulo}</p>
                    )}
                  </div>
                  {route.estado === "aceptada" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-status-online/10 px-2.5 py-1 text-[11px] font-medium text-status-online ring-1 ring-inset ring-status-online/25">
                      <Check className="size-3.5" />
                      Aceptada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => accept(route.id)}
                      disabled={acceptingId === route.id}
                      className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-400 disabled:opacity-60"
                    >
                      {acceptingId === route.id ? "Aceptando…" : "Aceptar ruta"}
                    </button>
                  )}
                </div>
                {route.estado === "aceptada" && (
                  <p className="mt-1.5 text-xs text-base-400">Toma el desvío marcado con línea discontinua en el mapa.</p>
                )}
              </div>
            ))}
            {error && (
              <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
