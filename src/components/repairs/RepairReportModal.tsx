import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { RepairReport, RepairRequest } from "@/types/repair";

const CURRENCY = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function PhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return <p className="text-sm text-base-500">Sin fotos registradas.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((src, i) => (
        <img key={i} src={src} alt="" className="size-20 rounded-lg object-cover ring-1 ring-base-700" />
      ))}
    </div>
  );
}

export function RepairReportModal({
  open,
  onClose,
  request,
  report,
}: {
  open: boolean;
  onClose: () => void;
  request: RepairRequest | null;
  report: RepairReport | null;
}) {
  const total = report?.gastos.reduce((sum, g) => sum + g.valor, 0) ?? 0;

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      {request && report && (
        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-status-online/10 text-status-online ring-1 ring-inset ring-status-online/20">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-base-50">{request.placa}</h2>
              <p className="text-sm text-base-400">{request.troncal}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                Daños encontrados
              </p>
              <p className="text-sm leading-relaxed text-base-300">{report.danosEncontrados}</p>
            </div>

            {report.piezasReemplazadas && (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                  Piezas reemplazadas
                </p>
                <p className="text-sm leading-relaxed text-base-300">{report.piezasReemplazadas}</p>
              </div>
            )}

            {report.gastos.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Gastos</p>
                  <p className="text-xs font-semibold text-base-200">{CURRENCY.format(total)}</p>
                </div>
                <div className="space-y-1 rounded-lg border border-base-700 bg-base-800/40 p-3">
                  {report.gastos.map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-base-300">{g.concepto || "—"}</span>
                      <span className="font-medium text-base-100">{CURRENCY.format(g.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                Fotos del bus
              </p>
              <PhotoGrid photos={report.fotosBus} />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500">
                Fotos de las piezas
              </p>
              <PhotoGrid photos={report.fotosPiezas} />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-base-500">
              <CalendarClock className="size-3.5" />
              {report.mecanicoNombre} ·{" "}
              {new Date(report.completadaEn).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
