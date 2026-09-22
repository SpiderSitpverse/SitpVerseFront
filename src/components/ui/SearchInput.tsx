import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-400" />
      <input
        type="text"
        className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-9 pr-3 text-sm text-base-100 placeholder:text-base-400 outline-none transition-colors focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
        {...props}
      />
    </div>
  );
}
