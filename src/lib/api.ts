/**
 * Cliente HTTP del back (NestJS). Contrato en SitpVerseBack/docs/API.md.
 * La URL base sale de `VITE_API_URL`; el JWT vive en sessionStorage (una sesión por pestaña).
 */
export const API_URL = String(import.meta.env.VITE_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const TOKEN_KEY = "sitpverse.token";
export const UNAUTHORIZED_EVENT = "sitpverse:unauthorized";

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  reason?: string;

  constructor(status: number, message: string, reason?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.reason = reason;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Token a usar en lugar del de la sesión (p. ej. cambio de contraseña desde el login). */
  token?: string;
  /** false = no es una sesión: un 401 no la cierra (login, cambio de contraseña). */
  session?: boolean;
}

function errorMessage(status: number, data: unknown): string {
  const raw = (data as { message?: string | string[] } | null)?.message;
  if (Array.isArray(raw)) return raw.join(" · ");
  if (typeof raw === "string" && raw) return raw;
  if (status === 413) return "La foto pesa más de 5 MB.";
  if (status === 503) return "El sistema está saturado. Intenta de nuevo en unos segundos.";
  return "No se pudo completar la solicitud.";
}

async function send<T>(path: string, init: RequestInit, options: RequestOptions): Promise<T> {
  const token = options.token ?? getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && options.session !== false && getToken()) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(res.status, errorMessage(res.status, data), (data as { reason?: string } | null)?.reason);
  }
  return data as T;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  return send<T>(path, { method: options.method ?? "GET", headers, body }, options);
}

/** Sube una foto (`POST /files/images`) y devuelve su URL completa, lista para un <img>. */
export async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("photo", file); // el campo se llama "photo"; sin Content-Type: el navegador arma el boundary
  const { url } = await send<{ url: string }>("/files/images", { method: "POST", body: form }, {});
  return toAbsoluteUrl(url);
}

/** `/uploads/x.jpg` → `https://back/uploads/x.jpg`. Otras URLs pasan igual. */
export function toAbsoluteUrl(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

/** Inverso de `toAbsoluteUrl`: el back solo acepta las URLs relativas que él mismo generó. */
export function toRelativeUrl(url: string): string {
  return url.startsWith(API_URL) ? url.slice(API_URL.length) : url;
}
