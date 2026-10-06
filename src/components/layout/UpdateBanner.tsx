import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

const CHECK_EVERY_MS = 60_000;
const BUNDLE = /\/assets\/index-[\w-]+\.js/;

function loadedBundle(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script?.getAttribute("src")?.match(BUNDLE)?.[0] ?? null;
}

/**
 * Una pestaña abierta sigue ejecutando el código con el que cargó aunque se publique una versión nueva.
 * Cada minuto se mira el `index.html` publicado: si apunta a otro paquete, se avisa y se ofrece recargar.
 * (En desarrollo no hay paquete con hash y no hace nada.)
 */
export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const current = loadedBundle();
    if (!current) return;

    async function check() {
      if (document.hidden) return;
      try {
        const res = await fetch("/", { cache: "no-store" });
        const published = (await res.text()).match(BUNDLE)?.[0];
        if (published && published !== current) setUpdateAvailable(true);
      } catch {
        // sin red: se reintenta en el próximo ciclo
      }
    }

    void check();
    const id = window.setInterval(check, CHECK_EVERY_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!updateAvailable) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-[1500] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl bg-base-900 px-4 py-2.5 text-sm shadow-2xl shadow-black/40 ring-1 ring-inset ring-brand-500/40">
        <span className="text-base-100">Hay una versión nueva de la aplicación.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-400"
        >
          <RefreshCw className="size-3.5" />
          Actualizar
        </button>
      </div>
    </div>
  );
}
