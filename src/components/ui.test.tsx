import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trash2 } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Modal } from "@/components/ui/Modal";
import { NotificationToasts } from "@/components/layout/NotificationToasts";
import { clearNotifications, notificationsStore, pushNotification } from "@/lib/notifications";

describe("Button, Badge y Card", () => {
  it("el botón respeta variante, tamaño y deshabilitado", async () => {
    const onClick = vi.fn();
    render(
      <>
        <Button variant="primary" size="sm" onClick={onClick}>Guardar</Button>
        <Button variant="ghost" disabled>Quieto</Button>
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Quieto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar" }).className).toContain("bg-brand-500");
  });

  it("Badge y Card dibujan su contenido", () => {
    render(
      <Card>
        <CardHeader><CardTitle>Título</CardTitle></CardHeader>
        <CardContent><Badge variant="outline">Etiqueta</Badge></CardContent>
      </Card>,
    );
    expect(screen.getByText("Título")).toBeInTheDocument();
    expect(screen.getByText("Etiqueta")).toBeInTheDocument();
  });
});

describe("Modal y ConfirmModal", () => {
  it("el modal solo existe abierto y Escape lo cierra", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open={false} onClose={onClose}><p>Contenido</p></Modal>);
    expect(screen.queryByText("Contenido")).not.toBeInTheDocument();
    rerender(<Modal open onClose={onClose}><p>Contenido</p></Modal>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("confirmar cierra y ejecuta; cancelar solo cierra", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmModal open onClose={onClose} onConfirm={onConfirm} title="¿Eliminar?" description="No se puede deshacer" confirmLabel="Eliminar" icon={Trash2} />,
    );
    expect(screen.getByText("¿Eliminar?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("sin ícono y no destructivo también se dibuja", () => {
    render(<ConfirmModal open onClose={() => undefined} onConfirm={() => undefined} title="Seguir" description="Detalle" destructive={false} />);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  const Bomb = ({ explode }: { explode: boolean }) => {
    if (explode) throw new Error("falló al dibujar");
    return <p>Todo bien</p>;
  };
  beforeEach(() => void vi.spyOn(console, "error").mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it("contiene el error en vez de dejar la pantalla en negro y muestra el mensaje", () => {
    render(<ErrorBoundary><Bomb explode /></ErrorBoundary>);
    expect(screen.getAllByText(/falló al dibujar/).length).toBeGreaterThan(0);
  });

  it("cambiar de pantalla (resetKey) descarta el error y vuelve a intentar", () => {
    const { rerender } = render(<ErrorBoundary resetKey="a"><Bomb explode /></ErrorBoundary>);
    expect(screen.queryByText("Todo bien")).not.toBeInTheDocument();
    rerender(<ErrorBoundary resetKey="b"><Bomb explode={false} /></ErrorBoundary>);
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
  });

  it("reintentar vuelve a dibujar", async () => {
    let explode = true;
    const Flaky = () => {
      if (explode) throw new Error("solo la primera vez");
      return <p>Recuperado</p>;
    };
    render(<ErrorBoundary fullScreen><Flaky /></ErrorBoundary>);
    explode = false;
    await userEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(screen.getByText("Recuperado")).toBeInTheDocument();
  });
});

describe("avisos emergentes (NotificationToasts)", () => {
  beforeEach(() => clearNotifications());

  it("muestra el aviso, lo quita al descartarlo y se cierra solo a los 15 s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<MemoryRouter><NotificationToasts /></MemoryRouter>);
      act(() => pushNotification({ id: "n1", title: "Nuevo reporte", body: "TMX-001: Llanta", detail: "Pinchada", to: "/incidentes" }));
      expect(await screen.findByText("Nuevo reporte")).toBeInTheDocument();
      expect(screen.getByText("Pinchada")).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(15_500);
      });
      expect(notificationsStore.get()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("pulsar el aviso lo quita y navega a su pantalla", async () => {
    render(<MemoryRouter><NotificationToasts /></MemoryRouter>);
    act(() => pushNotification({ id: "n2", title: "Ruta asignada", body: "Revísala", to: "/conductor" }));
    await userEvent.click(await screen.findByText("Ruta asignada"));
    expect(notificationsStore.get()).toEqual([]);
  });
});
