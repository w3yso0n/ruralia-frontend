"use client";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";

function mensajeErrorFirebase(codigo: string): string {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    default:
      return "No se pudo completar la autenticación.";
  }
}

export function AuthPanel() {
  const router = useRouter();
  const { cargando, usuario, token } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargando && usuario && token) {
      router.replace("/dashboard");
    }
  }, [cargando, usuario, token, router]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      const auth = obtenerAuth();
      await signInWithEmailAndPassword(auth, correo, contrasena);
    } catch (err) {
      const codigo =
        err && typeof err === "object" && "code" in err
          ? String(err.code)
          : "desconocido";
      setError(mensajeErrorFirebase(codigo));
    } finally {
      setEnviando(false);
    }
  }

  if (!firebaseConfigurado()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-4">
        <div className="max-w-md rounded-3xl border border-amber-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-zinc-900">
            Falta configurar Firebase
          </h1>
          <p className="mt-3 text-sm text-zinc-600">
            Copia <code>.env.example</code> a <code>.env.local</code> y completa
            las variables <code>NEXT_PUBLIC_FIREBASE_*</code>.
          </p>
        </div>
      </div>
    );
  }

  if (cargando || (usuario && token)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <section className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            R
          </div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Gestión rural con datos en tiempo real
          </h1>
          <p className="mt-4 max-w-md text-lg text-emerald-50/90">
            Accede al panel de Ruralia para monitorear proyectos, jornadas e
            indicadores de impacto.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/5">
            <h3 className="mb-6 text-xl font-semibold text-zinc-900">
              Iniciar sesión
            </h3>

            <form onSubmit={manejarSubmit} className="space-y-4">
              <div>
                <label htmlFor="correo" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  required
                  autoComplete="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label htmlFor="contrasena" className="mb-1.5 block text-sm font-medium text-zinc-700">
                  Contraseña
                </label>
                <input
                  id="contrasena"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {enviando ? "Ingresando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
