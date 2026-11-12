import { motion } from "framer-motion";
import { Clock, LogIn, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import loginBg from "@/assets/media/login.jpg";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { BrandLockup } from "@/components/brand/SpiderverseLogo";
import { useAuth } from "@/context/AuthContext";
import { roleHome } from "@/lib/roles";

export function LoginPage() {
  const { userId, role, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (userId) {
    return <Navigate to={roleHome(role)} replace />;
  }

  async function handleCredential(idToken: string, nonce: string) {
    setError(null);
    setPending(false);
    setSubmitting(true);
    const result = await loginWithGoogle(idToken, nonce);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      setPending(result.pending === true);
      return;
    }
    await navigate(roleHome(result.data), { replace: true });
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-base-950 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <img src={loginBg} alt="Bogotá D.C." className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/40 to-base-950/10" />
        <div className="absolute inset-0 bg-brand-600/10 mix-blend-multiply" />

        <div className="absolute inset-x-0 top-0 p-10">
          <BrandLockup />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-500">Sistema integrado</p>
          <h2 className="mt-2 max-w-sm text-3xl font-bold text-white text-balance">
            Control total de la operación TransMilenio
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-base-300">
            Monitorea la flota, gestiona incidentes y coordina el mantenimiento desde un solo lugar.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="mb-8 lg:hidden">
          <BrandLockup />
        </div>

        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="mb-7 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20">
              <LogIn className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-base-50">Iniciar sesión</h1>
              <p className="text-sm text-base-400">Entra con tu cuenta de Google</p>
            </div>
          </div>

          <div className="space-y-4">
            <GoogleSignInButton onCredential={handleCredential} onError={setError} disabled={submitting} />

            {submitting && <p className="text-center text-sm text-base-400">Verificando tu cuenta...</p>}

            {error && pending && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-lg bg-brand-500/10 px-3 py-2.5 text-sm text-base-100 ring-1 ring-inset ring-brand-500/30"
              >
                <Clock className="mt-0.5 size-4 shrink-0 text-brand-500" />
                <span>
                  <strong className="block font-semibold">Solicitud enviada</strong>
                  {error} Cuando lo haga, vuelve a entrar con Google.
                </span>
              </div>
            )}

            {error && !pending && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-base-400">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-base-500" />
            Si es tu primera vez, tu solicitud queda en espera hasta que un administrador la acepte y te asigne un rol.
            SitpVerse no guarda contraseñas.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
