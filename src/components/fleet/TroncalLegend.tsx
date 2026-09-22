import { troncales } from "@/data/routes";

export function TroncalLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-base-700/60 px-5 py-3">
      {troncales.map((t) => (
        <span key={t.id} className="flex items-center gap-1.5 text-xs text-base-400">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: t.color }} />
          {t.nombre}
        </span>
      ))}
    </div>
  );
}
