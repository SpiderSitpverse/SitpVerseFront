import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Clock, HandHeart, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useHelpRequests } from "@/hooks/useFleetActivity";
import { ApiError } from "@/lib/api";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export function DriverHelpPage() {
  const { userId } = useAuth();
  const requests = useHelpRequests();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<string | null>(null);

  async function accept(id: string) {
    setError(null);
    setAccepting(id);
    try {
      await fleetActivityClient.acceptHelpRequest(id);
    } catch (e) {
      setError(
        e instanceof ApiError && e.reason === "FULL" ? "Los cupos de esta alerta ya fueron tomados." : e instanceof Error ? e.message : "No se pudo aceptar.",
      );
    } finally {
      setAccepting(null);
    }
  }

  async function receive(id: string) {
    setError(null);
    setReceiving(id);
    try {
      await fleetActivityClient.confirmHelpReceived(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la atención.");
    } finally {
      setReceiving(null);
    }
  }

  const fromOthers = requests.filter((r) => r.driverId !== userId);
  const mine = requests.filter((r) => r.driverId === userId);

  return (
    <div>
      <PageHeader
        title="Ayuda a compañeros"
        subtitle="Solicitudes de ayuda de otros conductores en la vía — acepta la que puedas atender."
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

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
                    onClick={() => accept(req.id)}
                    disabled={accepting === req.id}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-status-online/10 px-3 py-1.5 text-xs font-semibold text-status-online ring-1 ring-inset ring-status-online/25 transition-colors hover:bg-status-online/15 disabled:opacity-60"
                  >
                    <HandHeart className="size-3.5" />
                    {accepting === req.id ? "Aceptando..." : "Aceptar y apoyar"}
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
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-online/10 px-2.5 py-1 text-[11px] font-medium text-status-online ring-1 ring-inset ring-status-online/25">
                      <Check className="size-3 shrink-0" />
                      {req.aceptadoPor ? `Aceptada por ${req.aceptadoPor}` : "Aceptada"}
                    </span>
                    {/* Cuando la ayuda ya llegó, el conductor lo confirma: se cierra la alerta y se pagan los puntos. */}
                    <button
                      onClick={() => receive(req.id)}
                      disabled={receiving === req.id}
                      title="Confirma que la ayuda ya llegó: se cierra la alerta y se pagan los puntos a quien te ayudó"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60"
                    >
                      <Check className="size-3.5" />
                      {receiving === req.id ? "Enviando..." : "Atención recibida"}
                    </button>
                  </div>
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
