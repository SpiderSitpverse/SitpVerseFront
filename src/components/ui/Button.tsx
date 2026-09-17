import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export function Button({ className, variant = "secondary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "sm" && "px-3 py-1.5 text-xs",
        variant === "primary" && "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400",
        variant === "secondary" && "bg-base-800 text-base-100 ring-1 ring-inset ring-base-600 hover:bg-base-700",
        variant === "ghost" && "text-base-300 hover:bg-base-800 hover:text-base-100",
        className,
      )}
      {...props}
    />
  );
}
