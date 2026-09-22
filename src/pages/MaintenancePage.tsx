import { motion } from "framer-motion";
import { CheckCircle2, ClipboardCheck, Clock, MapPin, Wrench } from "lucide-react";
import { useState } from "react";
import { RepairReportModal } from "@/components/repairs/RepairReportModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useRepairReports, useRepairRequests } from "@/hooks/useRepairs";
import { cn } from "@/lib/utils";
import type { RepairReport, RepairRequest } from "@/types/repair";

const SECTION_STYLE = {
  pendiente: { label: "Pendientes por asignar", badge: "bg-status-danger/10 text-status-danger ring-status-danger/25" },
  aceptada: { label: "En reparación", badge: "bg-status-warning/10 text-status-warning ring-status-warning/25" },
  completada: { label: "Completadas", badge: "bg-status-online/10 text-status-online ring-status-online/25" },
} as const;

export function MaintenancePage() {
  const requests = useRepairRequests();
  const reports = useRepairReports();
  const [viewing, setViewing] = useState<{ request: RepairRequest; report: RepairReport } | null>(null);

  const pendientes = requests.filter((r) => r.estado === "pendiente");
  const enReparacion = requests.filter((r) => r.estado === "aceptada");
  const completadas = requests.filter((r) => r.estado === "completada");

  function reportFor(requestId: string) {
    return reports.find((r) => r.requestId === requestId);
  }

  function renderRow(req: RepairRequest, index: number) {
    const style = SECTION_STYLE[req.estado];
    const report = reportFor(req.id);
    const clickable = Boolean(report);

    return (
      <motion.div
        key={req.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
      >
        <button
          type="button"
          disabled={!clickable}
          onClick={() => report && setViewing({ request: req, report })}
          className={cn(
            "flex w-full items-start gap-4 rounded-xl p-4 text-left transition-colors",
            clickable ? "hover:bg-base-800/60" : "cursor-default",
          )}
        >
          <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", style.badge)}>
            <Wrench className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-base-100">{req.placa}</p>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", style.badge)}>
                {req.estado === "aceptada" ? "En reparación" : req.estado === "completada" ? "Completada" : "Pendiente"}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-base-500">
              <MapPin className="size-3.5" />
              {req.ubicacion} · {req.troncal}
            </p>
            <p className="mt-2 text-sm text-base-300">{req.problema}</p>

            {req.mecanicoNombre && (
              <p className="mt-2 text-xs text-base-400">
                Mecánico: <span className="text-base-200">{req.mecanicoNombre}</span>
                {req.estado === "aceptada" && !report && " · aún sin información registrada"}
                {req.estado === "aceptada" && report && " · progreso guardado, toca para revisarlo"}
                {req.estado === "completada" && " · toca para ver el reporte completo"}
              </p>
            )}
          </div>
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <PageHeader title="Mantenimiento" subtitle="Coordinación técnica de patios, talleres y revisiones preventivas." />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pendientes por asignar" value={pendientes.length} icon={Wrench} tone="warning" />
        <StatCard label="En reparación" value={enReparacion.length} icon={Clock} tone="brand" />
        <StatCard label="Completadas" value={completadas.length} icon={ClipboardCheck} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades en taller</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-status-online">
            <CheckCircle2 className="size-3.5" />
            Actualizado en vivo por los mecánicos
          </span>
        </CardHeader>
        <CardContent className="space-y-1">
          {requests.length === 0 && (
            <p className="py-8 text-center text-sm text-base-400">No hay unidades registradas en taller.</p>
          )}

          {enReparacion.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-400">
                {SECTION_STYLE.aceptada.label}
              </p>
              {enReparacion.map(renderRow)}
            </div>
          )}

          {pendientes.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-400">
                {SECTION_STYLE.pendiente.label}
              </p>
              {pendientes.map(renderRow)}
            </div>
          )}

          {completadas.length > 0 && (
            <div className="space-y-1">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-base-400">
                {SECTION_STYLE.completada.label}
              </p>
              {completadas.map(renderRow)}
            </div>
          )}
        </CardContent>
      </Card>

      <RepairReportModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        request={viewing?.request ?? null}
        report={viewing?.report ?? null}
      />
    </div>
  );
}
