import { CheckCircle2, ClipboardList, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import { Modal } from "@/components/ui/Modal";
import { repairClient } from "@/lib/repairClient";
import type { RepairExpense, RepairReport, RepairRequest } from "@/types/repair";

const CURRENCY = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const EMPTY_GASTO: RepairExpense = { concepto: "", valor: 0 };

interface RepairFormModalProps {
  open: boolean;
  onClose: () => void;
  request: RepairRequest | null;
  mecanicoId: string;
  mecanicoNombre: string;
  onFinalize: (report: RepairReport) => Promise<void>;
}

function RepairFormModalBody({
  request,
  mecanicoId,
  mecanicoNombre,
  onFinalize,
}: {
  request: RepairRequest;
  mecanicoId: string;
  mecanicoNombre: string;
  onFinalize: (report: RepairReport) => Promise<void>;
}) {
  const draft = repairClient.getReport(request.id);
  const [danos, setDanos] = useState(draft?.danosEncontrados ?? "");
  const [piezas, setPiezas] = useState(draft?.piezasReemplazadas ?? "");
  const [gastos, setGastos] = useState<RepairExpense[]>(
    draft?.gastos && draft.gastos.length > 0 ? draft.gastos : [EMPTY_GASTO],
  );
  const [fotosBus, setFotosBus] = useState<string[]>(draft?.fotosBus ?? []);
  const [fotosPiezas, setFotosPiezas] = useState<string[]>(draft?.fotosPiezas ?? []);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!savedJustNow) return;
    const id = setTimeout(() => setSavedJustNow(false), 2500);
    return () => clearTimeout(id);
  }, [savedJustNow]);

  const total = gastos.reduce((sum, g) => sum + (Number.isFinite(g.valor) ? g.valor : 0), 0);

  function updateGasto(index: number, patch: Partial<RepairExpense>) {
    setGastos((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function addGasto() {
    setGastos((prev) => [...prev, { concepto: "", valor: 0 }]);
  }

  function removeGasto(index: number) {
    setGastos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function buildReport(): RepairReport {
    const existing = repairClient.getReport(request.id);
    return {
      requestId: request.id,
      busId: request.busId,
      danosEncontrados: danos.trim(),
      piezasReemplazadas: piezas.trim(),
      gastos: gastos.filter((g) => g.concepto.trim() !== "" || g.valor > 0),
      fotosBus,
      fotosPiezas,
      mecanicoId,
      mecanicoNombre,
      actualizadoEn: new Date().toISOString(),
      completadaEn: existing?.completadaEn,
    };
  }

  async function handleSaveDraft() {
    setError(null);
    setBusy(true);
    try {
      await repairClient.saveDraft(buildReport());
      setSavedJustNow(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el borrador.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinalize() {
    if (!danos.trim()) {
      setError("Describe los daños encontrados antes de finalizar.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onFinalize({ ...buildReport(), completadaEn: new Date().toISOString() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo finalizar el servicio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20">
          <ClipboardList className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-base-50">Formato de reparación</h2>
          <p className="text-sm text-base-400">
            {request.placa} · {request.troncal}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-base-300">Daños encontrados</label>
          <textarea
            value={danos}
            onChange={(e) => setDanos(e.target.value)}
            rows={3}
            placeholder="Describe el diagnóstico y los daños identificados..."
            className="w-full resize-none rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-base-300">Piezas reemplazadas (opcional)</label>
          <input
            value={piezas}
            onChange={(e) => setPiezas(e.target.value)}
            placeholder="Ej. pastillas de freno, filtro de aceite..."
            className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-base-300">Gastos</label>
            <span className="text-xs font-semibold text-base-200">{CURRENCY.format(total)}</span>
          </div>

          <div className="space-y-2">
            {gastos.map((gasto, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={gasto.concepto}
                  onChange={(e) => updateGasto(index, { concepto: e.target.value })}
                  placeholder="Concepto"
                  className="min-w-0 flex-1 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60"
                />
                <input
                  type="number"
                  min={0}
                  value={gasto.valor || ""}
                  onChange={(e) => updateGasto(index, { valor: Number(e.target.value) })}
                  placeholder="Valor"
                  className="w-28 shrink-0 rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-base-100 placeholder:text-base-500 outline-none focus:border-brand-500/60"
                />
                <button
                  type="button"
                  onClick={() => removeGasto(index)}
                  disabled={gastos.length === 1}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base-400 transition-colors hover:bg-base-800 hover:text-status-danger disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addGasto}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-400"
          >
            <Plus className="size-3.5" />
            Agregar gasto
          </button>
        </div>

        <PhotoUploadField label="Fotos del bus" photos={fotosBus} onChange={setFotosBus} />
        <PhotoUploadField label="Fotos de las piezas" photos={fotosPiezas} onChange={setFotosPiezas} />

        {error && (
          <p className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-base-800 px-4 py-2.5 text-sm font-semibold text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700 disabled:opacity-60"
          >
            <Save className="size-4" />
            Guardar
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400 disabled:opacity-60"
          >
            <CheckCircle2 className="size-4" />
            Finalizar servicio
          </button>
        </div>

        {savedJustNow && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-status-online">
            <CheckCircle2 className="size-3.5" />
            Progreso guardado. Puedes seguir editando o finalizar cuando termines.
          </p>
        )}
      </div>
    </div>
  );
}

export function RepairFormModal({ open, onClose, request, mecanicoId, mecanicoNombre, onFinalize }: RepairFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      {request && (
        <RepairFormModalBody
          key={request.id}
          request={request}
          mecanicoId={mecanicoId}
          mecanicoNombre={mecanicoNombre}
          onFinalize={onFinalize}
        />
      )}
    </Modal>
  );
}
