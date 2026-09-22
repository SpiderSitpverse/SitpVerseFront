import type { BusStatus, IncidentSeverity } from "@/types/bus";

export const STATUS_LABEL: Record<BusStatus, string> = {
  operacion: "En operación",
  mantenimiento: "En mantenimiento",
  "fuera-servicio": "Fuera de servicio",
};

export const STATUS_DOT: Record<BusStatus, string> = {
  operacion: "bg-status-online",
  mantenimiento: "bg-status-warning",
  "fuera-servicio": "bg-status-offline",
};

export const STATUS_BADGE: Record<BusStatus, string> = {
  operacion: "bg-status-online/10 text-status-online ring-status-online/25",
  mantenimiento: "bg-status-warning/10 text-status-warning ring-status-warning/25",
  "fuera-servicio": "bg-status-offline/15 text-base-300 ring-base-500/30",
};

export const SEVERITY_STYLE: Record<IncidentSeverity, { badge: string; icon: string }> = {
  critico: { badge: "bg-status-danger/10 text-status-danger ring-status-danger/25", icon: "text-status-danger" },
  alerta: { badge: "bg-status-warning/10 text-status-warning ring-status-warning/25", icon: "text-status-warning" },
  info: { badge: "bg-sky-500/10 text-sky-400 ring-sky-500/25", icon: "text-sky-400" },
};
