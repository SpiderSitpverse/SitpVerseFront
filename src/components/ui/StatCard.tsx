import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** `null` = sin dato todavía (se muestra "—"). */
  value: number | null;
  icon: LucideIcon;
  tone?: "brand" | "success" | "warning" | "neutral";
  className?: string;
}

const TONE_STYLES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  brand: "bg-brand-500/10 text-brand-400",
  success: "bg-status-online/10 text-status-online",
  warning: "bg-status-warning/10 text-status-warning",
  neutral: "bg-base-800 text-base-300",
};

export function StatCard({ label, value, icon: Icon, tone = "neutral", className }: StatCardProps) {
  return (
    <Card className={cn("flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5", className)}>
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase leading-snug tracking-wider text-base-400">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-base-50">
          {value === null ? "—" : <AnimatedCounter value={value} />}
        </p>
      </div>
    </Card>
  );
}
