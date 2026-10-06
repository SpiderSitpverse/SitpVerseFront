import { CalendarClock, Camera, Images, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { BusBlueprint } from "@/components/fleet/BusBlueprint";
import { PhotoGalleryModal } from "@/components/fleet/PhotoGalleryModal";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useBusReport } from "@/hooks/useBusReport";
import { useBuses } from "@/hooks/useFleetData";
import { toRelativeUrl, uploadPhoto } from "@/lib/api";
import { fleetActivityClient } from "@/lib/fleetActivityClient";
import { resizeImageFile } from "@/lib/image";
import type { Bus } from "@/types/bus";

export function BusReportModal({ bus: selected, onClose }: { bus: Bus | null; onClose: () => void }) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  // El padre guarda una copia del bus al abrir; se toma la versión viva para que la foto cambie al instante.
  const live = useBuses().find((b) => b.id === selected?.id);
  const bus = selected ? { ...selected, ...live } : null;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const report = useBusReport(bus?.id);
  const fotos = report?.fotos ?? [];
  // Imagen de portada: la foto que puso el admin; si no hay, la que subió el conductor en su última inspección.
  const cover = bus?.foto ?? fotos[0];

  async function changePhoto(file: File | undefined) {
    if (!file || !bus) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const url = await uploadPhoto(await resizeImageFile(file));
      await fleetActivityClient.setBusPhoto(bus.id, toRelativeUrl(url));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "No se pudo cambiar la foto.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!bus) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      await fleetActivityClient.setBusPhoto(bus.id, null);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "No se pudo quitar la foto.");
    } finally {
      setPhotoBusy(false);
    }
  }

  function openGallery() {
    setGalleryIndex(0);
    setGalleryOpen(true);
  }

  return (
    <>
      <Modal open={bus !== null} onClose={onClose}>
        {bus && (
          <div>
            <div className="relative">
              <button
                type="button"
                onClick={() => fotos.length > 0 && openGallery()}
                disabled={fotos.length === 0}
                className="group relative block w-full bg-base-100 text-left disabled:cursor-default"
              >
                {cover ? (
                  <img src={cover} alt={`Foto del bus ${bus.placa}`} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="p-6">
                    <BusBlueprint className="h-auto w-full" />
                  </div>
                )}
                {fotos.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-base-950/0 text-transparent transition-colors group-hover:bg-base-950/50 group-hover:text-white">
                    <Images className="size-5" />
                    <span className="text-sm font-semibold">Ver fotos del reporte ({fotos.length})</span>
                  </div>
                )}
              </button>

              {isAdmin && (
                <div className="absolute bottom-3 left-3 z-10 flex gap-2">
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-base-950/80 px-3 py-1.5 text-xs font-medium text-base-100 ring-1 ring-inset ring-base-600 backdrop-blur-sm transition-colors hover:bg-base-800 disabled:opacity-60"
                  >
                    <Camera className="size-3.5" />
                    {photoBusy ? "Guardando..." : bus.foto ? "Cambiar foto" : "Subir foto"}
                  </button>
                  {bus.foto && (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={removePhoto}
                      aria-label="Quitar foto"
                      className="inline-flex items-center rounded-lg bg-base-950/80 px-2.5 py-1.5 text-base-300 ring-1 ring-inset ring-base-600 backdrop-blur-sm transition-colors hover:bg-status-danger hover:text-white disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void changePhoto(e.target.files?.[0])}
                  />
                </div>
              )}
            </div>
            {photoError && (
              <p className="bg-status-danger/10 px-6 py-2 text-xs text-status-danger">{photoError}</p>
            )}

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
