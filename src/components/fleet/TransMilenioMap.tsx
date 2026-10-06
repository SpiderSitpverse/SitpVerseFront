import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Fragment, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvent } from "react-leaflet";
import { BOGOTA_CENTER, troncales } from "@/data/routes";
import { useActiveTrips } from "@/hooks/useFleetActivity";
import { useBuses } from "@/hooks/useFleetData";
import { STATUS_LABEL } from "@/lib/status";
import type { Bus, BusStatus } from "@/types/bus";
import type { ActiveTrip } from "@/types/driver";

const STATUS_COLOR: Record<BusStatus, string> = {
  operacion: "#22c55e",
  mantenimiento: "#eab308",
  "fuera-servicio": "#6b6b76",
};

const LIVE_TRIP_COLOR = "#3b82f6";

const STATION_ZOOM_THRESHOLD = 15;

function useCurrentZoom(initialZoom: number) {
  const map = useMap();
  const [zoom, setZoom] = useState(initialZoom);
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
}

function liveTripIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="relative flex size-4">
      <span class="absolute inline-flex size-full animate-ping rounded-full opacity-75" style="background-color:${LIVE_TRIP_COLOR}"></span>
      <span class="relative flex size-4 items-center justify-center rounded-full ring-2 ring-base-950" style="background-color:${LIVE_TRIP_COLOR}"></span>
    </span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function formatStartedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function RouteLayers({ onSelectBus }: { onSelectBus?: (bus: Bus) => void }) {
  const zoom = useCurrentZoom(12);
  const showStationLabels = zoom >= STATION_ZOOM_THRESHOLD;
  const activeTrips = useActiveTrips();
  const buses = useBuses();
  const icon = useMemo(() => liveTripIcon(), []);
  const activeBusIds = useMemo(() => new Set(activeTrips.map((t) => t.busId)), [activeTrips]);

  function openReport(busId: string, fallback: Partial<Bus>) {
    const match = buses.find((b) => b.id === busId);
    onSelectBus?.(
      match ?? {
        id: busId,
        placa: fallback.placa ?? busId,
        troncal: fallback.troncal ?? "",
        ubicacion: fallback.ubicacion ?? "",
        estado: "operacion",
      },
    );
  }

  return (
    <>
      {troncales.map((t) => (
        <Fragment key={t.id}>
          <Polyline positions={t.coords} pathOptions={{ color: t.color, weight: 4, opacity: 0.85 }} />

          {t.estaciones.map((estacion) => (
            <CircleMarker
              key={`${estacion.nombre}-${showStationLabels}`}
              center={estacion.coords}
              radius={3.5}
              pathOptions={{ color: t.color, weight: 1.5, fillColor: "#f7f7f9", fillOpacity: 1 }}
            >
              <Tooltip permanent={showStationLabels} direction="top" offset={[0, -4]} opacity={0.95}>
                {estacion.nombre}
              </Tooltip>
            </CircleMarker>
          ))}

          {t.portales.map((portal) => (
            <CircleMarker
              key={portal.nombre}
              center={portal.coords}
              radius={6}
              pathOptions={{ color: t.color, weight: 3, fillColor: "#f7f7f9", fillOpacity: 1 }}
            >
              <Tooltip permanent direction="top" offset={[0, -7]} opacity={0.95} className="font-semibold">
                {portal.nombre}
              </Tooltip>
            </CircleMarker>
          ))}
        </Fragment>
      ))}

      {buses.map((bus) => {
        if (bus.lat === undefined || bus.lng === undefined || activeBusIds.has(bus.id)) return null;
        return (
          <CircleMarker
            key={bus.id}
            center={[bus.lat, bus.lng]}
            radius={7}
            pathOptions={{
              color: "#0f0f11",
              weight: 2,
              fillColor: STATUS_COLOR[bus.estado],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="text-sm font-bold text-base-950">{bus.placa}</p>
              <p className="text-xs text-base-500">
                {bus.troncal} · {bus.ubicacion}
              </p>
              <p className="mt-1 text-xs font-medium text-base-700">{STATUS_LABEL[bus.estado]}</p>
              {onSelectBus && (
                <button
                  onClick={() => onSelectBus(bus)}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-500"
                >
                  Ver reporte →
                </button>
              )}
            </Popup>
          </CircleMarker>
        );
      })}

      {activeTrips.map((trip: ActiveTrip) => {
        if (trip.lat === undefined || trip.lng === undefined) return null;
        return (
          <Marker key={trip.busId} position={[trip.lat, trip.lng]} icon={icon}>
            <Popup>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                <span className="size-1.5 rounded-full bg-blue-600" />
                En vivo
              </p>
              <p className="mt-1 text-sm font-bold text-base-950">{trip.placa}</p>
              <p className="text-xs text-base-500">{trip.troncal}</p>
              <p className="mt-1 text-xs text-base-600">
                {trip.driverName} · salió {formatStartedAt(trip.startedAt)}
              </p>
              {onSelectBus && (
                <button
                  onClick={() => openReport(trip.busId, { placa: trip.placa, troncal: trip.troncal })}
                  className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-500"
                >
                  Ver reporte →
                </button>
              )}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export function TransMilenioMap({ onSelectBus }: { onSelectBus?: (bus: Bus) => void }) {
  return (
    <MapContainer center={BOGOTA_CENTER} zoom={12} scrollWheelZoom className="size-full">
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
        maxZoom={18}
        maxNativeZoom={16}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
        maxNativeZoom={16}
      />

      <RouteLayers onSelectBus={onSelectBus} />
    </MapContainer>
  );
}
