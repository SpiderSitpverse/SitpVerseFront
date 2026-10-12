import { Truck } from "lucide-react";
import { useState } from "react";
import { ActionRow, type RunAction } from "@/components/incidents/ActionRow";
import { useIncidentTows } from "@/hooks/useRouting";
import { routingClient } from "@/lib/routingClient";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TowState } from "@/types/routing";

/** El back acepta hasta 60 caracteres por nombre. */
const MAX_NAME = 60;

const STATE_BADGE: Record<TowState, string> = {
  asignada: "bg-status-warning/10 text-status-warning ring-status-warning/25",
  "en-curso": "bg-sky-500/10 text-sky-400 ring-sky-500/25",
  completada: "bg-status-online/10 text-status-online ring-status-online/25",
};
const STATE_LABEL: Record<TowState, string> = { asignada: "Asignada", "en-curso": "En curso", completada: "Completada" };

const inputClass =
  "w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60";

/**
 * HU-30: asignar grúa y cuadrilla a un incidente, y terminar el servicio para liberarlas.
 * Una grúa (o cuadrilla) con un servicio activo no se puede asignar a otro: el back responde 409
 * con un mensaje claro, que `run` muestra en el modal.
 */
export function TowSection({ incidentId, run }: { incidentId: string; run: RunAction }) {
  const tows = useIncidentTows(incidentId);
  const [truck, setTruck] = useState("");
  const [crew, setCrew] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = truck.trim().length > 0 && crew.trim().length > 0;

  async function assign() {
    if (!valid) return;
    setBusy(true);
    await run(
      () => routingClient.assignTow(incidentId, truck.trim(), crew.trim()),
      () => {
        setTruck("");
        setCrew("");
      },
    );
    setBusy(false);
  }

  async function finish(assignmentId: string) {
    setBusy(true);
    await run(() => routingClient.completeTow(assignmentId), () => undefined);
    setBusy(false);
  }

  return (
    <>
      <ActionRow
        icon={Truck}
        title="Grúa y cuadrilla"
        description="Asigna una grúa con su cuadrilla. Cada una atiende un servicio a la vez hasta que lo termines."
      >
        <button
          type="button"
          onClick={assign}
          disabled={!valid || busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          Asignar
        </button>
      </ActionRow>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-base-700 bg-base-800/20 p-3">
        <label className="space-y-1 text-xs font-medium text-base-300">
          Grúa
          <input
            value={truck}
            maxLength={MAX_NAME}
            onChange={(e) => setTruck(e.target.value)}
            placeholder="Ej. G-01"
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-base-300">
          Cuadrilla
          <input
            value={crew}
            maxLength={MAX_NAME}
            onChange={(e) => setCrew(e.target.value)}
            placeholder="Ej. Cuadrilla Norte"
            className={inputClass}
          />
        </label>
      </div>

      {tows.length > 0 && (
        <ul className="space-y-2">
          {tows.map((tow) => (
            <li
              key={tow.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-700 bg-base-800/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-base-100">
                  {tow.grua} · {tow.cuadrilla}
                </p>
                <p className="text-xs text-base-500">{timeAgo(tow.creadoEn)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", STATE_BADGE[tow.estado])}>
                  {STATE_LABEL[tow.estado]}
                </span>
                {tow.estado !== "completada" && (
                  <button
                    type="button"
                    onClick={() => finish(tow.id)}
                    disabled={busy}
                    className="rounded-lg bg-base-800 px-3 py-1 text-xs font-medium text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-50"
                  >
                    Terminar servicio
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
