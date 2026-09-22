import { Send, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";

const MOTIVOS = [
  "Falla mecánica",
  "Accidente o choque",
  "Congestión / retraso",
  "Pasajero conflictivo",
  "Otro",
];

interface ReportProblemModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (motivo: string, detalle: string) => void;
}

export function ReportProblemModal({ open, onClose, onSubmit }: ReportProblemModalProps) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalle, setDetalle] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(motivo, detalle);
    setMotivo(MOTIVOS[0]);
    setDetalle("");
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-status-danger/10 text-status-danger ring-1 ring-inset ring-status-danger/20">
            <TriangleAlert className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-base-50">Reportar problema</h2>
            <p className="text-sm text-base-400">Se notificará a otros conductores y al centro de control</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-300">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
            >
              {MOTIVOS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-300">Detalle (opcional)</label>
            <textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={3}
              placeholder="Describe brevemente lo que está pasando..."
              className="w-full resize-none rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-status-danger px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-status-danger/20 transition-colors hover:bg-red-500"
          >
            <Send className="size-4" />
            Enviar alerta
          </button>
        </form>
      </div>
    </Modal>
  );
}
