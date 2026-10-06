import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PhotoThumb } from "@/components/fleet/PhotoThumb";
import { RegistryListItem } from "@/components/fleet/RegistryListItem";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useBuses } from "@/hooks/useFleetData";

const TABS = ["Información", "Historial", "Documentos"] as const;

export function FleetRegistryPage() {
  const buses = useBuses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Información");

  const filtered = useMemo(
    () => buses.filter((b) => b.placa.toLowerCase().includes(query.toLowerCase())),
    [buses, query],
  );

  const selected = buses.find((b) => b.id === selectedId) ?? buses[0];

  return (
    <div>
      <PageHeader
        title="Registro de material rodante"
        subtitle="Inventario oficial y documentación técnica de articulados"
        actions={
          <Link
            to="/buses"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
          >
            <Plus className="size-4" />
            Nuevo registro
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col p-4">
          <SearchInput
            placeholder="Buscar por placa o serie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3"
          />
          <div className="space-y-1 overflow-y-auto" style={{ maxHeight: "30rem" }}>
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-base-400">Sin unidades registradas.</p>}
            {filtered.map((bus) => (
              <RegistryListItem
                key={bus.id}
                bus={bus}
                active={bus.id === selectedId}
                onClick={() => setSelectedId(bus.id)}
              />
            ))}
          </div>
        </Card>

        {!selected ? (
          <Card className="flex items-center justify-center p-10 text-sm text-base-400">
            Selecciona una unidad para ver su registro.
          </Card>
        ) : (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-5">
              <PhotoThumb className="aspect-square w-28 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-base-50">{selected.placa}</h2>
                  <StatusBadge status={selected.estado} />
                </div>
                <p className="mt-1 text-sm text-base-400">
                  Articulado de alta capacidad · Chasis {selected.modelo}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-1 border-b border-base-700/60">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab ? "text-brand-500" : "text-base-400 hover:text-base-200"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.span
                      layoutId="registry-tab-underline"
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500"
                    />
                  )}
                </button>
              ))}
            </div>

            {activeTab === "Información" && (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 animate-fade-in">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                    Datos generales
                  </p>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="Placa" value={selected.placa} />
                    <Row label="Modelo" value={selected.modelo ?? "—"} />
                    <Row label="Año de fabricación" value={String(selected.anio ?? "—")} />
                    <Row label="Empresa operadora" value={selected.operador ?? "—"} />
                  </dl>
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                    Estado actual
                  </p>
                  <dl className="space-y-2.5 text-sm">
                    <Row label="Última ubicación" value={selected.ubicacion} />
                    <Row label="Asignación troncal" value={selected.troncal} />
                    <Row label="Capacidad" value={selected.capacidad ? `${selected.capacidad} pasajeros` : "—"} />
                    <Row label="Última actualización" value={selected.ultimaActualizacion ?? "—"} />
                  </dl>
                </div>

              </div>
            )}

            {activeTab === "Historial" && (
              <div className="mt-6 animate-fade-in">
                <p className="py-8 text-center text-sm text-base-400">Sin eventos registrados.</p>
              </div>
            )}

            {activeTab === "Documentos" && (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 animate-fade-in">
                <p className="py-8 text-center text-sm text-base-400 sm:col-span-2">Sin documentos cargados.</p>
              </div>
            )}
          </Card>
        </motion.div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-base-400">{label}</dt>
      <dd className="text-right font-medium text-base-100">{value}</dd>
    </div>
  );
}
