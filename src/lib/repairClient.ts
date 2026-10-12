import { api, toRelativeUrl } from "@/lib/api";
import { callsStore, refreshAll, repairReportsStore } from "@/lib/backend";
import { dismissWhere } from "@/lib/notifications";
import { mapRepairReport } from "@/lib/mappers";
import type { ApiRepairReport } from "@/types/api";
import type { RepairReport } from "@/types/repair";

/**
 * Reparaciones contra el back (docs/API.md, "Mecánico"). El informe es un borrador editable
 * hasta que se finaliza (`finalize: true`), momento en que la solicitud pasa a COMPLETED.
 */

function payload(report: RepairReport, finalize: boolean) {
  return {
    damages: report.danosEncontrados,
    replacedParts: report.piezasReemplazadas,
    expenses: report.gastos,
    busPhotos: report.fotosBus.map(toRelativeUrl),
    partPhotos: report.fotosPiezas.map(toRelativeUrl),
    finalize,
  };
}

export const repairClient = {
  /** El primero en aceptar se queda con la reparación; los demás reciben 409. */
  async acceptRequest(callId: string): Promise<void> {
    await api(`/assistance/calls/${callId}/accept`, { method: "POST" });
    dismissWhere((n) => n.callId === callId); // ya la tomaste: su aviso emergente sobra
    await refreshAll();
  },

  /** Borrador del informe de una solicitud, si ya existe (sale de la caché). */
  getReport(requestId: string): RepairReport | undefined {
    const report = repairReportsStore.get().find((r) => r.callId === requestId);
    if (!report) return undefined;
    const busId = callsStore.get().find((c) => c.id === requestId)?.busId ?? "";
    return mapRepairReport(report, busId);
  },

  /** Guarda sin cerrar: el servicio sigue abierto. */
  async saveDraft(report: RepairReport): Promise<void> {
    await upsert(report, false);
  },

  /** Guarda y cierra el servicio (exige daños; después responde 409 `REPORT_FINALIZED`). */
  async finalizeReport(report: RepairReport): Promise<void> {
    await upsert(report, true);
  },
};

async function upsert(report: RepairReport, finalize: boolean) {
  const saved = await api<{ report: ApiRepairReport } | ApiRepairReport>(`/assistance/calls/${report.requestId}/repair-report`, {
    method: "PUT",
    body: payload(report, finalize),
  });
  const next = "report" in saved ? saved.report : saved;
  const others = repairReportsStore.get().filter((r) => r.callId !== next.callId);
  repairReportsStore.set([next, ...others]);
  await refreshAll();
}
