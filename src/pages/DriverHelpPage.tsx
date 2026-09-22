import { motion } from "framer-motion";
import { Check, Clock, HandHeart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useHelpRequests } from "@/hooks/useFleetActivity";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "hace un momento";
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "hace 1 h" : `hace ${hours} h`;
}

export function DriverHelpPage() {
  const { userId, nombre } = useAuth();
  const requests = useHelpRequests();

  const fromOthers = requests.filter((r) => r.driverId !== userId);
  const mine = requests.filter((r) => r.driverId === userId);

  return (
    <div>
      <PageHeader
        title="Ayuda a compañeros"
        subtitle="Solicitudes de ayuda de otros conductores en la vía — acepta la que puedas atender."
      />

      <div className="space-y-3">
        {fromOthers.length === 0 && (
          <Card className="p-8 text-center text-sm text-base-400">
            No hay solicitudes de ayuda activas por ahora.
          </Card>
        )}

        {fromOthers.map((req, index) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.25 }}
          >
            <Card className="flex items-start gap-4 p-4">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  req.status === "aceptada"
                    ? "bg-status-online/10 text-status-online"
                    : "bg-status-danger/10 text-status-danger",
                )}
              >
                <TriangleAlert className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-base-100">
                    {req.placa} · {req.motivo}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                      req.status === "aceptada"
                        ? "bg-status-online/10 text-status-online ring-status-online/25"
                        : "bg-status-danger/10 text-status-danger ring-status-danger/25",
                    )}
                  >
                    {req.status === "aceptada" ? "Aceptada" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-base-400">{req.driverName}</p>
                {req.detalle && <p className="mt-1 text-sm text-base-300">{req.detalle}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-base-500">
                  <Clock className="size-3.5" />
                  {timeAgo(req.createdAt)}
                  {req.status === "aceptada" && req.aceptadoPor && <>· Aceptada por {req.aceptadoPor}</>}
                </p>

                {req.status === "pendiente" && (
                  <button
                    onClick={() => fleetActivityClient.acceptHelpRequest(req.id, nombre ?? userId ?? "")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-status-online/10 px-3 py-1.5 text-xs font-semibold text-status-online ring-1 ring-inset ring-status-online/25 transition-colors hover:bg-status-online/15"
                  >
                    <HandHeart className="size-3.5" />
                    Aceptar y apoyar
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {mine.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-base-400">Tus alertas enviadas</p>
          <div className="space-y-2">
            {mine.map((req) => (
              <Card key={req.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-base-100">{req.motivo}</p>
                  <p className="text-xs text-base-500">{timeAgo(req.createdAt)}</p>
                </div>
                {req.status === "aceptada" ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-status-online/10 px-2.5 py-1 text-[11px] font-medium text-status-online ring-1 ring-inset ring-status-online/25">
                    <Check className="size-3 shrink-0" />
                    {req.aceptadoPor ? `Aceptada por ${req.aceptadoPor}` : "Aceptada"}
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-base-800 px-2.5 py-1 text-[11px] font-medium text-base-300 ring-1 ring-inset ring-base-600">
                    Esperando ayuda
                  </span>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
