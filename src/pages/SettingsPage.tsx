import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        enabled ? "bg-brand-500" : "bg-base-700",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

const INITIAL_SETTINGS = [
  { key: "liveFeed", label: "Live feed en tiempo real", description: "Actualiza posiciones de la flota automáticamente.", enabled: true },
  { key: "alerts", label: "Alertas críticas", description: "Notifica incidentes de severidad alta al instante.", enabled: true },
  { key: "maintenanceReminders", label: "Recordatorios de mantenimiento", description: "Avisa sobre revisiones preventivas próximas a vencer.", enabled: false },
];

export function SettingsPage() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Ajustes de intervalos de refresco, alertas y parámetros del sistema." />

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-base-700/60">
          {settings.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-base-100">{setting.label}</p>
                <p className="mt-0.5 text-xs text-base-400">{setting.description}</p>
              </div>
              <Toggle
                enabled={setting.enabled}
                onChange={(v) =>
                  setSettings((prev) => prev.map((s) => (s.key === setting.key ? { ...s, enabled: v } : s)))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
