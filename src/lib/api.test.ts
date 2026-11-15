import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_URL,
  ApiError,
  UNAUTHORIZED_EVENT,
  api,
  clearToken,
  getToken,
  setToken,
  toAbsoluteUrl,
  toRelativeUrl,
  uploadPhoto,
} from "@/lib/api";

function reply(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
}

describe("cliente HTTP", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("guarda, lee y borra el token de la sesión (sessionStorage)", () => {
    expect(getToken()).toBeNull();
    setToken("abc");
    expect(getToken()).toBe("abc");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("manda el JWT en Authorization y el cuerpo como JSON", async () => {
    setToken("jwt-1");
    fetchMock.mockReturnValue(reply(200, { ok: true }));
    const data = await api<{ ok: boolean }>("/algo", { method: "POST", body: { a: 1 } });
    expect(data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/algo`);
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer jwt-1");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("un token explícito reemplaza al de la sesión", async () => {
    setToken("de-sesion");
    fetchMock.mockReturnValue(reply(200, {}));
    await api("/x", { token: "otro" });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("Bearer otro");
  });

  it("204 no trae cuerpo", async () => {
    fetchMock.mockReturnValue(reply(204));
    await expect(api("/x", { method: "POST" })).resolves.toBeUndefined();
  });

  it("un error trae el mensaje del back y su reason", async () => {
    fetchMock.mockReturnValue(reply(409, { message: "Cupos llenos", reason: "FULL" }));
    await expect(api("/x")).rejects.toMatchObject({ status: 409, message: "Cupos llenos", reason: "FULL" });
  });

  it("los errores de validación (lista) se unen en un solo texto", async () => {
    fetchMock.mockReturnValue(reply(400, { message: ["a es obligatorio", "b es inválido"] }));
    await expect(api("/x")).rejects.toMatchObject({ message: "a es obligatorio · b es inválido" });
  });

  it.each([
    [413, "La foto pesa más de 5 MB."],
    [503, "El sistema está saturado. Intenta de nuevo en unos segundos."],
    [500, "No se pudo completar la solicitud."],
  ])("sin mensaje del back, el %i dice un texto amable", async (status, text) => {
    fetchMock.mockReturnValue(reply(status, {}));
    await expect(api("/x")).rejects.toMatchObject({ message: text });
  });

  it("una respuesta de error que no es JSON igual produce un ApiError", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response("<html>", { status: 502 })));
    await expect(api("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("sin red → ApiError con status 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fail"));
    await expect(api("/x")).rejects.toMatchObject({ status: 0, message: "No se pudo conectar con el servidor." });
  });

  describe("401", () => {
    it("con sesión, avisa a la app para cerrarla", async () => {
      setToken("viejo");
      const listener = vi.fn();
      window.addEventListener(UNAUTHORIZED_EVENT, listener);
      fetchMock.mockReturnValue(reply(401, { message: "vencido" }));
      await expect(api("/x")).rejects.toMatchObject({ status: 401 });
      window.removeEventListener(UNAUTHORIZED_EVENT, listener);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("session:false (el login) NO cierra ninguna sesión", async () => {
      setToken("viejo");
      const listener = vi.fn();
      window.addEventListener(UNAUTHORIZED_EVENT, listener);
      fetchMock.mockReturnValue(reply(401, {}));
      await expect(api("/auth/google", { session: false })).rejects.toBeInstanceOf(ApiError);
      window.removeEventListener(UNAUTHORIZED_EVENT, listener);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  it("uploadPhoto manda multipart y devuelve la URL absoluta", async () => {
    fetchMock.mockReturnValue(reply(201, { url: "/uploads/x.jpg" }));
    const url = await uploadPhoto(new File(["x"], "x.jpg", { type: "image/jpeg" }));
    expect(url).toBe(`${API_URL}/uploads/x.jpg`);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe(`${API_URL}/files/images`);
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("photo")).toBeInstanceOf(File);
  });

  it("toAbsoluteUrl / toRelativeUrl son inversas y no tocan URLs ajenas", () => {
    expect(toAbsoluteUrl("/uploads/a.jpg")).toBe(`${API_URL}/uploads/a.jpg`);
    expect(toAbsoluteUrl("https://otro.com/a.jpg")).toBe("https://otro.com/a.jpg");
    expect(toRelativeUrl(`${API_URL}/uploads/a.jpg`)).toBe("/uploads/a.jpg");
    expect(toRelativeUrl("https://otro.com/a.jpg")).toBe("https://otro.com/a.jpg");
  });

  describe("reintento (ESC-DISP-01: una instancia del back cae en mitad de la petición)", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const settle = async <T,>(work: Promise<T>) => {
      const guarded = work.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
      await vi.runAllTimersAsync();
      return guarded;
    };

    it("un GET que recibe 503 se reintenta y el usuario no ve el fallo", async () => {
      fetchMock.mockReturnValueOnce(reply(503, { message: "instancia caída" })).mockReturnValueOnce(reply(200, { ok: true }));
      expect(await settle(api("/fleet/buses"))).toEqual({ value: { ok: true } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("un PATCH (la posición GPS) que pierde la conexión se reintenta", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockReturnValueOnce(reply(200, { id: "b1" }));
      expect(await settle(api("/fleet/buses/b1/position", { method: "PATCH", body: { latitude: 4.6, longitude: -74.1 } }))).toEqual({
        value: { id: "b1" },
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("tras agotar los reintentos (3 intentos) se informa el error", async () => {
      fetchMock.mockImplementation(() => reply(502, {}));
      const result = await settle(api("/fleet/buses"));
      expect((result as { error: ApiError }).error.status).toBe(502);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("un POST NO se reintenta solo (aceptar una alerta dos veces sería un error)", async () => {
      fetchMock.mockImplementation(() => reply(503, {}));
      const result = await settle(api("/assistance/calls/c1/accept", { method: "POST" }));
      expect((result as { error: ApiError }).error.status).toBe(503);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("un 409 o un 500 no se reintentan: no son fallos de una instancia caída", async () => {
      fetchMock.mockImplementation(() => reply(409, { message: "conflicto" }));
      await settle(api("/fleet/buses/b1/start-trip", { method: "PATCH" }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
