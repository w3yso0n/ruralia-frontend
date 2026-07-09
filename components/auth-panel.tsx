"use client";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";

function FondoLogin() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1440"
      height="560"
      preserveAspectRatio="none"
      viewBox="0 0 1440 560"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <g mask="url(#auth-login-mask)" fill="none">
        <rect width="1440" height="560" x="0" y="0" fill="url(#auth-login-gradient)" />
        <path
          d="M -646.665829594192,410 C -550.67,370.8 -358.67,214.2 -166.66582959419208,214 C 25.33,213.8 121.33,438.6 313.3341704058079,409 C 505.33,379.4 601.33,89.6 793.334170405808,66 C 985.33,42.4 1144,268.6 1273.334170405808,291 C 1402.67,313.4 1406.67,200.6 1440,178"
          stroke="rgba(59, 212, 196, 1)"
          strokeWidth="2"
        />
        <path
          d="M -352.48670055765825,89 C -256.49,160 -64.49,452.4 127.51329944234175,444 C 319.51,435.6 415.51,35.6 607.5132994423418,47 C 799.51,58.4 895.51,495.2 1087.5132994423418,501 C 1279.51,506.8 1497.02,75.2 1567.5132994423418,76 C 1638.01,76.8 1465.5,419.2 1440,505"
          stroke="rgba(59, 212, 196, 1)"
          strokeWidth="2"
        />
        <path
          d="M -760.6555200940114,414 C -664.66,370.6 -472.66,218.6 -280.6555200940114,197 C -88.66,175.4 7.34,294.4 199.34447990598858,306 C 391.34,317.6 487.34,233 679.3444799059886,255 C 871.34,277 1007.21,444.6 1159.3444799059885,416 C 1311.48,387.4 1383.87,172.8 1440,112"
          stroke="rgba(39, 50, 166, 1)"
          strokeWidth="2"
        />
        <path
          d="M -605.6211213056635,361 C -509.62,330 -317.62,198 -125.62112130566346,206 C 66.38,214 162.38,419.6 354.37887869433655,401 C 546.38,382.4 642.38,102.4 834.3788786943365,113 C 1026.38,123.6 1193.25,447.8 1314.3788786943364,454 C 1435.5,460.2 1414.88,206 1440,144"
          stroke="rgba(39, 50, 166, 1)"
          strokeWidth="2"
        />
        <path
          d="M -746.5132605211296,188 C -650.51,222 -458.51,340.4 -266.5132605211296,358 C -74.51,375.6 21.49,259.2 213.4867394788704,276 C 405.49,292.8 501.49,474.2 693.4867394788704,442 C 885.49,409.8 1024.18,137.6 1173.4867394788703,115 C 1322.79,92.4 1386.7,286.2 1440,329"
          stroke="rgba(59, 212, 196, 1)"
          strokeWidth="2"
        />
      </g>
      <defs>
        <mask id="auth-login-mask">
          <rect width="1440" height="560" fill="#ffffff" />
        </mask>
        <linearGradient
          x1="15.28%"
          y1="-39.29%"
          x2="84.72%"
          y2="139.29%"
          gradientUnits="userSpaceOnUse"
          id="auth-login-gradient"
        >
          <stop stopColor="#0e2a47" offset="0" />
          <stop stopColor="rgba(2, 28, 62, 1)" offset="1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const BADGES_LOGIN = [
  "Operación offline",
  "IA integrada",
  "Datos en tiempo real",
  "Captura en campo",
  "Geointeligencia",
  "Dashboards operativos",
  "Evidencia digital",
  "Automatización documental",
  "Auditoría inteligente",
  "Mobile-first",
] as const;

function CarruselBadges() {
  return (
    <div className="relative z-20 w-full overflow-hidden border-t border-white/10 bg-[#021c3e]/90 py-4 backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#021c3e] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#021c3e] to-transparent"
        aria-hidden
      />
      <div className="auth-marquee-track flex w-max items-center">
        {[0, 1].map((grupo) => (
          <div
            key={grupo}
            className="flex shrink-0 items-center gap-3 px-1.5"
            aria-hidden={grupo === 1}
          >
            {BADGES_LOGIN.map((badge) => (
              <span
                key={`${grupo}-${badge}`}
                className="whitespace-nowrap rounded-full border border-[#3bd4c4]/30 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="relative flex min-h-screen flex-col">
      <div className="relative flex flex-1 flex-col lg:flex-row">
        <FondoLogin />

        <section className="relative hidden flex-1 overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="relative z-10">
            <h1 className="max-w-md text-4xl font-semibold leading-tight">
              Gestión de campo
            </h1>
            <p className="mt-4 max-w-md text-lg text-emerald-50/90">
              Inteligencia en tiempo real
            </p>
          </div>
        </section>

        <section className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/5">
              <h3 className="mb-6 text-xl font-semibold text-zinc-900">
                Iniciar sesión
              </h3>

              <form onSubmit={manejarSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="correo"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
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
                  <label
                    htmlFor="contrasena"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
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

      <CarruselBadges />
    </div>
  );
}
