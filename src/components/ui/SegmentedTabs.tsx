import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SegmentedTabOption {
  value: string;
  label: string;
  count?: number;
  tone?: "brand" | "neutral";
}

interface SegmentedTabsProps {
  options: SegmentedTabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedTabs({ options, value, onChange, className }: SegmentedTabsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active ? "text-white" : "text-base-300 hover:text-base-100",
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-tab-bg"
                className={cn(
                  "absolute inset-0 rounded-lg",
                  option.tone === "brand" ? "bg-brand-500" : "bg-base-700",
                )}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    active ? "bg-black/20" : "bg-base-800",
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
