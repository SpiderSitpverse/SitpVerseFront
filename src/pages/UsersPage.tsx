import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const USERS = [
  { name: "Kevin Cuitiva", role: "Administrativo", sector: "Sector 1610", initials: "KC" },
  { name: "María Fernanda Ríos", role: "Despachadora", sector: "Portal Usme", initials: "MR" },
  { name: "Jorge Andrés Peña", role: "Conductor", sector: "Troncal Caracas", initials: "JP" },
  { name: "Laura Gómez", role: "Supervisora de patio", sector: "Patio Fontibón", initials: "LG" },
];

export function UsersPage() {
  return (
    <div>
      <PageHeader title="Usuarios" subtitle="Administra conductores, personal de patio y despachadores." />

      <Card>
        <CardHeader>
          <CardTitle>Personal registrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {USERS.map((user) => (
            <div
              key={user.name}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-base-800/60"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-base-100">{user.name}</p>
                <p className="truncate text-xs text-base-400">{user.sector}</p>
              </div>
              <Badge>{user.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
