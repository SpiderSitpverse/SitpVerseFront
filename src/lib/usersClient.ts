import { api } from "@/lib/api";
import { staffStore } from "@/lib/backend";
import type { ApiAccessRequest, ApiRole, ApiUser } from "@/types/api";

/** Administración de personal y solicitudes de acceso (solo ADMIN). Contrato en SitpVerseBack/docs/API.md. */

export function fetchAccessRequests(): Promise<ApiAccessRequest[]> {
  return api<ApiAccessRequest[]>("/access-requests");
}

/** Acepta la solicitud: el back crea el usuario con el rol elegido y le asigna el siguiente número de empleado libre. */
export async function approveAccessRequest(id: string, role: ApiRole): Promise<ApiUser> {
  const user = await api<ApiUser>(`/access-requests/${id}/approve`, { method: "POST", body: { role } });
  await refreshStaff();
  return user;
}

export function rejectAccessRequest(id: string): Promise<void> {
  return api<void>(`/access-requests/${id}/reject`, { method: "POST" });
}

/** Cambia el rol o activa/desactiva la cuenta. El cambio aplica en la siguiente petición de esa persona. */
export async function updateUser(id: string, change: { role?: ApiRole; active?: boolean }): Promise<void> {
  await api<ApiUser>(`/users/${id}`, { method: "PATCH", body: change });
  await refreshStaff();
}

async function refreshStaff(): Promise<void> {
  staffStore.set(await api<ApiUser[]>("/users"));
}
