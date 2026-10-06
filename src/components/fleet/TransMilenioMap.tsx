import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvent } from "react-leaflet";
import { BOGOTA_CENTER, troncales } from "@/data/routes";
import { useActiveTrips } from "@/hooks/useFleetActivity";
import { useBuses } from "@/hooks/useFleetData";
import { useSmoothPosition } from "@/hooks/useSmoothPosition";
import type { Bus } from "@/types/bus";
import type { ActiveTrip } from "@/types/driver";

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

      {/* El mapa muestra SOLO los buses con viaje en curso (los de reposo o finalizados no se dibujan). */}
      {activeTrips.map((trip: ActiveTrip) => (
        <LiveBusMarker
          key={trip.busId}
          trip={trip}
          icon={icon}
          onOpenReport={onSelectBus ? () => openReport(trip.busId, { placa: trip.placa, troncal: trip.troncal }) : undefined}
        />
      ))}
    </>
  );
}

/** Un bus en vivo: su posición se pega a la línea de su troncal y se anima entre lecturas (ver useSmoothPosition). */
function LiveBusMarker({ trip, icon, onOpenReport }: { trip: ActiveTrip; icon: L.DivIcon; onOpenReport?: () => void }) {
  const position = useSmoothPosition(trip.lat, trip.lng, trip.troncal);
  if (!position) return null;
  return (
    <Marker position={position} icon={icon}>
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
        {onOpenReport && (
          <button
            onClick={onOpenReport}
            className="mt-2 text-xs font-semibold text-brand-600 hover:text-brand-500"
          >
            Ver reporte →
          </button>
        )}
      </Popup>
    </Marker>
  );
}

/** Modo "marcar punto": un clic en el mapa entrega las coordenadas y el cursor pasa a ser una mira. */
function PickPosition({ onPick }: { onPick: (point: [number, number]) => void }) {
  const map = useMap();
  useMapEvent("click", (e) => onPick([e.latlng.lat, e.latlng.lng]));
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = "crosshair";
    return () => {
      container.style.cursor = "";
    };
  }, [map]);
  return null;
}

export function TransMilenioMap({
  onSelectBus,
  onPickPosition,
}: {
  onSelectBus?: (bus: Bus) => void;
  /** Si se pasa, el mapa entra en modo "marcar punto" (el clic ya no abre popups). */
  onPickPosition?: (point: [number, number]) => void;
}) {
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
      {onPickPosition && <PickPosition onPick={onPickPosition} />}

      <RouteLayers onSelectBus={onSelectBus} />
    </MapContainer>
  );
}
