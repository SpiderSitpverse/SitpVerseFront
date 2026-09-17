import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
}

export function PhotoGalleryModal({ open, onClose, photos, index, onIndexChange }: PhotoGalleryModalProps) {
  function prev() {
    onIndexChange((index - 1 + photos.length) % photos.length);
  }
  function next() {
    onIndexChange((index + 1) % photos.length);
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl bg-base-950">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between pr-8">
          <p className="text-sm font-semibold text-base-100">Fotos del reporte</p>
          <p className="text-xs text-base-400">
            {photos.length > 0 ? `${index + 1} / ${photos.length}` : "0 / 0"}
          </p>
        </div>

        <div className="relative">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-base-800 to-base-900 ring-1 ring-inset ring-base-700">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center gap-3 text-base-500"
              >
                <ImageOff className="size-10" />
                <p className="px-6 text-center text-sm text-base-400">{photos[index]}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-base-950/80 text-base-200 ring-1 ring-inset ring-base-700 transition-colors hover:bg-base-800"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-base-950/80 text-base-200 ring-1 ring-inset ring-base-700 transition-colors hover:bg-base-800"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-brand-500" : "w-1.5 bg-base-600 hover:bg-base-500",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
