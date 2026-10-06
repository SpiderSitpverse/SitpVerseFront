import type { Role } from "@/types/driver";

const SESSION_KEY = "sitpverse.session";

export interface Session {
  userId: string;
  role: Role;
  nombre: string;
}

export type AuthResult<T> = { success: true; data: T } | { success: false; error: string };

const NOT_CONNECTED = "El servidor todavía no está conectado.";

/**
 * Punto de conexión con el back (ver SitpVerseBack/docs/API.md, sección Auth).
 * Sin cuentas locales: `verifyLogin` y `changePassword` son lo único que hay que
 * reemplazar por las llamadas reales (`POST /auth/login` con `employeeId` + password,
 * guardando el JWT; y el endpoint de cambio de contraseña). La sesión activa vive en
 * sessionStorage (una por pestaña).
 */
export async function verifyLogin(_userId: string, _password: string): Promise<AuthResult<Session>> {
  return { success: false, error: NOT_CONNECTED };
}

export async function changePassword(
  _userId: string,
  _currentPassword: string,
  newPassword: string,
): Promise<AuthResult<null>> {
  if (newPassword.length < 6) {
    return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }
  return { success: false, error: NOT_CONNECTED };
}

export function getStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
