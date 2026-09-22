import type { Role } from "@/types/driver";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/",
  conductor: "/conductor",
  mecanico: "/taller",
};

export function roleHome(role: Role | null | undefined): string {
  return role ? ROLE_HOME[role] : "/login";
}
