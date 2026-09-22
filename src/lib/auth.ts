import type { Role } from "@/types/driver";

const ACCOUNTS_KEY = "sitpverse.accounts";
const SESSION_KEY = "sitpverse.session";

export interface Account {
  userId: string;
  password: string;
  role: Role;
  nombre: string;
}

export interface Session {
  userId: string;
  role: Role;
  nombre: string;
}

/**
 * Demo accounts. `accounts` (passwords included) live in localStorage since
 * they represent shared "backend" data — swap getStoredAccounts/saveAccounts
 * for real API calls later. The active `session`, by contrast, lives in
 * sessionStorage (one per browser tab) so an admin tab and a driver tab can
 * be logged in side by side in the same browser to demo the two roles.
 */
const DEFAULT_ACCOUNTS: Account[] = [
  { userId: "admin", password: "transmilenio2026", role: "admin", nombre: "Kevin Cuitiva" },
  { userId: "conductor", password: "conductor2026", role: "conductor", nombre: "Miguel Ángel Rojas" },
  { userId: "conductor2", password: "conductor2026", role: "conductor", nombre: "Laura Gómez" },
  { userId: "mecanico", password: "taller2026", role: "mecanico", nombre: "Camilo Torres" },
];

function getStoredAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Account[]) : null;
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return DEFAULT_ACCOUNTS;
    return parsed;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function verifyLogin(userId: string, password: string): Session | null {
  const match = getStoredAccounts().find(
    (a) => a.userId.trim().toLowerCase() === userId.trim().toLowerCase() && a.password === password,
  );
  return match ? { userId: match.userId, role: match.role, nombre: match.nombre } : null;
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): { success: true } | { success: false; error: string } {
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex(
    (a) => a.userId.trim().toLowerCase() === userId.trim().toLowerCase() && a.password === currentPassword,
  );

  if (idx === -1) {
    return { success: false, error: "Usuario o contraseña actual incorrectos." };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  accounts[idx] = { ...accounts[idx], password: newPassword };
  saveAccounts(accounts);
  return { success: true };
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
