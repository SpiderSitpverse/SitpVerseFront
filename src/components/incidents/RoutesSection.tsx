import { Route as RouteIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ActionRow } from "@/components/incidents/ActionRow";
import { useIncidentRoutes } from "@/hooks/useRouting";
import { cn } from "@/lib/utils";
import type { Incident } from "@/types/bus";
import type { RouteState } from "@/types/routing";

const STATE_BADGE: Record<RouteState, string> = {
  propuesta: "bg-status-warning/10 text-status-warning ring-status-warning/25",
  asignada: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
  aceptada: "bg-status-online/10 text-status-online ring-status-online/25",
};
const STATE_LABEL: Record<RouteState, string> = { propuesta: "Propuesta", asignada: "Asignada", aceptada: "Aceptada" };

/** HU-46 / HU-47: lleva al mapa para trazar el desvío de este incidente y lista las rutas que ya tiene. */
export function RoutesSection({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const routes = useIncidentRoutes(incident.id);
  const navigate = useNavigate();

  function openMap() {
    onClose();
    void navigate("/buses", { state: { incidentId: incident.id } });
  }

  return (
    <>
      <ActionRow
        icon={RouteIcon}
        title="Ruta alternativa"
        description="Traza el desvío sobre el mapa y asígnalo a un conductor."
      >
        <button
          type="button"
          onClick={openMap}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-400"
        >
          Trazar en el mapa
        </button>
      </ActionRow>

      {routes.length > 0 && (
        <ul className="space-y-2">
          {routes.map((route) => (
            <li
              key={route.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-base-700 bg-base-800/30 px-3 py-2"
            >
              <p className="min-w-0 truncate text-sm font-medium text-base-100">{route.nombre}</p>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", STATE_BADGE[route.estado])}>
                {STATE_LABEL[route.estado]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
