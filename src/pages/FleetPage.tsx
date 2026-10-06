import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BusListRow } from "@/components/fleet/BusListRow";
import { BusReportModal } from "@/components/fleet/BusReportModal";
import { TransMilenioMap } from "@/components/fleet/TransMilenioMap";
import { TroncalLegend } from "@/components/fleet/TroncalLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useBuses } from "@/hooks/useFleetData";
import type { Bus, BusStatus } from "@/types/bus";

const FILTERS: { value: BusStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "operacion", label: "En operación" },
  { value: "mantenimiento", label: "En mantenimiento" },
  { value: "fuera-servicio", label: "Fuera de servicio" },
];

export function FleetPage() {
  const [filter, setFilter] = useState<BusStatus | "todos">("todos");
  const [query, setQuery] = useState("");
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const buses = useBuses();

  const counts = useMemo(
    () => ({
      todos: buses.length,
      operacion: buses.filter((b) => b.estado === "operacion").length,
      mantenimiento: buses.filter((b) => b.estado === "mantenimiento").length,
      "fuera-servicio": buses.filter((b) => b.estado === "fuera-servicio").length,
    }),
    [buses],
  );

  const filtered = useMemo(() => {
    return buses.filter((bus) => {
      const matchesFilter = filter === "todos" || bus.estado === filter;
      const matchesQuery =
        query.trim() === "" ||
        bus.placa.toLowerCase().includes(query.toLowerCase()) ||
        bus.troncal.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [buses, filter, query]);

  return (
    <div>
      <PageHeader
        title="Monitoreo de flota"
        subtitle="Panel de operaciones en tiempo real - Portal de Bogotá D.C."
        actions={
          <Link
            to="/buses/registro"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-base-800 px-4 py-2.5 text-sm font-medium text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
          >
            Registro de material rodante
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={filter}
          onChange={(v) => setFilter(v as BusStatus | "todos")}
          options={FILTERS.map((f) => ({ ...f, count: counts[f.value], tone: f.value === "todos" ? "brand" : "neutral" }))}
        />
        <SearchInput
          placeholder="Buscar bus, placa, ruta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Card className="overflow-hidden xl:col-span-3">
          <CardHeader>
            <CardTitle>Mapa de operaciones · Bogotá D.C.</CardTitle>
            <span className="text-xs font-medium text-brand-500">Red troncal completa</span>
          </CardHeader>
          <div className="h-80 border-t border-base-700/60 sm:h-[26rem]">
            <TransMilenioMap onSelectBus={setSelectedBus} />
          </div>
          <TroncalLegend />
        </Card>

        <Card className="flex flex-col xl:col-span-2">
          <CardHeader>
            <CardTitle>Listado de unidades</CardTitle>
            <span className="text-xs text-base-400">{filtered.length} resultados</span>
          </CardHeader>
          <CardContent className="flex-1 space-y-1 overflow-y-auto pt-0" style={{ maxHeight: "26rem" }}>
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-base-400">No se encontraron unidades.</p>
            )}
            {filtered.map((bus, index) => (
              <BusListRow key={bus.id} bus={bus} index={index} onClick={() => setSelectedBus(bus)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <BusReportModal bus={selectedBus} onClose={() => setSelectedBus(null)} />
    </div>
  );
}
