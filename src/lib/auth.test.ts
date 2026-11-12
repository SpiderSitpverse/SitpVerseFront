import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, api: vi.fn() };
});

import { ApiError, api, getToken, setToken } from "@/lib/api";
import {
  apiRoleOf,
  clearSession,
  fetchCurrentUser,
  fetchLoginNonce,
  getStoredSession,
  saveSession,
  sessionFromUser,
  verifyGoogleLogin,
} from "@/lib/auth";

const apiMock = vi.mocked(api);
const user = { id: "u1", employeeId: "2001", name: "Carlos Pérez", role: "DRIVER" as const };

beforeEach(() => {
  apiMock.mockReset();
});

describe("sesión", () => {
  it("traduce el usuario del back a la sesión del front", () => {
    expect(sessionFromUser(user)).toEqual({ userId: "u1", employeeId: "2001", role: "conductor", nombre: "Carlos Pérez" });
    expect(apiRoleOf("mecanico")).toBe("MECHANICAL");
    expect(apiRoleOf("admin")).toBe("ADMIN");
  });

  it("guarda, recupera y borra la sesión; sin token no hay sesión", () => {
    const session = sessionFromUser(user);
    saveSession(session);
    expect(getStoredSession()).toBeNull(); // todavía no hay token
    setToken("jwt");
    expect(getStoredSession()).toEqual(session);
    clearSession();
    expect(getStoredSession()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it("una sesión guardada corrupta se ignora", () => {
    setToken("jwt");
    sessionStorage.setItem("sitpverse.session", "{no es json");
    expect(getStoredSession()).toBeNull();
  });
});

describe("inicio de sesión con Google", () => {
  it("pide el nonce al back sin cerrar ninguna sesión", async () => {
    apiMock.mockResolvedValue({ nonce: "n-123" });
    await expect(fetchLoginNonce()).resolves.toBe("n-123");
    expect(apiMock).toHaveBeenCalledWith("/auth/nonce", { session: false });
  });

  it("manda el ID token y el nonce, guarda el JWT y devuelve la sesión", async () => {
    apiMock.mockResolvedValue({ accessToken: "jwt-nuevo", expiresIn: 28800, user });
    const result = await verifyGoogleLogin("id-token", "n-123");
    expect(apiMock).toHaveBeenCalledWith("/auth/google", { method: "POST", body: { idToken: "id-token", nonce: "n-123" }, session: false });
    expect(result).toMatchObject({ success: true, data: { role: "conductor" } });
    expect(getToken()).toBe("jwt-nuevo");
  });

  it("403 PENDING_APPROVAL: queda en espera (pending) con el mensaje del back, sin sesión", async () => {
    apiMock.mockRejectedValue(new ApiError(403, "Tu solicitud de acceso está en espera.", "PENDING_APPROVAL"));
    const result = await verifyGoogleLogin("t", "n");
    expect(result).toEqual({ success: false, error: "Tu solicitud de acceso está en espera.", pending: true });
    expect(getToken()).toBeNull();
  });

  it("403 rechazada: es un error, no una espera", async () => {
    apiMock.mockRejectedValue(new ApiError(403, "Tu solicitud fue rechazada.", "ACCESS_REJECTED"));
    expect(await verifyGoogleLogin("t", "n")).toMatchObject({ success: false, pending: false, error: "Tu solicitud fue rechazada." });
  });

  it.each([
    [429, "Demasiados intentos. Espera un momento e inténtalo de nuevo."],
    [401, "No se pudo verificar tu cuenta de Google. Inténtalo de nuevo."],
    [500, "mensaje del back"],
  ])("el error %i se explica", async (status, text) => {
    apiMock.mockRejectedValue(new ApiError(status, "mensaje del back"));
    expect(await verifyGoogleLogin("t", "n")).toMatchObject({ success: false, error: text });
  });

  it("un error que no es de la API usa el mensaje por defecto", async () => {
    apiMock.mockRejectedValue(new Error("boom"));
    expect(await verifyGoogleLogin("t", "n")).toMatchObject({ success: false, error: "No se pudo iniciar sesión.", pending: false });
  });
});

describe("fetchCurrentUser (restaurar sesión al recargar)", () => {
  it("sin token no pregunta nada", async () => {
    expect(await fetchCurrentUser()).toBeNull();
    expect(apiMock).not.toHaveBeenCalled();
  });

  it("con token válido devuelve la sesión", async () => {
    setToken("jwt");
    apiMock.mockResolvedValue(user);
    expect(await fetchCurrentUser()).toMatchObject({ userId: "u1" });
  });

  it("token inválido (401) → null; sin red → NO cierra la sesión (relanza)", async () => {
    setToken("jwt");
    apiMock.mockRejectedValueOnce(new ApiError(401, "vencido"));
    expect(await fetchCurrentUser()).toBeNull();
    apiMock.mockRejectedValueOnce(new ApiError(0, "sin red"));
    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 0 });
  });
});
