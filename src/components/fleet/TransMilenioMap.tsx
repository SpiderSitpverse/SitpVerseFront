import "leaflet/dist/leaflet.css";
import { Fragment, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvent } from "react-leaflet";
import { buses } from "@/data/buses";
import { BOGOTA_CENTER, busPositions, troncales } from "@/data/routes";
import { STATUS_LABEL } from "@/lib/status";
import type { Bus, BusStatus } from "@/types/bus";

const STATUS_COLOR: Record<BusStatus, string> = {
  operacion: "#22c55e",
  mantenimiento: "#eab308",
  "fuera-servicio": "#6b6b76",
};

const STATION_ZOOM_THRESHOLD = 15;

function useCurrentZoom(initialZoom: number) {
  const map = useMap();
  const [zoom, setZoom] = useState(initialZoom);
  useMapEvent("zoomend", () => setZoom(map.getZoom()));
  return zoom;
}

function RouteLayers({ onSelectBus }: { onSelectBus?: (bus: Bus) => void }) {
  const zoom = useCurrentZoom(12);
  const showStationLabels = zoom >= STATION_ZOOM_THRESHOLD;

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
        const pos = busPositions[bus.id];
        if (!pos) return null;
        return (
          <CircleMarker
            key={bus.id}
            center={pos}
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
