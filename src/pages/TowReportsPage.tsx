import { Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import { blockagesStore, busesStore } from "@/lib/backend";
import { formatDateTime, mapTowAssignment } from "@/lib/mappers";
import { routingClient, type TowReportFilters } from "@/lib/routingClient";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ApiTowAssignment } from "@/types/api";
import type { TowAssignment, TowState } from "@/types/routing";

const STATE_BADGE: Record<TowState, string> = {
  asignada: "bg-status-warning/10 text-status-warning ring-status-warning/25",
  "en-curso": "bg-sky-500/10 text-sky-400 ring-sky-500/25",
  completada: "bg-status-online/10 text-status-online ring-status-online/25",
};
const STATE_LABEL: Record<TowState, string> = { asignada: "Asignada", "en-curso": "En curso", completada: "Completada" };

/** El back devuelve 50 por defecto. */
const PAGE_SIZE = 50;

const inputClass =
  "w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60";

/** `2026-10-09` → inicio / fin de ese día (hora local) en ISO, que es lo que pide el back. */
const startOfDay = (day: string) => new Date(`${day}T00:00:00`).toISOString();
const endOfDay = (day: string) => new Date(`${day}T23:59:59.999`).toISOString();

/** HU-50: listado de grúas y cuadrillas asignadas, con filtros. Se actualiza solo cuando llegan eventos. */
export function TowReportsPage() {
  const [truck, setTruck] = useState("");
  const [crew, setCrew] = useState("");
  const [status, setStatus] = useState<"" | ApiTowAssignment["status"]>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<ApiTowAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  const buses = useStore(busesStore);
  // Los eventos de grúa recargan los bloqueos: ese cambio vuelve a pedir el listado.
  const blockages = useStore(blockagesStore);

  const filters = useMemo<TowReportFilters>(
    () => ({
      towTruck: truck.trim() || undefined,
      crew: crew.trim() || undefined,
      status: status || undefined,
      from: from ? startOfDay(from) : undefined,
      to: to ? endOfDay(to) : undefined,
    }),
    [truck, crew, status, from, to],
  );

  useEffect(() => {
    let cancelled = false;
    // Pequeña espera para no pedir en cada tecla.
    const timer = setTimeout(() => {
      routingClient
        .listTowReports(filters)
        .then((data) => {
          if (cancelled) return;
          setRows(data);
          setError(null);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof ApiError ? e.message : "No se pudo cargar el listado.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, blockages]);

  const plates = useMemo(() => new Map(buses.map((b) => [b.id, b.plate])), [buses]);
  const tows: TowAssignment[] = useMemo(
    () => rows.map((r) => mapTowAssignment(r, (busId) => plates.get(busId) ?? "—")),
    [rows, plates],
  );

  async function finish(id: string) {
    setFinishingId(id);
    setError(null);
    try {
      await routingClient.completeTow(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo terminar el servicio.");
    } finally {
      setFinishingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Grúas y cuadrillas"
        subtitle="Servicios de grúa asignados a bloqueos e incidentes. Termina un servicio para liberar la grúa y su cuadrilla."
      />

      <Card className="mb-5 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1 text-xs font-medium text-base-300">
            Grúa
            <input value={truck} onChange={(e) => setTruck(e.target.value)} placeholder="Ej. G-01" className={inputClass} />
          </label>
          <label className="space-y-1 text-xs font-medium text-base-300">
            Cuadrilla
            <input value={crew} onChange={(e) => setCrew(e.target.value)} placeholder="Ej. Cuadrilla Norte" className={inputClass} />
          </label>
          <label className="space-y-1 text-xs font-medium text-base-300">
            Estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | ApiTowAssignment["status"])}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="ASSIGNED">Asignadas</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="COMPLETED">Completadas</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-base-300">
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </label>
          <label className="space-y-1 text-xs font-medium text-base-300">
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </label>
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
          {error}
        </p>
      )}

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-10 text-center text-sm text-base-400">Cargando…</p>
        ) : tows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-base-400">
            <Truck className="size-6 text-base-500" />
            No hay servicios de grúa con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-base-700 text-[11px] uppercase tracking-wider text-base-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Grúa</th>
                  <th className="px-4 py-3 font-semibold">Cuadrilla</th>
                  <th className="px-4 py-3 font-semibold">Incidente</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Asignada</th>
                  <th className="px-4 py-3 font-semibold">Terminada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-base-800">
                {tows.map((tow) => (
                  <tr key={tow.id} className="text-base-200">
                    <td className="px-4 py-3 font-semibold text-base-100">{tow.grua}</td>
                    <td className="px-4 py-3">{tow.cuadrilla}</td>
                    <td className="px-4 py-3">
                      <p className="text-base-100">{tow.incidente?.titulo ?? "—"}</p>
                      <p className="text-xs text-base-500">{tow.placa}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", STATE_BADGE[tow.estado])}>
                        {STATE_LABEL[tow.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-base-400">{formatDateTime(tow.creadoEn)}</td>
                    <td className="px-4 py-3 text-xs text-base-400">{tow.completadoEn ? formatDateTime(tow.completadoEn) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {tow.estado !== "completada" && (
                        <button
                          type="button"
                          onClick={() => finish(tow.id)}
                          disabled={finishingId === tow.id}
                          className="rounded-lg bg-base-800 px-3 py-1 text-xs font-medium text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-50"
                        >
                          {finishingId === tow.id ? "Terminando…" : "Terminar servicio"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {tows.length >= PAGE_SIZE && (
        <p className="mt-3 text-xs text-base-500">Mostrando los {PAGE_SIZE} más recientes. Usa los filtros para acotar la búsqueda.</p>
      )}
    </div>
  );
}
