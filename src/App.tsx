import { ClipboardList, HandHeart, LayoutDashboard, Wrench } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import type { NavItem } from "@/components/layout/Sidebar";
import { DriverHelpPage } from "@/pages/DriverHelpPage";
import { DriverHomePage } from "@/pages/DriverHomePage";
import { FleetPage } from "@/pages/FleetPage";
import { FleetRegistryPage } from "@/pages/FleetRegistryPage";
import { HomePage } from "@/pages/HomePage";
import { IncidentsPage } from "@/pages/IncidentsPage";
import { LoginPage } from "@/pages/LoginPage";
import { MaintenancePage } from "@/pages/MaintenancePage";
import { MechanicHistoryPage } from "@/pages/MechanicHistoryPage";
import { MechanicHomePage } from "@/pages/MechanicHomePage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UsersPage } from "@/pages/UsersPage";

const DRIVER_NAV_ITEMS: NavItem[] = [
  { to: "/conductor", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/conductor/ayuda", label: "Ayuda a compañeros", icon: HandHeart },
];

const MECHANIC_NAV_ITEMS: NavItem[] = [
  { to: "/taller", label: "Solicitudes", icon: Wrench, end: true },
  { to: "/taller/reparaciones", label: "Mis reparaciones", icon: ClipboardList },
];

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="buses" element={<FleetPage />} />
          <Route path="buses/registro" element={<FleetRegistryPage />} />
          <Route path="incidentes" element={<IncidentsPage />} />
          <Route path="mantenimiento" element={<MaintenancePage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="usuarios" element={<UsersPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["conductor"]} />}>
        <Route element={<AppLayout navItems={DRIVER_NAV_ITEMS} />}>
          <Route path="conductor" element={<DriverHomePage />} />
          <Route path="conductor/ayuda" element={<DriverHelpPage />} />
          <Route path="conductor/*" element={<Navigate to="/conductor" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["mecanico"]} />}>
        <Route element={<AppLayout navItems={MECHANIC_NAV_ITEMS} />}>
          <Route path="taller" element={<MechanicHomePage />} />
          <Route path="taller/reparaciones" element={<MechanicHistoryPage />} />
          <Route path="taller/*" element={<Navigate to="/taller" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
