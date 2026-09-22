import { ClipboardCheck, Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import type { AssignedRoute } from "@/types/driver";

export interface PreTripInspection {
  nota: string;
  comentario: string;
  fotos: string[];
}

interface PreTripInspectionModalProps {
  open: boolean;
  onClose: () => void;
  assignment: AssignedRoute;
  onSubmit: (inspection: PreTripInspection) => void;
}

export function PreTripInspectionModal({ open, onClose, assignment, onSubmit }: PreTripInspectionModalProps) {
  const [nota, setNota] = useState("Inspección de turno sin novedades");
  const [comentario, setComentario] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNota("Inspección de turno sin novedades");
    setComentario("");
    setFotos([]);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nota.trim()) {
      setError("Escribe una nota corta antes de continuar.");
      return;
    }
    if (fotos.length === 0) {
      setError("Sube al menos una foto del bus antes de iniciar la ruta.");
      return;
    }
    onSubmit({ nota: nota.trim(), comentario: comentario.trim(), fotos });
    reset();
  }

  return (
    <Modal open={open} onClose={handleClose} className="max-w-md">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-base-50">Inspección antes de salir</h2>
            <p className="text-sm text-base-400">
              {assignment.placa} · {assignment.troncal}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-300">Nota</label>
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej. Inspección de turno sin novedades"
              className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-base-300">Comentario (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder="Detalla el estado del bus: niveles, neumáticos, carrocería, puertas, frenos..."
              className="w-full resize-none rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
            />
          </div>

          <PhotoUploadField label="Fotos del bus" photos={fotos} onChange={setFotos} />

          {error && (
            <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
          >
            <Send className="size-4" />
            Enviar reporte e iniciar ruta
          </button>
        </form>
      </div>
    </Modal>
  );
}
