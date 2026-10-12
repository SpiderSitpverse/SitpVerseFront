import { RefreshCw, TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Cuando cambia, el error se limpia (p. ej. al navegar a otra pantalla). */
  resetKey?: string;
  /** Ocupa toda la ventana: para la red de seguridad global, fuera del menú. */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** Último `resetKey` visto: sirve para detectar que el usuario cambió de pantalla. */
  seenKey?: string;
}

/**
 * Sin esto, un error al dibujar CUALQUIER componente hace que React desmonte toda la aplicación y
 * la pantalla queda en negro, sin explicación. Aquí el error se contiene: se muestra el mensaje
 * (para poder reportarlo) y se ofrece reintentar o recargar. No atrapa errores de eventos ni de
 * promesas: esos no tumban la pantalla.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, seenKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  /** Al cambiar `resetKey` (otra pantalla) se descarta el error y se vuelve a intentar dibujar. */
  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey === state.seenKey) return null;
    return { error: null, seenKey: props.resetKey };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] La pantalla falló al dibujarse:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className={
          this.props.fullScreen
            ? "flex min-h-screen items-center justify-center bg-base-950 p-6"
            : "flex items-center justify-center py-16"
        }
      >
        <div className="w-full max-w-lg rounded-2xl border border-base-700 bg-base-900 p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-danger/10 text-status-danger">
              <TriangleAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-base-50">Algo falló al mostrar esta pantalla</h2>
              <p className="mt-1 text-sm text-base-400">
                Puedes reintentar o recargar la página. Si se repite, copia el detalle de abajo y compártelo con el equipo.
              </p>
            </div>
          </div>

          <details className="mt-4 rounded-lg bg-base-950/60 p-3 text-xs text-base-300 ring-1 ring-inset ring-base-700">
            <summary className="cursor-pointer select-none font-medium text-base-200">Detalle técnico</summary>
            <p className="mt-2 break-words font-mono text-status-danger">{error.message || String(error)}</p>
            {error.stack && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-base-400">
                {error.stack.split("\n").slice(0, 8).join("\n")}
              </pre>
            )}
          </details>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-lg bg-base-800 px-4 py-2 text-sm font-medium text-base-100 ring-1 ring-inset ring-base-600 transition-colors hover:bg-base-700"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
            >
              <RefreshCw className="size-4" />
              Recargar la página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
