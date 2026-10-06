import { Gauge, Route, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { BusListRow } from "@/components/fleet/BusListRow";
import { BusReportModal } from "@/components/fleet/BusReportModal";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatCard } from "@/components/ui/StatCard";
import { useBuses } from "@/hooks/useFleetData";
import type { Bus } from "@/types/bus";

export function ReportsPage() {
  const buses = useBuses();
  const [query, setQuery] = useState("");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((bus) => bus.placa.toLowerCase().includes(q) || bus.troncal.toLowerCase().includes(q));
  }, [buses, query]);

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Métricas de ocupación, velocidad y kilómetros rodados." />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ocupación promedio" value={null} icon={Gauge} tone="brand" />
        <StatCard label="Velocidad media (km/h)" value={null} icon={TrendingUp} tone="success" />
        <StatCard label="Km rodados (día)" value={null} icon={Route} tone="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ocupación semanal por troncal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-sm text-base-400">Sin datos de ocupación todavía.</p>
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
