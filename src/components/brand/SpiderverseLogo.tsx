import logo from "@/assets/media/logo.jpg";
import { cn } from "@/lib/utils";

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="TransMilenio"
        className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-inset ring-brand-500/20"
      />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold tracking-wide text-base-50">SPIDER-VERSE</p>
        <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-brand-500">
          TransMilenio Admin
        </p>
      </div>
    </div>
  );
}
