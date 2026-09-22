import { createContext, useContext, useState, type ReactNode } from "react";
import { clearSession, getStoredSession, saveSession, verifyLogin } from "@/lib/auth";

interface AuthContextValue {
  userId: string | null;
  login: (userId: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => getStoredSession());

  function login(id: string, password: string) {
    if (!verifyLogin(id, password)) return false;
    saveSession(id);
    setUserId(id);
    return true;
  }

  function logout() {
    clearSession();
    setUserId(null);
  }

  return <AuthContext.Provider value={{ userId, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
