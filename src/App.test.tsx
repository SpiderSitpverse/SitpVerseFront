import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stopSync } from "@/lib/backend";
import { renderApp } from "@/test/harness";

afterEach(() => {
  stopSync();
  vi.unstubAllGlobals();
});

describe("rutas y sesión", () => {
  it("sin sesión, cualquier ruta lleva al login", async () => {
    renderApp("/buses", null);
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("el login ofrece entrar con Google y explica que la primera vez queda en espera", async () => {
    renderApp("/login", null);
    expect(await screen.findByText(/Entra con tu cuenta de Google/)).toBeInTheDocument();
    expect(screen.getByText(/tu solicitud queda en espera/i)).toBeInTheDocument();
    expect(screen.getByText(/no guarda\s+contraseñas/i)).toBeInTheDocument();
  });

  it("cada rol cae en su pantalla y no puede entrar a la de otro", async () => {
    renderApp("/buses", "conductor");
    expect(await screen.findByText(/TMX-001/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("una sesión que el back rechaza (401 en /auth/me) se cierra y vuelve al login", async () => {
    renderApp("/", "admin", { "/auth/me": () => ({ status: 401, body: { message: "vencido" } }) });
    expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });
});

describe("administrador", () => {
  it.each([
    ["/", /Inicio|Panel|flota/i],
    ["/buses", /TMX-001/],
    ["/buses/registro", /TMX-002/],
    ["/incidentes", /Falla de motor/],
    ["/gruas", /Grúas|grúas/],
    ["/mantenimiento", /Mantenimiento|reparaci/i],
    ["/reportes", /Reportes|reportes/],
    ["/configuracion", /Notificaciones/],
  ])("la pantalla %s se muestra con datos", async (path, expected) => {
    renderApp(path, "admin");
    const found = await screen.findAllByText(expected);
    expect(found.length).toBeGreaterThan(0);
  });

  it("el menú lleva a cada módulo", async () => {
    const user = userEvent.setup();
    renderApp("/", "admin");
    const nav = (await screen.findAllByRole("link", { name: "Usuarios" }))[0];
    await user.click(nav);
    expect(await screen.findByText("Solicitudes de acceso")).toBeInTheDocument();
  });
});

describe("pantalla Usuarios: solicitudes de acceso", () => {
  it("muestra quién espera, quién fue rechazado y el personal con su correo", async () => {
    renderApp("/usuarios", "admin");
    expect(await screen.findByText("Persona Nueva")).toBeInTheDocument();
    expect(screen.getByText("1 en espera")).toBeInTheDocument();
    expect(screen.getByText(/rechazada Ya|Rechazada Ya/)).toBeInTheDocument();
    expect(screen.getByText(/carlos@gmail.com/)).toBeInTheDocument();
    expect(screen.getByText(/inactivo/)).toBeInTheDocument();
  });

  it("aceptar con un rol manda el rol elegido y refresca", async () => {
    const user = userEvent.setup();
    const { calls } = renderApp("/usuarios", "admin", {
      "POST /access-requests/r1/approve": { id: "nuevo", employeeId: "3002", name: "Persona Nueva", role: "MECHANICAL" },
    });
    await screen.findByText("Persona Nueva");
    await user.selectOptions(screen.getByLabelText("Rol para Persona Nueva"), "MECHANICAL");
    const row = screen.getByText("Persona Nueva").closest("div")!.parentElement!;
    await user.click(within(row).getByRole("button", { name: /Aceptar/ }));
    await waitFor(() => expect(calls.find((c) => c.path === "/access-requests/r1/approve")?.body).toEqual({ role: "MECHANICAL" }));
  });

  it("rechazar manda el rechazo", async () => {
    const user = userEvent.setup();
    const { calls } = renderApp("/usuarios", "admin", { "POST /access-requests/r1/reject": () => ({ status: 204 }) });
    await screen.findByText("Persona Nueva");
    const row = screen.getByText("Persona Nueva").closest("div")!.parentElement!;
    await user.click(within(row).getByRole("button", { name: /Rechazar/ }));
    await waitFor(() => expect(calls.some((c) => c.path === "/access-requests/r1/reject")).toBe(true));
  });

  it("si otro administrador ya la decidió, muestra el mensaje del back", async () => {
    const user = userEvent.setup();
    renderApp("/usuarios", "admin", {
      "POST /access-requests/r1/approve": () => ({ status: 404, body: { message: "La solicitud ya no existe (otro administrador la decidió)" } }),
    });
    await screen.findByText("Persona Nueva");
    const row = screen.getByText("Persona Nueva").closest("div")!.parentElement!;
    await user.click(within(row).getByRole("button", { name: /Aceptar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/otro administrador/);
  });

  it("cambiar el rol de alguien y desactivarlo; uno mismo no puede hacerlo", async () => {
    const user = userEvent.setup();
    const { calls } = renderApp("/usuarios", "admin", { "PATCH /users/d1": { id: "d1" } });
    await screen.findByText(/Carlos Pérez/);
    expect(screen.getByLabelText("Rol de Kevin Cuitiva")).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Rol de Carlos Pérez"), "MECHANICAL");
    await waitFor(() => expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ role: "MECHANICAL" }));
    const desactivar = screen.getAllByRole("button", { name: "Desactivar" })[1]; // el primero es el propio admin (deshabilitado)
    await user.click(desactivar);
    await waitFor(() => expect(calls.filter((c) => c.method === "PATCH").length).toBe(2));
  });

  it("sin solicitudes explica cómo aparecen", async () => {
    renderApp("/usuarios", "admin", { "/access-requests": [] });
    expect(await screen.findByText(/No hay solicitudes/)).toBeInTheDocument();
  });
});

describe("conductor", () => {
  it.each([
    ["/conductor", /TMX-001/],
    ["/conductor/ayuda", /Falla de motor|ayuda|apoyo/i],
  ])("la pantalla %s se muestra", async (path, expected) => {
    renderApp(path, "conductor");
    expect((await screen.findAllByText(expected)).length).toBeGreaterThan(0);
  });
});

describe("mecánico", () => {
  it.each([
    ["/taller", /Frenos|TMX-002/],
    ["/taller/reparaciones", /reparaciones|Reparaciones|historial/i],
  ])("la pantalla %s se muestra", async (path, expected) => {
    renderApp(path, "mecanico");
    expect((await screen.findAllByText(expected)).length).toBeGreaterThan(0);
  });
});

describe("cambio de rol en todas las pantallas (sin recargar)", () => {
  const driver = { id: "d1", employeeId: "2001", name: "Carlos Pérez", role: "DRIVER" };
  const mechanic = { ...driver, role: "MECHANICAL" };

  it("si el admin me cambia de rol, un 403 hace que la app pregunte quién soy y pase a las pantallas del rol nuevo", async () => {
    let asked = 0;
    renderApp("/conductor", "conductor", {
      "/auth/me": () => ({ body: ++asked === 1 ? driver : mechanic }),
      "/fleet/home/operativo": () => ({ status: 403, body: { message: "Tu rol (MECHANICAL) no puede realizar esta acción" } }),
    });
    // la pantalla del taller solo existe para el rol mecánico
    await waitFor(() => expect(screen.getByRole("link", { name: /Mis reparaciones/ })).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.queryByRole("link", { name: /Ayuda a compañeros/ })).not.toBeInTheDocument();
  });

  it("si me cambian de rol mientras tengo la pestaña abierta, el chequeo periódico lo aplica", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      let asked = 0;
      renderApp("/taller", "mecanico", {
        "/auth/me": () => ({ body: ++asked === 1 ? { ...mechanic } : { ...driver, role: "ADMIN", id: "m1" } }),
      });
      await screen.findAllByRole("link", { name: /Mis reparaciones/ });
      await vi.advanceTimersByTimeAsync(15_000);
      await waitFor(() => expect(screen.getAllByRole("link", { name: "Usuarios" }).length).toBeGreaterThan(0));
    } finally {
      vi.useRealTimers();
    }
  });

  it("si me desactivan (401 en /auth/me) la sesión se cierra en el siguiente chequeo", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      let asked = 0;
      renderApp("/taller", "mecanico", {
        "/auth/me": () => (++asked === 1 ? { body: mechanic } : { status: 401, body: { message: "Token ausente, inválido o vencido" } }),
      });
      await screen.findAllByRole("link", { name: /Mis reparaciones/ });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

