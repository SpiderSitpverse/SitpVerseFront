import { Check, UserCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { useStaff } from "@/hooks/useFleetData";
import { ApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/mappers";
import { timeAgo } from "@/lib/time";
import {
  approveAccessRequest,
  fetchAccessRequests,
  rejectAccessRequest,
  updateUser,
} from "@/lib/usersClient";
import type { ApiAccessRequest, ApiRole } from "@/types/api";

const ROLES = Object.keys(ROLE_LABEL) as ApiRole[];
/** Cada cuánto se revisa si hay solicitudes nuevas mientras la pantalla está abierta. */
const REQUESTS_POLL_MS = 15_000;

function initials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" referrerPolicy="no-referrer" className="size-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
      {initials(name)}
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: ApiRole;
  onChange: (role: ApiRole) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as ApiRole)}
      className="rounded-lg bg-base-800 px-2.5 py-1.5 text-xs text-base-100 ring-1 ring-inset ring-base-600 focus:outline-none focus:ring-brand-500 disabled:opacity-50"
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]}
        </option>
      ))}
    </select>
  );
}

function RequestRow({ request, onDone, onError }: { request: ApiAccessRequest; onDone: () => void; onError: (m: string) => void }) {
  const [role, setRole] = useState<ApiRole>("DRIVER");
  const [busy, setBusy] = useState(false);
  const rejected = request.status === "REJECTED";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      onError(error instanceof ApiError ? error.message : "No se pudo completar la acción.");
    } finally {
      setBusy(false);
      onDone(); // también tras un error: otro administrador pudo haberla decidido
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-base-800/40 px-3 py-3 ring-1 ring-inset ring-base-700/60">
      <Avatar name={request.name} photoUrl={request.photoUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-base-100">{request.name}</p>
        <p className="truncate text-xs text-base-400">
          {request.email} · pidió acceso {timeAgo(request.requestedAt)}
          {rejected ? " · rechazada" : ""}
        </p>
      </div>
      <RoleSelect value={role} onChange={setRole} disabled={busy} label={`Rol para ${request.name}`} />
      <Button size="sm" variant="primary" disabled={busy} onClick={() => run(() => approveAccessRequest(request.id, role))}>
        <Check className="size-3.5" /> Aceptar
      </Button>
      {!rejected && (
        <Button size="sm" disabled={busy} onClick={() => run(() => rejectAccessRequest(request.id))}>
          <X className="size-3.5" /> Rechazar
        </Button>
      )}
    </div>
  );
}

export function UsersPage() {
  const staff = useStaff();
  const { userId } = useAuth();
  const [requests, setRequests] = useState<ApiAccessRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await fetchAccessRequests());
    } catch {
      /* sin red: se reintenta en el siguiente ciclo */
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    const timer = window.setInterval(() => void loadRequests(), REQUESTS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadRequests]);

  async function change(id: string, change: { role?: ApiRole; active?: boolean }) {
    setMessage(null);
    try {
      await updateUser(id, change);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No se pudo guardar el cambio.");
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const rejected = requests.filter((r) => r.status === "REJECTED");

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Acepta a quien pide acceso, asigna roles y desactiva cuentas." />

      {message && (
        <p role="alert" className="rounded-lg bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
          {message}
        </p>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="size-4 text-brand-500" /> Solicitudes de acceso
          </CardTitle>
          {pending.length > 0 && <Badge className="bg-brand-500/15 text-brand-400 ring-brand-500/30">{pending.length} en espera</Badge>}
        </CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 && (
            <p className="py-6 text-center text-sm text-base-400">
              No hay solicitudes. Quien entre con Google sin tener cuenta aparecerá aquí para que lo aceptes.
            </p>
          )}
          {[...pending, ...rejected].map((request) => (
            <RequestRow key={request.id} request={request} onDone={() => void loadRequests()} onError={setMessage} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal registrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {staff.length === 0 && <p className="py-10 text-center text-sm text-base-400">Sin personal registrado.</p>}
          {staff.map((user) => {
            const self = user.id === userId;
            return (
              <div
                key={user.id}
                className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-base-800/60"
              >
                <Avatar name={user.nombre} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-base-100">
                    {user.nombre}
                    {self ? " (tú)" : ""}
                  </p>
                  <p className="truncate text-xs text-base-400">
                    N.º {user.numeroEmpleado}
                    {user.correo ? ` · ${user.correo}` : ""}
                    {user.activo ? "" : " · inactivo"}
                  </p>
                </div>
                <RoleSelect
                  value={user.rolApi}
                  disabled={self}
                  label={`Rol de ${user.nombre}`}
                  onChange={(role) => void change(user.id, { role })}
                />
                <Button size="sm" disabled={self} onClick={() => void change(user.id, { active: !user.activo })}>
                  {user.activo ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
