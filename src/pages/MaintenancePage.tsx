import { CalendarClock, ClipboardCheck, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { registryBuses } from "@/data/buses";

const inMaintenance = registryBuses.filter((b) => b.estado === "mantenimiento");

export function MaintenancePage() {
  return (
    <div>
      <PageHeader title="Mantenimiento" subtitle="Coordinación técnica de patios, talleres y revisiones preventivas." />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="En taller" value={inMaintenance.length} icon={Wrench} tone="warning" />
        <StatCard label="Programadas hoy" value={6} icon={CalendarClock} tone="brand" />
        <StatCard label="Completadas / mes" value={148} icon={ClipboardCheck} tone="success" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades en taller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {inMaintenance.map((bus) => (
            <div
              key={bus.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-base-800/60"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-base-100">{bus.placa}</p>
                <p className="text-xs text-base-400">{bus.operador}</p>
              </div>
              <span className="hidden text-xs text-base-400 sm:block">{bus.ubicacion}</span>
              <StatusBadge status={bus.estado} />
            </div>
          ))}
          {inMaintenance.length === 0 && (
            <p className="py-8 text-center text-sm text-base-400">No hay unidades en mantenimiento.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
