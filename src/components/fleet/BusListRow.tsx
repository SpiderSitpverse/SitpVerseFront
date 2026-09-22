import { motion } from "framer-motion";
import { Bus as BusIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Bus } from "@/types/bus";
import { cn } from "@/lib/utils";

export function BusListRow({ bus, index, onClick }: { bus: Bus; index: number; onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition-colors hover:border-base-700 hover:bg-base-800/60",
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-base-800 text-base-300">
        <BusIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-base-100">{bus.placa}</p>
        <p className="truncate text-xs text-base-400">{bus.troncal}</p>
      </div>
      <div className="hidden shrink-0 text-right text-xs text-base-400 sm:block">{bus.ubicacion}</div>
      <StatusBadge status={bus.estado} />
    </motion.button>
  );
}
