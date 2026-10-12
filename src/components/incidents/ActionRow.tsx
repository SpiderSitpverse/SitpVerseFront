import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Ejecuta una acción del administrador: si falla, el modal muestra el mensaje del back; si sale bien, llama a `done`. */
export type RunAction = (action: () => Promise<void>, done: () => void) => Promise<void>;

interface ActionRowProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}

export function ActionRow({ icon: Icon, title, description, children }: ActionRowProps) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-800/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-base-800 text-base-300">
            <Icon className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-base-100">{title}</p>
            <p className="text-xs text-base-400">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
