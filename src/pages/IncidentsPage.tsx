import { motion } from "framer-motion";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { useState } from "react";
import { IncidentActionModal } from "@/components/incidents/IncidentActionModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { SEVERITY_STYLE } from "@/lib/status";
import { incidents } from "@/data/buses";
import type { Incident, IncidentSeverity } from "@/types/bus";

const SEVERITY_ICON: Record<IncidentSeverity, typeof AlertTriangle> = {
  critico: OctagonAlert,
  alerta: AlertTriangle,
  info: Info,
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  info: "Informativo",
};

export function IncidentsPage() {
  const [selected, setSelected] = useState<Incident | null>(null);

  return (
    <div>
      <PageHeader title="Incidentes" subtitle="Reporta y gestiona bloqueos, fallas en vía o desvíos de troncales." />

      <div className="space-y-3">
        {incidents.map((incident, index) => {
          const Icon = SEVERITY_ICON[incident.severidad];
          const style = SEVERITY_STYLE[incident.severidad];
          return (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
            >
              <Card className="overflow-hidden p-0 transition-colors hover:border-base-600">
                <button onClick={() => setSelected(incident)} className="flex w-full items-start gap-4 p-4 text-left">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
                    <Icon className={`size-5 ${style.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-base-100">{incident.titulo}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style.badge}`}>
                        {SEVERITY_LABEL[incident.severidad]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-base-400">{incident.descripcion}</p>
                    <p className="mt-2 text-xs text-base-500">{incident.hace}</p>
                  </div>
                </button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <IncidentActionModal incident={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
