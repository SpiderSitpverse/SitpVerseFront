import { motion } from "framer-motion";
import { Bus, TriangleAlert, Settings, Users, Wrench, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import heroBus from "@/assets/media/home-hero-1.jpg";
import heroFleet from "@/assets/media/home-hero-2.jpg";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card } from "@/components/ui/Card";
import { fleetSummary } from "@/data/buses";

interface Module {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const MODULES: Module[] = [
  { to: "/buses", title: "Gestión de Buses", description: "Monitorea la flota en tiempo real e inspecciona material rodante.", icon: Bus },
  { to: "/incidentes", title: "Incidentes", description: "Reporta y gestiona bloqueos, fallas en vía o desvíos de troncales.", icon: TriangleAlert },
  { to: "/mantenimiento", title: "Mantenimiento", description: "Coordinación técnica de patios, talleres y revisiones preventivas.", icon: Wrench },
  { to: "/reportes", title: "Reportes", description: "Generación de métricas de ocupación, velocidad y kilómetros rodados.", icon: BarChart3 },
  { to: "/usuarios", title: "Usuarios", description: "Administra conductores, personal de patio y despachadores.", icon: Users },
  { to: "/configuracion", title: "Configuración", description: "Ajustes de intervalos de refresco, alertas y parámetros del sistema.", icon: Settings },
];

export function HomePage() {
  return (
    <div>
      <PageHeader title="Consola principal" subtitle="Hola, Kevin. Bienvenido al sistema unificado de control TransMilenio." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          {MODULES.map((mod, index) => (
            <motion.div
              key={mod.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Link to={mod.to} className="group block h-full">
                <Card className="group flex h-full flex-col gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5">
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-base-800 text-base-200 transition-colors group-hover:bg-brand-500/15 group-hover:text-brand-400">
                      <mod.icon className="size-5" />
                    </div>
                    <span className="text-base-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      ↗
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-base-50">{mod.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-base-400">{mod.description}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="relative h-40 w-full">
              <img src={heroBus} alt="Bus articulado de TransMilenio en vía" className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-base-950/90 via-base-950/10 to-transparent" />
            </div>
            <div className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Sistema integrado</p>
              <h3 className="mt-1.5 text-lg font-bold text-base-50 text-balance">Una operación más segura</h3>
              <p className="mt-2 text-sm leading-relaxed text-base-400">
                Eficiente, transparente y siempre en movimiento por las calles de Bogotá.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-base-400">Resumen del estado</p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-base-400">Flota total</dt>
                <dd className="text-sm font-semibold text-base-50">
                  <AnimatedCounter value={fleetSummary.total} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-base-400">En operación</dt>
                <dd className="text-sm font-semibold text-status-online">
                  <AnimatedCounter value={fleetSummary.enOperacion} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-base-400">Incidentes hoy</dt>
                <dd className="text-sm font-semibold text-brand-500">
                  <AnimatedCounter value={fleetSummary.incidentesHoy} />
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
      >
        <Card className="relative mt-5 overflow-hidden">
          <img src={heroFleet} alt="Flota de buses del sistema TransMilenio" className="h-48 w-full object-cover sm:h-56" />
          <div className="absolute inset-0 bg-gradient-to-r from-base-950/85 via-base-950/30 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-center gap-2 px-6 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-400">Flota TransMilenio</p>
            <h3 className="max-w-sm text-xl font-bold text-white text-balance sm:text-2xl">
              Miles de buses, un solo sistema de control
            </h3>
            <p className="max-w-sm text-sm leading-relaxed text-base-200">
              Cada troncal, cada patio y cada unidad conectados en tiempo real.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
