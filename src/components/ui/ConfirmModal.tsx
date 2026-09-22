import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  destructive?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  icon: Icon,
  destructive = true,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-sm">
      <div className="p-6">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                destructive
                  ? "bg-status-danger/10 text-status-danger ring-status-danger/20"
                  : "bg-brand-500/10 text-brand-500 ring-brand-500/20",
              )}
            >
              <Icon className="size-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-base-50">{title}</h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-base-400">{description}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-base-800 px-4 py-2.5 text-sm font-semibold text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors",
              destructive
                ? "bg-status-danger shadow-status-danger/20 hover:bg-red-500"
                : "bg-brand-500 shadow-brand-500/20 hover:bg-brand-400",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
