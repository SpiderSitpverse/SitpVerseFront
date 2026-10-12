import { Images } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActionRow, type RunAction } from "@/components/incidents/ActionRow";
import { PhotoUploadField } from "@/components/ui/PhotoUploadField";
import { ApiError, toAbsoluteUrl } from "@/lib/api";
import { routingClient } from "@/lib/routingClient";

/**
 * HU-22: fotos del incidente. Muestra las que ya tiene y deja adjuntar más
 * (se suben a `POST /files/images` y luego se asocian al incidente).
 */
export function EvidenceSection({ incidentId, run }: { incidentId: string; run: RunAction }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const evidence = await routingClient.listEvidence(incidentId);
      setSaved(evidence.map((e) => toAbsoluteUrl(e.url)));
    } catch {
      setSaved([]);
    }
  }, [incidentId]);

  useEffect(() => {
    let cancelled = false;
    routingClient
      .listEvidence(incidentId)
      .then((evidence) => {
        if (!cancelled) setSaved(evidence.map((e) => toAbsoluteUrl(e.url)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  async function attach() {
    if (pending.length === 0) return;
    setBusy(true);
    await run(
      async () => {
        const { failed } = await routingClient.attachEvidence(incidentId, pending);
        // Las que fallaron se quedan en la lista para reintentar sin duplicar las que sí se adjuntaron.
        setPending(failed);
        await reload();
        if (failed.length > 0) throw new ApiError(0, `No se pudo adjuntar ${failed.length} foto(s). Intenta de nuevo.`);
      },
      () => undefined,
    );
    setBusy(false);
  }

  return (
    <>
      <ActionRow
        icon={Images}
        title="Evidencia fotográfica"
        description={saved.length > 0 ? `${saved.length} foto(s) adjuntas a este incidente.` : "Todavía no hay fotos de este incidente."}
      >
        <button
          type="button"
          onClick={attach}
          disabled={pending.length === 0 || busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-400 disabled:opacity-50"
        >
          {busy ? "Adjuntando…" : `Adjuntar${pending.length > 0 ? ` (${pending.length})` : ""}`}
        </button>
      </ActionRow>

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="size-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-base-700 transition-opacity hover:opacity-80"
            >
              <img src={src} alt="Evidencia del incidente" className="size-full object-cover" />
            </a>
          ))}
        </div>
      )}

      <PhotoUploadField label="Agregar fotos" photos={pending} onChange={setPending} max={6} />
    </>
  );
}
