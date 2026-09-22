import { motion } from "framer-motion";
import { ClipboardList, Eye, Wrench } from "lucide-react";
import { useState } from "react";
import { RepairFormModal } from "@/components/mechanic/RepairFormModal";
import { RepairReportModal } from "@/components/mechanic/RepairReportModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useRepairReports, useRepairRequests } from "@/hooks/useRepairs";
import { repairClient } from "@/lib/repairClient";
import type { RepairReport, RepairRequest } from "@/types/repair";

export function MechanicHistoryPage() {
  const { userId, nombre } = useAuth();
  const requests = useRepairRequests();
  const reports = useRepairReports();
  const [formRequest, setFormRequest] = useState<RepairRequest | null>(null);
  const [viewing, setViewing] = useState<{ request: RepairRequest; report: RepairReport } | null>(null);

  const mine = requests.filter((r) => r.mecanicoId === userId).sort((a, b) => (a.estado === b.estado ? 0 : a.estado === "aceptada" ? -1 : 1));

  function handleSubmit(report: RepairReport) {
    repairClient.submitReport(report);
    setFormRequest(null);
  }

  return (
    <div>
      <PageHeader
        title="Mis reparaciones"
        subtitle="Los buses que has elegido para reparar, con la descripción del daño."
      />

      <div className="space-y-3">
        {mine.length === 0 && (
          <Card className="p-8 text-center text-sm text-base-400">
            Aún no has aceptado ninguna solicitud de reparación.
          </Card>
        )}

        {mine.map((req, index) => {
          const report = reports.find((r) => r.requestId === req.id);
          return (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
            >
              <Card className="flex items-start gap-4 p-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                    req.estado === "completada"
                      ? "bg-status-online/10 text-status-online"
                      : "bg-status-warning/10 text-status-warning"
                  }`}
                >
                  <Wrench className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-base-100">{req.placa}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                        req.estado === "completada"
                          ? "bg-status-online/10 text-status-online ring-status-online/25"
                          : "bg-status-warning/10 text-status-warning ring-status-warning/25"
                      }`}
                    >
                      {req.estado === "completada" ? "Completada" : "En reparación"}
                    </span>
                  </div>
                  <p className="text-xs text-base-400">{req.troncal}</p>
                  <p className="mt-2 text-sm text-base-300">{req.problema}</p>

                  {req.estado === "completada" && report ? (
                    <button
                      onClick={() => setViewing({ request: req, report })}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-base-800 px-3.5 py-2 text-xs font-semibold text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
                    >
                      <Eye className="size-3.5" />
                      Ver reporte
                    </button>
                  ) : (
                    <button
                      onClick={() => setFormRequest(req)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                    >
                      <ClipboardList className="size-3.5" />
                      Llenar formato
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <RepairFormModal
        open={formRequest !== null}
        onClose={() => setFormRequest(null)}
        request={formRequest}
        mecanicoId={userId ?? ""}
        mecanicoNombre={nombre ?? userId ?? ""}
        onSubmit={handleSubmit}
      />

      <RepairReportModal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        request={viewing?.request ?? null}
        report={viewing?.report ?? null}
      />
    </div>
  );
}
