import { CalendarClock, Images } from "lucide-react";
import { useState } from "react";
import { BusBlueprint } from "@/components/fleet/BusBlueprint";
import { PhotoGalleryModal } from "@/components/fleet/PhotoGalleryModal";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useBusReport } from "@/hooks/useBusReport";
import type { Bus } from "@/types/bus";

export function BusReportModal({ bus, onClose }: { bus: Bus | null; onClose: () => void }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const report = useBusReport(bus?.id);
  const fotos = report?.fotos ?? [];

  function openGallery() {
    setGalleryIndex(0);
    setGalleryOpen(true);
  }

  return (
    <>
      <Modal open={bus !== null} onClose={onClose}>
        {bus && (
          <div>
            <button
              type="button"
              onClick={() => fotos.length > 0 && openGallery()}
              disabled={fotos.length === 0}
              className="group relative block w-full bg-base-100 p-6 text-left disabled:cursor-default"
            >
              <BusBlueprint className="h-auto w-full" />
              {fotos.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-base-950/0 text-transparent transition-colors group-hover:bg-base-950/50 group-hover:text-white">
                  <Images className="size-5" />
                  <span className="text-sm font-semibold">Ver fotos ({fotos.length})</span>
                </div>
              )}
            </button>

            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-bold text-base-50">{bus.placa}</h2>
                <StatusBadge status={bus.estado} />
              </div>
              <p className="mt-1 text-sm text-base-400">
                {bus.troncal} · {bus.ubicacion}
              </p>

              <div className="mt-5 rounded-xl border border-base-700 bg-base-800/40 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Reportado por</p>

                {report ? (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
                        {report.nombre
                          .split(" ")
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-base-100">{report.nombre}</p>
                        <p className="truncate text-xs text-base-400">{report.rol}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-base-300">{report.nota}</p>

                    <p className="mt-3 text-sm leading-relaxed text-base-400">{report.comentario}</p>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-base-500">
                      <CalendarClock className="size-3.5" />
                      {report.fecha}
                    </div>

                    {fotos.length > 0 && (
                      <button
                        onClick={openGallery}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-base-800 px-3 py-1.5 text-xs font-medium text-base-200 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
                      >
                        <Images className="size-3.5" />
                        Ver {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-base-400">Aún no se ha registrado un reporte para esta unidad.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <PhotoGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={fotos}
        index={galleryIndex}
        onIndexChange={setGalleryIndex}
      />
    </>
  );
}
