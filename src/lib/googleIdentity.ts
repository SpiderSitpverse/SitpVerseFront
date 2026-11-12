/**
 * Inicio de sesión con Google (Google Identity Services, OpenID Connect).
 * El Client ID es público (no es un secreto) y sale de `VITE_GOOGLE_CLIENT_ID`.
 */
export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleCredentialResponse {
  /** ID token (JWT firmado por Google). */
  credential: string;
}

interface GoogleIdApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    nonce: string;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: { theme?: string; size?: string; text?: string; shape?: string; width?: number; locale?: string },
  ): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let loading: Promise<GoogleIdApi> | null = null;

/** Carga el script de Google una sola vez y devuelve su API. */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleIdApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      const api = window.google?.accounts.id;
      if (api) resolve(api);
      else reject(new Error("Google no respondió"));
    };
    script.onerror = () => {
      loading = null; // permite reintentar si fue una caída de red
      reject(new Error("No se pudo cargar el inicio de sesión de Google"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
