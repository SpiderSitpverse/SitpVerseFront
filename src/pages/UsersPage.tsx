import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useStaff } from "@/hooks/useFleetData";

function initials(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function UsersPage() {
  const staff = useStaff();

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Administra conductores, personal de patio y despachadores." />

      <Card>
        <CardHeader>
          <CardTitle>Personal registrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {staff.length === 0 && <p className="py-10 text-center text-sm text-base-400">Sin personal registrado.</p>}
          {staff.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-base-800/60"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
                {initials(user.nombre)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-base-100">{user.nombre}</p>
                <p className="truncate text-xs text-base-400">N.º {user.numeroEmpleado}{user.activo ? "" : " · inactivo"}</p>
              </div>
              <Badge>{user.rol}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
