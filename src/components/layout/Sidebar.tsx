import {
  Bus,
  LayoutDashboard,
  LogOut,
  Settings,
  TriangleAlert,
  Users,
  Wrench,
  BarChart3,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/brand/SpiderverseLogo";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/buses", label: "Buses", icon: Bus },
  { to: "/incidentes", label: "Incidentes", icon: TriangleAlert },
  { to: "/mantenimiento", label: "Mantenimiento", icon: Wrench },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/usuarios", label: "Usuarios", icon: Users },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { userId, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    onNavigate?.();
    navigate("/login", { replace: true });
  }

  const initials = (userId ?? "?").slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "text-base-300 hover:bg-base-800 hover:text-base-100",
              )
            }
          >
            <item.icon className="size-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-base-700/60 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-base-800"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-base-100">{userId}</p>
            <p className="truncate text-[11px] text-base-400">Cerrar sesión</p>
          </div>
          <LogOut className="size-4 shrink-0 text-base-400" />
        </button>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-base-700/60 bg-base-900/40 lg:flex">
        <div className="px-5 py-6">
          <BrandLockup />
        </div>
        <SidebarNav />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onCloseMobile}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-base-700/60 bg-base-900 lg:hidden"
            >
              <div className="flex items-center justify-between px-5 py-6">
                <BrandLockup />
                <button
                  onClick={onCloseMobile}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base-400 hover:bg-base-800 hover:text-base-100"
                >
                  <X className="size-4" />
                </button>
              </div>
              <SidebarNav onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
