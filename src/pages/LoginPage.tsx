import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LogIn, TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import loginBg from "@/assets/media/login.jpg";
import { BrandLockup } from "@/components/brand/SpiderverseLogo";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/lib/auth";
import { roleHome } from "@/lib/roles";

type View = "login" | "change-password";

export function LoginPage() {
  const { userId, role, login } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("login");

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [changeId, setChangeId] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);

  if (userId) {
    return <Navigate to={roleHome(role)} replace />;
  }

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);

    const loggedInRole = login(loginId, loginPassword);
    if (!loggedInRole) {
      setLoginError("Usuario o contraseña incorrectos.");
      return;
    }
    navigate(roleHome(loggedInRole), { replace: true });
  }

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setChangeError(null);

    if (newPassword !== confirmPassword) {
      setChangeError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    const result = changePassword(changeId, currentPassword, newPassword);
    if (!result.success) {
      setChangeError(result.error);
      return;
    }

    setChangeSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function goToChangePassword() {
    setChangeId(loginId);
    setChangeError(null);
    setChangeSuccess(false);
    setView("change-password");
  }

  function goToLogin() {
    setLoginError(null);
    setView("login");
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

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {view === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20">
                    <LogIn className="size-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-base-50">Iniciar sesión</h1>
                    <p className="text-sm text-base-400">Ingresa tus credenciales para continuar</p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <TextField
                    label="Usuario"
                    placeholder="Tu ID de usuario"
                    autoComplete="username"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                  />
                  <TextField
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />

                  {loginError && (
                    <div className="flex items-start gap-2 rounded-lg bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                  >
                    Iniciar sesión
                  </button>
                </form>

                <button
                  onClick={goToChangePassword}
                  className="mt-5 w-full text-center text-xs font-medium text-base-400 transition-colors hover:text-brand-500"
                >
                  ¿Olvidaste tu contraseña? Cámbiala aquí
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="change-password"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-7 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-inset ring-brand-500/20">
                    <KeyRound className="size-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-base-50">Cambiar contraseña</h1>
                    <p className="text-sm text-base-400">Verifica tu identidad para actualizarla</p>
                  </div>
                </div>

                {changeSuccess ? (
                  <div className="space-y-5">
                    <div className="rounded-lg bg-status-online/10 px-3 py-2.5 text-sm text-status-online ring-1 ring-inset ring-status-online/25">
                      Contraseña actualizada correctamente.
                    </div>
                    <button
                      onClick={goToLogin}
                      className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                    >
                      Volver a iniciar sesión
                    </button>
                  </div>
                ) : (
                  <>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <TextField
                        label="Usuario"
                        placeholder="Tu ID de usuario"
                        autoComplete="username"
                        value={changeId}
                        onChange={(e) => setChangeId(e.target.value)}
                        required
                      />
                      <TextField
                        label="Contraseña actual"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <TextField
                        label="Nueva contraseña"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <TextField
                        label="Confirmar nueva contraseña"
                        type="password"
                        placeholder="Repite la nueva contraseña"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />

                      {changeError && (
                        <div className="flex items-start gap-2 rounded-lg bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger ring-1 ring-inset ring-status-danger/25">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                          {changeError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition-colors hover:bg-brand-400"
                      >
                        Guardar contraseña
                      </button>
                    </form>

                    <button
                      onClick={goToLogin}
                      className="mt-5 w-full text-center text-xs font-medium text-base-400 transition-colors hover:text-brand-500"
                    >
                      Volver a iniciar sesión
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
