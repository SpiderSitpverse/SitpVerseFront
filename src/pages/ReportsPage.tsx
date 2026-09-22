import { Gauge, MapPinned, Route, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { BusListRow } from "@/components/fleet/BusListRow";
import { BusReportModal } from "@/components/fleet/BusReportModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { buses } from "@/data/buses";
import type { Bus } from "@/types/bus";

const BARS = [62, 78, 54, 88, 70, 95, 66];
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function ReportsPage() {
  const [query, setQuery] = useState("");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((bus) => bus.placa.toLowerCase().includes(q) || bus.troncal.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Métricas de ocupación, velocidad y kilómetros rodados." />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ocupación promedio" value={78} icon={Gauge} tone="brand" />
        <StatCard label="Velocidad media (km/h)" value={24} icon={TrendingUp} tone="success" />
        <StatCard label="Km rodados (día)" value={41280} icon={Route} tone="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ocupación semanal por troncal</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-base-400">
            <MapPinned className="size-3.5" />
            Troncal Caracas
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 px-1">
            {BARS.map((value, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-700 ease-out"
                    style={{ height: `${value}%` }}
                  />
                </div>
                <span className="text-[11px] text-base-400">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Listado de unidades</CardTitle>
          <SearchInput
            placeholder="Buscar bus, placa, ruta..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56"
          />
        </CardHeader>
        <CardContent className="space-y-1">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-base-400">No se encontraron unidades.</p>
          )}
          {filtered.map((bus, index) => (
            <BusListRow key={bus.id} bus={bus} index={index} onClick={() => setSelectedBus(bus)} />
          ))}
        </CardContent>
      </Card>

      <BusReportModal bus={selectedBus} onClose={() => setSelectedBus(null)} />
    </div>
  );
}
