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

/** `pending`: no es un fallo, la persona quedó en espera de que un administrador la acepte. */
export type AuthResult<T> = { success: true; data: T } | { success: false; error: string; pending?: boolean };

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
    if (error.status === 403) return error.message; // el back dice si la solicitud está en espera o fue rechazada
    if (error.status === 401) return "No se pudo verificar tu cuenta de Google. Inténtalo de nuevo.";
    return error.message;
  }
  return fallback;
}

/** GET /auth/nonce: valor de un solo uso que se pone en la petición a Google (protege contra respuestas repetidas). */
export async function fetchLoginNonce(): Promise<string> {
  const res = await api<{ nonce: string }>("/auth/nonce", { session: false });
  return res.nonce;
}

/** POST /auth/google con el ID token de Google. Guarda el JWT de sesión; la sesión la guarda el AuthContext. */
export async function verifyGoogleLogin(idToken: string, nonce: string): Promise<AuthResult<Session>> {
  try {
    const res = await api<LoginResponse>("/auth/google", {
      method: "POST",
      body: { idToken, nonce },
      session: false,
    });
    setToken(res.accessToken);
    return { success: true, data: sessionFromUser(res.user) };
  } catch (error) {
    const pending = error instanceof ApiError && error.reason === "PENDING_APPROVAL";
    return { success: false, error: messageOf(error, "No se pudo iniciar sesión."), pending };
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
