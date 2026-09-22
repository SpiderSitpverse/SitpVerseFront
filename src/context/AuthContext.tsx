import { createContext, useContext, useState, type ReactNode } from "react";
import { clearSession, getStoredSession, saveSession, verifyLogin, type Session } from "@/lib/auth";
import type { Role } from "@/types/driver";

interface AuthContextValue {
  userId: string | null;
  role: Role | null;
  nombre: string | null;
  login: (userId: string, password: string) => Role | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getStoredSession());

  function login(id: string, password: string) {
    const result = verifyLogin(id, password);
    if (!result) return null;
    saveSession(result);
    setSession(result);
    return result.role;
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        userId: session?.userId ?? null,
        role: session?.role ?? null,
        nombre: session?.nombre ?? null,
        login,
        logout,
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
