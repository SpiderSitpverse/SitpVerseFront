import { api, ApiError, clearToken, getToken, setToken } from "@/lib/api";
import { ROLE_FROM_API } from "@/lib/mappers";
import type { ApiRole, ApiUser } from "@/types/api";
import type { Role } from "@/types/driver";

const SESSION_KEY = "sitpverse.session";

export interface Session {
  /** id (UUID) del usuario en el back. */
  userId: string;
  /** Número de empleado con el que inicia sesión. */
  employeeId: string;
  role: Role;
  nombre: string;
}

export type AuthResult<T> = { success: true; data: T } | { success: false; error: string };

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
}

const API_ROLE_FROM_ROLE: Record<Role, ApiRole> = {
  admin: "ADMIN",
  conductor: "DRIVER",
  mecanico: "MECHANICAL",
};

export function apiRoleOf(role: Role): ApiRole {
  return API_ROLE_FROM_ROLE[role];
}

export function sessionFromUser(user: ApiUser): Session {
  return { userId: user.id, employeeId: user.employeeId, role: ROLE_FROM_API[user.role], nombre: user.name };
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    return error.message;
  }
  return fallback;
}

/** POST /auth/login con el número de empleado. Guarda el JWT; la sesión la guarda el AuthContext. */
export async function verifyLogin(employeeId: string, password: string): Promise<AuthResult<Session>> {
  try {
    const res = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: { employeeId: employeeId.trim(), password },
      session: false,
    });
    setToken(res.accessToken);
    return { success: true, data: sessionFromUser(res.user) };
  } catch (error) {
    return { success: false, error: messageOf(error, "No se pudo iniciar sesión.") };
  }
}

/** GET /auth/me: valida el token guardado al recargar la página. */
export async function fetchCurrentUser(): Promise<Session | null> {
  if (!getToken()) return null;
  try {
    return sessionFromUser(await api<ApiUser>("/auth/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 0) throw error; // sin red: no cerrar la sesión
    return null;
  }
}

/**
 * Cambia la contraseña desde el login: el back exige sesión, así que primero se valida la
 * contraseña actual con un login y se usa ese token solo para este cambio (no abre sesión).
 */
export async function changePassword(
  employeeId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthResult<null>> {
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return { success: false, error: "La nueva contraseña debe tener al menos 8 caracteres, con letras y números." };
  }
  try {
    const login = await api<LoginResponse>("/auth/login", {
      method: "POST",
      body: { employeeId: employeeId.trim(), password: currentPassword },
      session: false,
    });
    await api("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
      token: login.accessToken,
      session: false,
    });
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: messageOf(error, "No se pudo cambiar la contraseña.") };
  }
}

export function getStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw && getToken() ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  clearToken();
}
