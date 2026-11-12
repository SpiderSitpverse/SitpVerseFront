import { useEffect, useRef, useState } from "react";
import { fetchLoginNonce } from "@/lib/auth";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "@/lib/googleIdentity";

/** El nonce del servidor vale 5 minutos: se renueva antes de que caduque aunque la persona no haga nada. */
const NONCE_REFRESH_MS = 4 * 60_000;

interface Props {
  /** Recibe el ID token y el nonce con el que se pidió. */
  onCredential: (idToken: string, nonce: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * Botón oficial "Iniciar sesión con Google". Cada intento usa un nonce nuevo y de un solo uso que entrega el back:
 * así una respuesta de Google ya usada (o robada) no sirve dos veces.
 */
export function GoogleSignInButton({ onCredential, onError, disabled }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const nonce = useRef("");
  const handlers = useRef({ onCredential, onError });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    async function setup() {
      try {
        const [google, fresh] = await Promise.all([loadGoogleIdentity(), fetchLoginNonce()]);
        if (cancelled || !container.current) return;
        nonce.current = fresh;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: fresh,
          ux_mode: "popup",
          auto_select: false,
          callback: async ({ credential }) => {
            await handlers.current.onCredential(credential, nonce.current);
            if (!cancelled) void setup(); // el nonce ya se gastó: el siguiente intento usa uno nuevo
          },
        });
        google.renderButton(container.current, {
          theme: "filled_black",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          width: 320,
          locale: "es",
        });
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          handlers.current.onError(error instanceof Error ? error.message : "No se pudo preparar el inicio de sesión.");
        }
      }
    }

    void setup();
    const timer = window.setInterval(() => void setup(), NONCE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-lg bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
        El inicio de sesión con Google no está configurado (falta VITE_GOOGLE_CLIENT_ID).
      </p>
    );
  }

  return (
    <div className="flex min-h-11 justify-center" aria-busy={!ready}>
      <div ref={container} className={disabled ? "pointer-events-none opacity-60" : undefined} />
    </div>
  );
}
