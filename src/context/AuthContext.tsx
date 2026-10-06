import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UNAUTHORIZED_EVENT, getToken } from "@/lib/api";
import {
  apiRoleOf,
  clearSession,
  fetchCurrentUser,
  getStoredSession,
  saveSession,
  verifyLogin,
  type AuthResult,
  type Session,
} from "@/lib/auth";
import { startSync, stopSync } from "@/lib/backend";
import type { Role } from "@/types/driver";

interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  nombre: string | null;
  login: (employeeId: string, password: string) => Promise<AuthResult<Role>>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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

  // Al recargar, confirma que el token sigue valiendo (GET /auth/me) y refresca el nombre.
  useEffect(() => {
    if (!getStoredSession()) return;
    fetchCurrentUser()
      .then((current) => {
        if (!current) endSession();
        else {
          saveSession(current);
          setSession(current);
        }
      })
      .catch(() => undefined);
  }, []);

  // Cualquier 401 del back = la sesión terminó (token vencido o cuenta desactivada).
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, endSession);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, endSession);
  }, []);

  async function login(id: string, password: string): Promise<AuthResult<Role>> {
    const result = await verifyLogin(id, password);
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
        login,
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
