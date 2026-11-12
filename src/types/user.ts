import type { ApiRole } from "@/types/api";

export interface StaffMember {
  id: string;
  nombre: string;
  rol: string;
  rolApi: ApiRole;
  numeroEmpleado: string;
  correo: string;
  activo: boolean;
}
