import { AnimatePresence, motion } from "framer-motion";
import { Bus as BusIcon, Check, CircleStop, Clock, Crosshair, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DriverRoutingPanel } from "@/components/driver/DriverRoutingPanel";
import { PreTripInspectionModal, type PreTripInspection } from "@/components/driver/PreTripInspectionModal";
import { ReportProblemModal } from "@/components/driver/ReportProblemModal";
import { TransMilenioMap } from "@/components/fleet/TransMilenioMap";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useAssignedRoute } from "@/hooks/useFleetData";
import { useActiveTrips } from "@/hooks/useFleetActivity";
import { useMyAssignedRoutes } from "@/hooks/useRouting";
import { busReportClient } from "@/lib/busReportClient";
import { ApiError } from "@/lib/api";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { PositionPublisher } from "@/lib/positionPublisher";

/** Una lectura con este margen de error (metros) o mejor se considera "señal GPS buena" (solo para el color). */
const GOOD_FIX_METERS = 50;

export function DriverHomePage() {
  const { userId, nombre } = useAuth();
  const activeTrips = useActiveTrips();
  const myRoutes = useMyAssignedRoutes();
  const [reportOpen, setReportOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [hasFix, setHasFix] = useState(false);
  const [picking, setPicking] = useState(false);
  // Decide qué posición se publica y cuándo (espera inicial, filtro, quieto/en movimiento): ver lib/positionPublisher.ts.
  const publisherRef = useRef(new PositionPublisher());

  const assignment = useAssignedRoute() ?? undefined;
  const activeTrip = assignment ? activeTrips.find((t) => t.busId === assignment.busId) : undefined;
  const started = Boolean(activeTrip);
  // Con el viaje en curso pero sin una lectura utilizable todavía: "Buscando señal GPS…".
  const searching = started && !hasFix;

  // Con el viaje en curso, comparte la ubicación del bus (PATCH /fleet/buses/:id/position, §6).
  const busId = assignment?.busId;
  useEffect(() => {
    if (!started || !busId || !("geolocation" in navigator)) return;
    const publisher = publisherRef.current;
    publisher.reset(Date.now());
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: meters, speed } = pos.coords;
        const update = publisher.push(
          { lat: latitude, lng: longitude, accuracy: meters, timestamp: pos.timestamp, speed },
          Date.now(),
        );
        setAccuracy(Math.round(update.accuracy));
        if (update.state !== "searching") setHasFix(true);
        if (update.publish) fleetActivityClient.sendPosition(busId, update.publish[0], update.publish[1]).catch(() => undefined);
      },
      (err) =>
        setError(
          err.code === err.PERMISSION_DENIED
            ? "No se pudo obtener tu ubicación. Activa el permiso de ubicación del navegador para que el mapa te siga."
            : "Señal de ubicación débil. Si estás en interiores, acércate a una ventana o usa el celular con GPS.",
        ),
      // maximumAge 0: siempre una lectura nueva (no una guardada); timeout: no esperar para siempre.
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      setAccuracy(null);
      setHasFix(false);
      setPicking(false);
    };
  }, [started, busId]);

  /** El conductor marca en el mapa dónde está el bus: se envía de inmediato y el GPS impreciso ya no lo desplaza. */
  function pinPosition([lat, lng]: [number, number]) {
    if (!busId) return;
    publisherRef.current.pin([lat, lng], Date.now());
    setHasFix(true);
    setPicking(false);
    fleetActivityClient
      .sendPosition(busId, lat, lng)
      .then(() => setConfirmation("Ubicación marcada. El bus se ve en ese punto."))
      .catch(() => setError("No se pudo guardar la ubicación marcada."));
  }

  useEffect(() => {
    if (!confirmation) return;
    const id = setTimeout(() => setConfirmation(null), 4000);
    return () => clearTimeout(id);
  }, [confirmation]);

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setConfirmation(done);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
    }
  }

  // Los modales muestran el error si estas promesas fallan.
  async function handleInspectionSubmit(inspection: PreTripInspection) {
    if (!assignment) return;
    await busReportClient.saveReport(assignment.busId, inspection);
    await fleetActivityClient.startTrip(assignment.busId);
    setInspectionOpen(false);
    setConfirmation("Ruta iniciada. Tu reporte de inspección ya es visible para el administrador.");
  }

  function handleFinish() {
    if (!assignment) return;
    void run(() => fleetActivityClient.endTrip(assignment.busId), "Ruta finalizada. Ya no apareces como bus activo.");
  }

  async function handleReportSubmit(motivo: string, detalle: string, photos: string[]) {
    if (!assignment) return;
    const { failedPhotos } = await fleetActivityClient.reportIncident(assignment.busId, motivo, detalle, photos);
    setReportOpen(false);
    setConfirmation(
      failedPhotos > 0
        ? `Reporte enviado, pero ${failedPhotos} foto(s) no se pudieron adjuntar. Administración fue notificada.`
        : "Reporte enviado. Administración fue notificada y decidirá cuántos conductores necesita.",
    );
  }

  if (!assignment) {
    return (
      <div>
        <PageHeader title="Mi ruta" subtitle="No tienes una ruta asignada por ahora." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mi ruta" subtitle={`Hola, ${nombre ?? userId}. Esta es tu asignación de hoy.`} />

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-status-danger/10 px-3.5 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 flex items-center gap-2 overflow-hidden rounded-lg bg-status-online/10 px-3.5 py-2.5 text-sm text-status-online ring-1 ring-inset ring-status-online/25"
          >
            <Check className="size-4 shrink-0" />
            {confirmation}
          </motion.div>
        )}
      </AnimatePresence>

      <DriverRoutingPanel />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ruta asignada</CardTitle>
            <span
              className={
                started
                  ? "inline-flex items-center gap-1.5 rounded-full bg-status-online/10 px-2.5 py-1 text-[11px] font-medium text-status-online ring-1 ring-inset ring-status-online/25"
                  : "inline-flex items-center gap-1.5 rounded-full bg-base-800 px-2.5 py-1 text-[11px] font-medium text-base-300 ring-1 ring-inset ring-base-600"
              }
            >
              <span className={`size-1.5 rounded-full ${started ? "bg-status-online" : "bg-base-400"}`} />
              {started ? "En ruta" : "Sin iniciar"}
            </span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-base-800 text-base-200">
                <BusIcon className="size-5" />
              </div>
              <div>
                <p className="text-base font-bold text-base-50">{assignment.placa}</p>
                <p className="text-sm text-base-400">{assignment.troncal}</p>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              {assignment.turno && (
                <div className="flex items-center justify-between">
                  <dt className="text-base-400">Turno</dt>
                  <dd className="font-medium text-base-100">{assignment.turno}</dd>
                </div>
              )}
              {assignment.horaSalida && (
                <div className="flex items-center justify-between">
                  <dt className="text-base-400">Hora de salida</dt>
                  <dd className="font-medium text-base-100">{assignment.horaSalida}</dd>
                </div>
              )}
              {started && accuracy !== null && (
                <div className="flex items-center justify-between">
                  <dt className="text-base-400">Precisión de ubicación</dt>
                  <dd
                    className={`font-medium ${
                      searching ? "text-base-300" : accuracy <= GOOD_FIX_METERS ? "text-status-online" : "text-status-danger"
                    }`}
                  >
                    {searching ? `Buscando señal GPS… (±${accuracy} m)` : `±${accuracy} m`}
                  </dd>
                </div>
              )}
              {activeTrip && (
                <div className="flex items-center justify-between">
                  <dt className="text-base-400">Iniciaste a las</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-base-100">
                    <Clock className="size-3.5 text-base-400" />
                    {new Date(activeTrip.startedAt).toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </dd>
                </div>
              )}
            </dl>

            {started && (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setPicking((p) => !p)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                    picking
                      ? "bg-brand-500/10 text-brand-400 ring-brand-500/30"
                      : "bg-base-800 text-base-200 ring-base-600 hover:bg-base-700"
                  }`}
                >
                  <Crosshair className="size-4" />
                  {picking ? "Cancelar" : "Marcar mi ubicación en el mapa"}
                </button>
                {picking && (
                  <p className="text-xs text-brand-400">
                    Toca en el mapa el punto exacto donde está el bus. Úsalo si la ubicación automática se ve corrida.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2.5 pt-1">
              {!started ? (
                <button
                  onClick={() => setInspectionOpen(true)}
                  disabled={busy}
                  className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                >
                  Iniciar ruta
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setReportOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-status-danger/10 px-4 py-2.5 text-sm font-semibold text-status-danger ring-1 ring-inset ring-status-danger/25 transition-colors hover:bg-status-danger/15"
                  >
                    <TriangleAlert className="size-4" />
                    Reportar problema
                  </button>
                  <button
                    onClick={handleFinish}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-base-800 px-4 py-2.5 text-sm font-semibold text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
                  >
                    <CircleStop className="size-4" />
                    Finalizar ruta
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden lg:col-span-3">
          <CardHeader>
            <CardTitle>Mapa de operaciones</CardTitle>
          </CardHeader>
          <div className="h-80 border-t border-base-700/60 sm:h-[26rem]">
            <TransMilenioMap onPickPosition={picking ? pinPosition : undefined} alternativeRoutes={myRoutes} />
          </div>
        </Card>
      </div>

      <ReportProblemModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReportSubmit} />

      <PreTripInspectionModal
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        assignment={assignment}
        onSubmit={handleInspectionSubmit}
      />
    </div>
  );
}
