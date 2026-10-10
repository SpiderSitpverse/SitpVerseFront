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
import { GpsFilter, type GpsFix } from "@/lib/gpsFilter";
import { distanceMeters } from "@/lib/routeSnap";

const SEND_EVERY_MS = 3000;
/** Una lectura con este margen de error (metros) o mejor se considera "señal GPS buena". */
const GOOD_FIX_METERS = 50;
/**
 * Al arrancar, el navegador da primero una ubicación aproximada (por red/wifi, con cientos de metros de error)
 * y solo después engancha el GPS. Esas primeras lecturas no se usan: se espera una buena.
 * La espera termina antes si la precisión deja de mejorar (un PC sin GPS nunca llegará a 50 m) y, en todo caso,
 * a los 30 s. Al terminar se arranca con la MEJOR lectura de la espera, no con la última.
 */
const MIN_WARMUP_MS = 8_000;
const STALL_MS = 8_000;
const WARMUP_MS = 30_000;
/** Punto marcado a mano en el mapa: se trata como una lectura de alta confianza que casi no se mueve sola. */
const PINNED_ACCURACY_METERS = 5;
const PINNED_SPEED = 0.3;
/** Por encima de esta velocidad (m/s) el bus se considera en movimiento y el punto marcado deja de "sostenerse". */
const MOVING_METERS_PER_SECOND = 1;
/** Un movimiento menor que esto (o que el margen de error) estando quieto se considera ruido y no se publica. */
const HOLD_MIN_METERS = 25;

export function DriverHomePage() {
  const { userId, nombre } = useAuth();
  const activeTrips = useActiveTrips();
  const myRoutes = useMyAssignedRoutes();
  const [reportOpen, setReportOpen] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastSent = useRef(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [hasFix, setHasFix] = useState(false);
  const [picking, setPicking] = useState(false);
  const filterRef = useRef<GpsFilter>(new GpsFilter());
  const acceptedRef = useRef(false);
  const pinnedRef = useRef(false);
  const lastPublishedRef = useRef<[number, number] | null>(null);

  const assignment = useAssignedRoute() ?? undefined;
  const activeTrip = assignment ? activeTrips.find((t) => t.busId === assignment.busId) : undefined;
  const started = Boolean(activeTrip);
  // Con el viaje en curso pero sin una lectura utilizable todavía: "Buscando señal GPS…".
  const searching = started && !hasFix;

  // Con el viaje en curso, comparte la ubicación del bus (PATCH /fleet/buses/:id/position, §6).
  const busId = assignment?.busId;
  useEffect(() => {
    if (!started || !busId || !("geolocation" in navigator)) return;
    filterRef.current = new GpsFilter();
    acceptedRef.current = false;
    pinnedRef.current = false;
    lastPublishedRef.current = null;
    const openedAt = Date.now();
    let best: GpsFix | null = null;
    let bestAt = openedAt;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: meters, speed } = pos.coords;
        const now = Date.now();
        setAccuracy(Math.round(meters));
        let fix: GpsFix = { lat: latitude, lng: longitude, accuracy: meters, timestamp: pos.timestamp, speed };

        if (!acceptedRef.current) {
          // Arranque en frío: sin una lectura buena todavía, ni se usa ni se muestra (así el bus no "baila" entre calles).
          if (!best || meters < best.accuracy) {
            best = fix;
            bestAt = now;
          }
          const good = meters <= GOOD_FIX_METERS;
          const stalled = now - openedAt >= MIN_WARMUP_MS && now - bestAt >= STALL_MS;
          if (!good && !stalled && now - openedAt < WARMUP_MS) return;
          acceptedRef.current = true;
          if (!good) fix = best; // se arranca con la mejor lectura de la espera
        }

        // Con el punto marcado a mano, las lecturas imprecisas y sin movimiento (típico de un PC sin GPS) NO lo
        // arrastran de vuelta a la ubicación errada del navegador. Un GPS bueno de verdad lo libera: vuelve al seguimiento normal.
        if (pinnedRef.current && meters <= GOOD_FIX_METERS) pinnedRef.current = false;
        const holdPin = pinnedRef.current && (speed ?? 0) < MOVING_METERS_PER_SECOND;
        // Filtro de Kalman: pesa cada lectura según su margen de error, así el punto sigue al bus sin saltos.
        const fixed = (holdPin ? filterRef.current.estimate : null) ?? filterRef.current.update(fix);
        setHasFix(true);
        // Quieto (sin velocidad real) y la posición nueva cae dentro del margen de error de la última publicada:
        // es ruido del GPS, no movimiento. No se publica, así el bus no "camina" estando parado.
        const last = lastPublishedRef.current;
        const moving = (speed ?? 0) >= MOVING_METERS_PER_SECOND;
        if (last && !moving && distanceMeters(last, [fixed.lat, fixed.lng]) < Math.max(HOLD_MIN_METERS, fixed.accuracy)) return;
        if (now - lastSent.current < SEND_EVERY_MS) return;
        lastSent.current = now;
        lastPublishedRef.current = [fixed.lat, fixed.lng];
        fleetActivityClient.sendPosition(busId, fixed.lat, fixed.lng).catch(() => undefined);
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
    const pinned = new GpsFilter(PINNED_SPEED);
    pinned.update({ lat, lng, accuracy: PINNED_ACCURACY_METERS, timestamp: Date.now() });
    filterRef.current = pinned;
    acceptedRef.current = true;
    pinnedRef.current = true;
    lastPublishedRef.current = [lat, lng];
    lastSent.current = Date.now();
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
