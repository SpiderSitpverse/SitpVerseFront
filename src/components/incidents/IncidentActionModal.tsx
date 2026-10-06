import { Check, Radio, Send, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { SEVERITY_STYLE } from "@/lib/status";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { Incident, IncidentState } from "@/types/bus";

const STATE_LABEL: Record<IncidentState, string> = {
  reportado: "Por gestionar",
  "ayuda-solicitada": "Ayuda solicitada",
};

interface ActionRowProps {
  icon: typeof Wrench;
  title: string;
  description: string;
  children: ReactNode;
}

function ActionRow({ icon: Icon, title, description, children }: ActionRowProps) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-800/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-base-800 text-base-300">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">{title}</p>
            <p className="text-xs text-base-400">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function SendButton({ sent, onClick, idleLabel, sentLabel }: { sent: boolean; onClick: () => void; idleLabel: string; sentLabel: string }) {
  return (
    <button
      onClick={onClick}
      disabled={sent}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        sent
          ? "bg-status-online/10 text-status-online ring-1 ring-inset ring-status-online/25"
          : "bg-brand-500 text-white hover:bg-brand-400",
      )}
    >
      {sent ? <Check className="size-3.5" /> : <Send className="size-3.5" />}
      {sent ? sentLabel : idleLabel}
    </button>
  );
}

function IncidentActionModalBody({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const style = SEVERITY_STYLE[incident.severidad];
  const alreadyRequested = incident.estado === "ayuda-solicitada";
  const [slots, setSlots] = useState(1);
  const [reward, setReward] = useState(10);
  const [alertSent, setAlertSent] = useState(alreadyRequested);
  const [teamSent, setTeamSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>, done: () => void) {
    setError(null);
    try {
      await action();
      done();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-base-50">{incident.titulo}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", style.badge)}>
          {STATE_LABEL[incident.estado]}
        </span>
      </div>
      {incident.descripcion && <p className="mt-1 text-sm text-base-400">{incident.descripcion}</p>}
      <p className="mt-1 text-xs text-base-500">
        {incident.placa} · {incident.reportadoPor} · {timeAgo(incident.creadoEn)}
      </p>

      <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
        Acciones disponibles
      </p>

      <div className="space-y-3">
        <ActionRow
          icon={Radio}
          title="Alerta a conductores"
          description="Pide apoyo a otros conductores: los primeros en aceptar se quedan con los cupos."
        >
          <SendButton
            sent={alertSent}
            onClick={() =>
              run(
                () => fleetActivityClient.launchSupportCall(incident.id, slots, reward),
                () => setAlertSent(true),
              )
            }
            idleLabel="Enviar"
            sentLabel="Enviado"
          />
        </ActionRow>

        {!alertSent && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-base-700 bg-base-800/20 p-3">
            <label className="space-y-1 text-xs font-medium text-base-300">
              Conductores necesarios
              <input
                type="number"
                min={1}
                max={50}
                value={slots}
                onChange={(e) => setSlots(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-500/60"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-base-300">
              Puntos de recompensa
              <input
                type="number"
                min={0}
                value={reward}
                onChange={(e) => setReward(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-500/60"
              />
            </label>
          </div>
        )}

        <ActionRow
          icon={Wrench}
          title="Equipo de mantenimiento"
          description="Genera una solicitud de reparación para que un mecánico acuda al bus."
        >
          <SendButton
            sent={teamSent}
            onClick={() =>
              run(
                () =>
                  fleetActivityClient.requestRepair(
                    incident.busId,
                    [incident.titulo, incident.descripcion].filter(Boolean).join(" — "),
                  ),
                () => setTeamSent(true),
              )
            }
            idleLabel="Enviar equipo"
            sentLabel="Solicitud enviada"
          />
        </ActionRow>

        {error && (
          <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
            {error}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full rounded-lg bg-base-800 px-4 py-2.5 text-sm font-semibold text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export function IncidentActionModal({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  return (
    <Modal open={incident !== null} onClose={onClose}>
      {incident && <IncidentActionModalBody key={incident.id} incident={incident} onClose={onClose} />}
    </Modal>
  );
}
