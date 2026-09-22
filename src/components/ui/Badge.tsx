import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        variant === "default" && "bg-base-800 text-base-200 ring-base-600/60",
        variant === "outline" && "bg-transparent text-base-300 ring-base-600",
        className,
      )}
      {...props}
    />
  );
}
