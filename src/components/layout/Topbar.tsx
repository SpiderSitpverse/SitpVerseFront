import { Bell, Menu } from "lucide-react";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SearchInput } from "@/components/ui/SearchInput";
import { useLiveClock } from "@/hooks/useLiveClock";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const clock = useLiveClock();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-base-700/60 bg-base-950/80 px-4 py-3 backdrop-blur-md sm:gap-4 sm:px-6">
      <button
        onClick={onOpenMenu}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-base-300 ring-1 ring-inset ring-base-700 transition-colors hover:bg-base-800 hover:text-base-100 lg:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      <SearchInput placeholder="Buscar en la plataforma..." className="max-w-sm flex-1" />

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-xs font-medium text-base-300 sm:flex">
          <span className="font-mono tabular-nums">{clock.date}</span>
          <span className="h-3 w-px bg-base-600" />
          <span className="font-mono tabular-nums text-base-100">{clock.time}</span>
        </div>

        <LiveBadge />

        <button className="relative flex size-9 items-center justify-center rounded-lg text-base-300 ring-1 ring-inset ring-base-700 transition-colors hover:bg-base-800 hover:text-base-100">
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-500" />
        </button>
      </div>
    </header>
  );
}
