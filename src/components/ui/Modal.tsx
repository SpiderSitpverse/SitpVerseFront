import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/** Ventanas abiertas, de la más antigua a la más reciente: Esc cierra solo la de arriba. */
const openModals: symbol[] = [];

export function Modal({ open, onClose, children, className }: ModalProps) {
  // `onClose` suele ser una función nueva en cada render: se guarda en una ref para que el efecto
  // dependa solo de `open` (si no, al re-renderizar la ventana "perdería su turno" en la pila).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    openModals.push(id);
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || openModals[openModals.length - 1] !== id) return;
      e.stopPropagation();
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      openModals.splice(openModals.indexOf(id), 1);
      if (openModals.length === 0) document.body.style.overflow = "";
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-base-700 bg-base-900 shadow-2xl",
              className,
            )}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg bg-base-900/80 text-base-400 backdrop-blur-sm transition-colors hover:bg-base-800 hover:text-base-100"
            >
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
