import { Bus, LayoutDashboard, Settings, Truck, TriangleAlert, Users, Wrench, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NotificationToasts } from "@/components/layout/NotificationToasts";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { Topbar } from "@/components/layout/Topbar";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/buses", label: "Buses", icon: Bus },
  { to: "/incidentes", label: "Incidentes", icon: TriangleAlert },
  { to: "/gruas", label: "Grúas", icon: Truck },
  { to: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/usuarios", label: "Usuarios", icon: Users },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export function AppLayout({ navItems = ADMIN_NAV_ITEMS }: { navItems?: NavItem[] }) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <Sidebar items={navItems} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {/*
            Animación solo de ENTRADA y en CSS. Antes era AnimatePresence "wait" (salida y luego entrada): si la
            animación de salida no terminaba (cambio rápido de módulo, pestaña en segundo plano) el contenido
            se quedaba invisible y el módulo aparecía en negro.
          */}
          <div key={location.pathname} className="mx-auto max-w-7xl animate-fade-in-up">
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <NotificationToasts />
      <UpdateBanner />
    </div>
  );
}
