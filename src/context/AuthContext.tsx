import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FORBIDDEN_EVENT, UNAUTHORIZED_EVENT, getToken } from "@/lib/api";
import {
  apiRoleOf,
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  saveSession,
  verifyGoogleLogin,
  type AuthResult,
  type Session,
} from "@/lib/auth";
import { startSync, stopSync } from "@/lib/backend";
import type { Role } from "@/types/driver";

interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  nombre: string | null;
  /** Inicia sesión con el ID token de Google y el nonce con el que se pidió. */
  loginWithGoogle: (idToken: string, nonce: string) => Promise<AuthResult<Role>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Cada cuánto se confirma que mi rol y mi cuenta siguen siendo los mismos. */
const ROLE_CHECK_MS = 15_000;

const sameSession = (a: Session, b: Session) =>
  a.userId === b.userId && a.role === b.role && a.nombre === b.nombre && a.employeeId === b.employeeId;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getStoredSession());

  function endSession() {
    clearSession();
    setSession(null);
  }

  // Con sesión: cargar los datos del rol y mantenerlos al día (WebSocket). Sin sesión: vaciar la caché.
  const sessionRole = session?.role;
  const sessionUserId = session?.userId;
  useEffect(() => {
    const token = getToken();
    if (!sessionRole || !token) return;
    startSync(apiRoleOf(sessionRole), token, endSession, sessionUserId);
    return stopSync;
  }, [sessionRole, sessionUserId]);

  /**
   * Pregunta al back quién soy (GET /auth/me) y aplica lo que haya cambiado: nombre y, sobre todo, el ROL. Si un
   * administrador me cambió de rol, las pantallas, el menú y las salas del WebSocket pasan al rol nuevo en el acto (sin
   * recargar ni volver a entrar); si me desactivaron, la sesión se cierra.
   */
  const refreshSession = useCallback(() => {
    if (!getStoredSession()) return;
    fetchCurrentUser()
      .then((current) => {
        if (!current) {
          endSession();
          return;
        }
        saveSession(current);
        setSession((previous) => (previous && sameSession(previous, current) ? previous : current));
      })
      .catch(() => undefined);
  }, []);

  // Al abrir la app, cada 15 s, al volver a la pestaña y tras cualquier 403 (señal de que mi rol puede haber cambiado).
  useEffect(() => {
    refreshSession();
    const timer = window.setInterval(() => {
      if (!document.hidden) refreshSession();
    }, ROLE_CHECK_MS);
    const onVisible = () => {
      if (!document.hidden) refreshSession();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(FORBIDDEN_EVENT, refreshSession);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(FORBIDDEN_EVENT, refreshSession);
    };
  }, [refreshSession]);

  // Cualquier 401 del back = la sesión terminó (token vencido o cuenta desactivada).
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, endSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, endSession);
  }, []);

  async function loginWithGoogle(idToken: string, nonce: string): Promise<AuthResult<Role>> {
    const result = await verifyGoogleLogin(idToken, nonce);
    if (!result.success) return result;
    saveSession(result.data);
    setSession(result.data);
    return { success: true, data: result.data.role };
  }

  return (
    <AuthContext.Provider
      value={{
        userId: session?.userId ?? null,
        role: session?.role ?? null,
        nombre: session?.nombre ?? null,
        loginWithGoogle,
        logout: endSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
