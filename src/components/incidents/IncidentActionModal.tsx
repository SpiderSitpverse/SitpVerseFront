import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Navigation2, Radio, Route, Send, Wrench } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { SEVERITY_STYLE } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { Incident, IncidentSeverity } from "@/types/bus";

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  info: "Informativo",
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

function IncidentActionModalBody({ incident }: { incident: Incident }) {
  const style = SEVERITY_STYLE[incident.severidad];
  const [alertSent, setAlertSent] = useState(false);
  const [teamSent, setTeamSent] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const [instruction, setInstruction] = useState(incident.instruccionesSugeridas[0] ?? "");
  const [instructionSent, setInstructionSent] = useState(false);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-base-50">{incident.titulo}</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", style.badge)}>
          {SEVERITY_LABEL[incident.severidad]}
        </span>
      </div>
      <p className="mt-1 text-sm text-base-400">{incident.descripcion}</p>
      <p className="mt-1 text-xs text-base-500">{incident.hace}</p>

      <p className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
        Acciones disponibles
      </p>

      <div className="space-y-3">
        <ActionRow
          icon={Radio}
          title="Alerta a conductores"
          description="Notifica a los conductores en la zona afectada a través del sistema de ayuda."
        >
          <SendButton sent={alertSent} onClick={() => setAlertSent(true)} idleLabel="Enviar" sentLabel="Enviado" />
        </ActionRow>

        <ActionRow icon={Wrench} title="Equipo de mantenimiento" description="Despacha una cuadrilla técnica y de prevención al sitio.">
          <SendButton sent={teamSent} onClick={() => setTeamSent(true)} idleLabel="Enviar equipo" sentLabel="En camino" />
        </ActionRow>

        <ActionRow icon={Route} title="Rutas alternas disponibles" description="Revisa troncales no afectadas para redirigir el servicio.">
          <button
            onClick={() => setRoutesOpen((v) => !v)}
            disabled={incident.rutasAlternas.length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-base-800 px-3 py-1.5 text-xs font-medium text-base-200 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-40"
          >
            {incident.rutasAlternas.length === 0 ? "Sin rutas" : "Ver rutas"}
            <ChevronDown className={cn("size-3.5 transition-transform", routesOpen && "rotate-180")} />
          </button>
        </ActionRow>

        <AnimatePresence>
          {routesOpen && incident.rutasAlternas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 rounded-xl border border-base-700 bg-base-800/20 p-3">
                {incident.rutasAlternas.map((ruta) => (
                  <span
                    key={ruta}
                    className="inline-flex items-center gap-1.5 rounded-full bg-status-online/10 px-2.5 py-1 text-xs font-medium text-status-online ring-1 ring-inset ring-status-online/25"
                  >
                    <span className="size-1.5 rounded-full bg-status-online" />
                    {ruta}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rounded-xl border border-base-700 bg-base-800/40 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-base-800 text-base-300">
              <Navigation2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-base-100">Instrucción para el conductor</p>
              <p className="text-xs text-base-400">Selecciona y envía una indicación para evitar retrasos.</p>

              <select
                value={instruction}
                onChange={(e) => {
                  setInstruction(e.target.value);
                  setInstructionSent(false);
                }}
                className="mt-3 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 outline-none focus:border-brand-500/60"
              >
                {incident.instruccionesSugeridas.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <div className="mt-3">
                <SendButton
                  sent={instructionSent}
                  onClick={() => setInstructionSent(true)}
                  idleLabel="Enviar instrucción"
                  sentLabel="Instrucción enviada"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IncidentActionModal({ incident, onClose }: { incident: Incident | null; onClose: () => void }) {
  return (
    <Modal open={incident !== null} onClose={onClose}>
      {incident && <IncidentActionModalBody incident={incident} />}
    </Modal>
  );
}
