import { STATUS_DOT } from "@/lib/status";
import type { Bus } from "@/types/bus";
import { cn } from "@/lib/utils";

export function RegistryListItem({
  bus,
  active,
  onClick,
}: {
  bus: Bus;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        active ? "bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/30" : "text-base-200 hover:bg-base-800",
      )}
    >
      <span className="font-medium">{bus.placa}</span>
      <span className={cn("flex items-center gap-1.5 text-[11px]", active ? "text-brand-400/80" : "text-base-400")}>
        <span className={cn("size-1.5 rounded-full", STATUS_DOT[bus.estado])} />
      </span>
    </button>
  );
}
