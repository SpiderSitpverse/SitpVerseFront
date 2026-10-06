import { api, toRelativeUrl } from "@/lib/api";
import { loadLatestInspection } from "@/lib/backend";

/** Inspección previa al viaje del conductor: POST /inspections (las fotos ya se subieron con POST /files/images). */
export const busReportClient = {
  async saveReport(busId: string, report: { nota: string; comentario: string; fotos: string[] }): Promise<void> {
    await api("/inspections", {
      method: "POST",
      body: {
        busId,
        note: report.nota,
        comment: report.comentario || undefined,
        photos: report.fotos.map(toRelativeUrl),
      },
    });
    await loadLatestInspection(busId).catch(() => undefined);
  },
};
