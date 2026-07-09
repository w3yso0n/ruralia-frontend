"use client";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import Image from "next/image";
import { WifiOff } from "lucide-react";
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
      className="absolute inset-0 h-full w-full "
      aria-hidden
    >
      <g mask="url(#auth-login-mask)" fill="none">
        <rect width="1440" height="560" x="0" y="0" fill="url(#auth-login-gradient)" />
        {/* Ondas — trazo más visible sobre navy */}
        <g strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <g className="auth-wave-layer auth-wave-layer-1">
            <path
              d="M -646.665829594192,410 C -550.67,370.8 -358.67,214.2 -166.66582959419208,214 C 25.33,213.8 121.33,438.6 313.3341704058079,409 C 505.33,379.4 601.33,89.6 793.334170405808,66 C 985.33,42.4 1144,268.6 1273.334170405808,291 C 1402.67,313.4 1406.67,200.6 1440,178"
              stroke="#5a9690"
              fill="none"
              vectorEffect="nonScalingStroke"
            />
          </g>
          <g className="auth-wave-layer auth-wave-layer-2">
            <path
              d="M -760.6555200940114,414 C -664.66,370.6 -472.66,218.6 -280.6555200940114,197 C -88.66,175.4 7.34,294.4 199.34447990598858,306 C 391.34,317.6 487.34,233 679.3444799059886,255 C 871.34,277 1007.21,444.6 1159.3444799059885,416 C 1311.48,387.4 1383.87,172.8 1440,112"
              stroke="#42827A"
              fill="none"
              vectorEffect="nonScalingStroke"
            />
          </g>
          <g className="auth-wave-layer auth-wave-layer-3">
            <path
              d="M -605.6211213056635,361 C -509.62,330 -317.62,198 -125.62112130566346,206 C 66.38,214 162.38,419.6 354.37887869433655,401 C 546.38,382.4 642.38,102.4 834.3788786943365,113 C 1026.38,123.6 1193.25,447.8 1314.3788786943364,454 C 1435.5,460.2 1414.88,206 1440,144"
              stroke="#5a9690"
              fill="none"
              vectorEffect="nonScalingStroke"
            />
          </g>
        </g>
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
          <stop stopColor="#121C2D" offset="0" />
          <stop stopColor="#1a2838" offset="1" />
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
    <div className="relative z-10 -mx-8 mt-auto overflow-hidden pt-8 lg:-mx-12">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ruralia-navy via-ruralia-navy/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ruralia-navy via-ruralia-navy/80 to-transparent"
        aria-hidden
      />
      <div className="auth-marquee-track flex w-max items-center py-1">
        {[0, 1].map((grupo) => (
          <div
            key={grupo}
            className="flex shrink-0 items-center gap-3 px-1.5"
            aria-hidden={grupo === 1}
          >
            {BADGES_LOGIN.map((badge) => (
              <span
                key={`${grupo}-${badge}`}
                className="whitespace-nowrap rounded-full border border-ruralia-teal bg-transparent px-4 py-2 text-sm font-medium text-ruralia-teal"
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

function BadgeSesionOffline() {
  return (
    <div className="auth-offline-badge relative mt-6 w-full overflow-hidden rounded-2xl bg-ruralia-navy p-px shadow-lg shadow-ruralia-teal/20 ring-1 ring-ruralia-teal/30">
      <div className="relative rounded-[15px] bg-gradient-to-br from-ruralia-navy via-ruralia-navy-light to-ruralia-navy px-4 py-3.5 sm:px-5 sm:py-4">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-ruralia-teal/25 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-1/2 h-16 w-32 -translate-x-1/2 rounded-full bg-ruralia-teal/10 blur-2xl"
          aria-hidden
        />

        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ruralia-teal/40 bg-ruralia-teal/15 shadow-inner shadow-ruralia-teal/10">
            <WifiOff className="h-5 w-5 text-ruralia-teal" strokeWidth={2.25} />
          </div>

          <div className="min-w-0 pt-0.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ruralia-teal/50 bg-ruralia-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ruralia-teal">
              <span className="auth-offline-dot h-1.5 w-1.5 rounded-full bg-ruralia-teal" />
              Sin conexión
            </span>
            <p className="mt-2 text-sm font-semibold leading-snug text-white sm:text-[0.9375rem]">
              Sesión offline disponible tras primer acceso
            </p>
          </div>
        </div>
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Panel izquierdo — marca */}
      <section className="relative flex min-h-[42vh] flex-col overflow-hidden bg-ruralia-navy p-8 text-white lg:min-h-screen lg:w-1/2 lg:p-12">
        <FondoLogin />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center">
            <Image
              src="/icono.svg"
              alt="Ruralia"
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
              priority
            />
          </div>

          <div className="relative flex flex-1 flex-col justify-center py-10 lg:py-16">
            <div
              className="pointer-events-none absolute -inset-x-6 -inset-y-8 rounded-3xl bg-ruralia-navy/50 blur-2xl"
              aria-hidden
            />
            <h1 className="relative max-w-xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Gestión de campo.
            </h1>
            <p className="relative mt-5 max-w-xl text-lg text-white/85 sm:text-xl lg:text-2xl">
              Inteligencia en tiempo real.
            </p>
          </div>

          <CarruselBadges />
        </div>
      </section>

      {/* Panel derecho — formulario */}
      <section className="flex min-h-[58vh] w-full items-center justify-center bg-background px-6 py-10 lg:min-h-screen lg:w-1/2 lg:px-10 xl:px-14">
        <div className="w-full max-w-lg">
          <div className="w-full rounded-3xl border border-ruralia-teal-border bg-white p-10 shadow-2xl shadow-ruralia-navy/10 lg:p-12">
            <div className="mb-8 flex flex-col items-center text-center">
              <Image
                src="/icono-fondo-blanco.png"
                alt="Ruralia"
                width={240}
                height={240}
                unoptimized
                className="mb-2 h-auto w-full max-w-[240px] bg-transparent object-contain"
                priority
              />
              <h2 className="text-xl font-semibold text-zinc-900">
                Iniciar sesión
              </h2>
            </div>

            <form onSubmit={manejarSubmit} className="space-y-5">
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
                  className="w-full rounded-xl border border-zinc-200 bg-ruralia-teal-soft/40 px-4 py-3 text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20"
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
                  className="w-full rounded-xl border border-zinc-200 bg-ruralia-teal-soft/40 px-4 py-3 text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={enviando}
                className="mt-1 w-full rounded-xl bg-ruralia-navy px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-ruralia-navy/20 transition hover:bg-ruralia-navy-light disabled:opacity-60"
              >
                {enviando ? "Ingresando..." : "Entrar"}
              </button>
            </form>

            <BadgeSesionOffline />
          </div>
        </div>
      </section>
    </div>
  );
}
