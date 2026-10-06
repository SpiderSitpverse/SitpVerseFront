import { AnimatePresence, motion } from "framer-motion";
import { Bus, LayoutDashboard, Settings, TriangleAlert, Users, Wrench, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NotificationToasts } from "@/components/layout/NotificationToasts";
import { Sidebar, type NavItem } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/buses", label: "Buses", icon: Bus },
  { to: "/incidentes", label: "Incidentes", icon: TriangleAlert },
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
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mx-auto max-w-7xl"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <NotificationToasts />
    </div>
  );
}
