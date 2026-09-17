import { STATUS_BADGE, STATUS_DOT, STATUS_LABEL } from "@/lib/status";
import type { BusStatus } from "@/types/bus";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: BusStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        STATUS_BADGE[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
