const CREDENTIALS_KEY = "sitpverse.credentials";
const SESSION_KEY = "sitpverse.session";

export interface Credentials {
  userId: string;
  password: string;
}

const DEFAULT_CREDENTIALS: Credentials = {
  userId: "admin",
  password: "transmilenio2026",
};

export function getStoredCredentials(): Credentials {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return DEFAULT_CREDENTIALS;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (!parsed.userId || !parsed.password) return DEFAULT_CREDENTIALS;
    return { userId: parsed.userId, password: parsed.password };
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

function saveCredentials(credentials: Credentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function verifyLogin(userId: string, password: string): boolean {
  const stored = getStoredCredentials();
  return stored.userId.trim().toLowerCase() === userId.trim().toLowerCase() && stored.password === password;
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): { success: true } | { success: false; error: string } {
  const stored = getStoredCredentials();

  if (stored.userId.trim().toLowerCase() !== userId.trim().toLowerCase() || stored.password !== currentPassword) {
    return { success: false, error: "Usuario o contraseña actual incorrectos." };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  saveCredentials({ userId: stored.userId, password: newPassword });
  return { success: true };
}

export function getStoredSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function saveSession(userId: string) {
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
