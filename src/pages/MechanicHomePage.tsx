import { motion } from "framer-motion";
import { Check, ClipboardList, MapPin, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { RepairFormModal } from "@/components/mechanic/RepairFormModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useRepairRequests } from "@/hooks/useRepairs";
import { repairClient } from "@/lib/repairClient";
import type { RepairReport, RepairRequest } from "@/types/repair";

export function MechanicHomePage() {
  const { userId, nombre } = useAuth();
  const requests = useRepairRequests();
  const [formRequest, setFormRequest] = useState<RepairRequest | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const id = setTimeout(() => setConfirmation(null), 4000);
    return () => clearTimeout(id);
  }, [confirmation]);

  const pending = requests.filter((r) => r.estado === "pendiente");
  const mine = requests.filter((r) => r.estado === "aceptada" && r.mecanicoId === userId);

  function handleAccept(request: RepairRequest) {
    if (!userId) return;
    repairClient.acceptRequest(request.id, userId, nombre ?? userId);
    setFormRequest({ ...request, estado: "aceptada", mecanicoId: userId, mecanicoNombre: nombre ?? userId });
  }

  function handleSubmit(report: RepairReport) {
    repairClient.submitReport(report);
    setFormRequest(null);
    setConfirmation("Reparación guardada. El bus ya quedó registrado como reparado.");
  }

  return (
    <div>
      <PageHeader
        title="Solicitudes de reparación"
        subtitle={`Hola, ${nombre ?? userId}. Acepta una solicitud para empezar a trabajar en ella.`}
      />

      {confirmation && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-2 rounded-lg bg-status-online/10 px-3.5 py-2.5 text-sm text-status-online ring-1 ring-inset ring-status-online/25"
        >
          <Check className="size-4 shrink-0" />
          {confirmation}
        </motion.div>
      )}

      {mine.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-400">En reparación</p>
          <div className="space-y-3">
            {mine.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                      <Wrench className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-base-100">{req.placa}</p>
                      <p className="text-xs text-base-400">{req.troncal}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormRequest(req)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                  >
                    <ClipboardList className="size-3.5" />
                    Llenar formato
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-400">Solicitudes pendientes</p>
      <div className="space-y-3">
        {pending.length === 0 && (
          <Card className="p-8 text-center text-sm text-base-400">No hay solicitudes pendientes por ahora.</Card>
        )}

        {pending.map((req, index) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
          >
            <Card className="flex items-start gap-4 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-danger/10 text-status-danger">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-base-100">{req.placa}</p>
                  <span className="rounded-full bg-base-800 px-2.5 py-0.5 text-[11px] font-medium text-base-300 ring-1 ring-inset ring-base-600">
                    {req.troncal}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-base-500">
                  <MapPin className="size-3.5" />
                  {req.ubicacion}
                </p>
                <p className="mt-2 text-sm text-base-300">{req.problema}</p>

                <button
                  onClick={() => handleAccept(req)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-status-online/10 px-3.5 py-2 text-xs font-semibold text-status-online ring-1 ring-inset ring-status-online/25 transition-colors hover:bg-status-online/15"
                >
                  <Check className="size-3.5" />
                  Aceptar reparación
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <RepairFormModal
        open={formRequest !== null}
        onClose={() => setFormRequest(null)}
        request={formRequest}
        mecanicoId={userId ?? ""}
        mecanicoNombre={nombre ?? userId ?? ""}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
