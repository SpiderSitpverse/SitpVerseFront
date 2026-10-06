import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dismissNotification, notificationsStore, type Notification } from "@/lib/notifications";
import { useStore } from "@/lib/store";

const AUTO_DISMISS_MS = 15_000;

function Toast({ notification }: { notification: Notification }) {
  const navigate = useNavigate();

  useEffect(() => {
    const id = window.setTimeout(() => dismissNotification(notification.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [notification.id]);

  function open() {
    dismissNotification(notification.id);
    if (notification.to) navigate(notification.to);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      role="alert"
      className="pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl bg-base-900 p-3.5 shadow-2xl shadow-black/40 ring-1 ring-inset ring-status-danger/40"
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-status-danger/10 text-status-danger">
        <TriangleAlert className="size-4" />
      </div>
      <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-base-50">{notification.title}</p>
        <p className="mt-0.5 text-sm text-base-200">{notification.body}</p>
        {notification.detail && <p className="mt-1 line-clamp-2 text-xs text-base-400">{notification.detail}</p>}
        {notification.to && <p className="mt-1.5 text-xs font-medium text-brand-400">Ver →</p>}
      </button>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => dismissNotification(notification.id)}
        className="rounded-md p-1 text-base-400 transition-colors hover:bg-base-800 hover:text-base-100"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

/** Avisos emergentes a la izquierda (a la derecha de la barra lateral en escritorio). */
export function NotificationToasts() {
  const notifications = useStore(notificationsStore);
  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-[1000] flex flex-col gap-3 lg:left-[17rem]">
      <AnimatePresence initial={false}>
        {notifications.map((n) => (
          <Toast key={n.id} notification={n} />
        ))}
      </AnimatePresence>
    </div>
  );
}
