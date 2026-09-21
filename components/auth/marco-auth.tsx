"use client";

import Image from "next/image";

function FondoAuth() {
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
    <div className="relative z-10 -mx-5 mt-4 overflow-hidden pt-3 sm:-mx-8 sm:mt-6 sm:pt-5 lg:-mx-12 lg:mt-auto lg:pt-8">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-ruralia-navy via-ruralia-navy/80 to-transparent sm:w-16 lg:w-24"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-ruralia-navy via-ruralia-navy/80 to-transparent sm:w-16 lg:w-24"
        aria-hidden
      />
      <div className="auth-marquee-track flex w-max items-center py-1">
        {[0, 1].map((grupo) => (
          <div
            key={grupo}
            className="flex shrink-0 items-center gap-2 px-1.5 sm:gap-3"
            aria-hidden={grupo === 1}
          >
            {BADGES_LOGIN.map((badge) => (
              <span
                key={`${grupo}-${badge}`}
                className="whitespace-nowrap rounded-full border border-ruralia-teal bg-transparent px-3 py-1.5 text-xs font-medium text-ruralia-teal sm:px-4 sm:py-2 sm:text-sm"
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

interface MarcoAuthProps {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
}

export function MarcoAuth({ titulo, descripcion, children, pie }: MarcoAuthProps) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Panel izquierdo — marca */}
      <section className="relative flex shrink-0 flex-col overflow-hidden bg-ruralia-navy px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-8 sm:pb-5 sm:pt-6 lg:h-full lg:w-1/2 lg:p-12">
        <FondoAuth />

        <div className="relative z-10 flex flex-col lg:h-full">
          <div className="flex items-center">
            <Image
              src="/icono.svg"
              alt="Ruralia"
              width={96}
              height={96}
              className="h-12 w-12 object-contain sm:h-16 sm:w-16 lg:h-24 lg:w-24"
              priority
            />
          </div>

          <div className="relative mt-4 flex flex-col sm:mt-6 lg:mt-0 lg:flex-1 lg:justify-center lg:py-16">
            <div
              className="pointer-events-none absolute -inset-x-4 -inset-y-4 rounded-3xl bg-ruralia-navy/50 blur-2xl lg:-inset-x-6 lg:-inset-y-8"
              aria-hidden
            />
            <h1 className="relative max-w-xl text-[1.65rem] font-semibold leading-tight sm:text-4xl lg:text-6xl">
              Gestión de campo.
            </h1>
            <p className="relative mt-2 max-w-xl text-sm text-white/85 sm:mt-5 sm:text-xl lg:text-2xl">
              Inteligencia en tiempo real.
            </p>
          </div>

          <CarruselBadges />
        </div>
      </section>

      {/* Panel derecho — contenido */}
      <section className="flex w-full flex-1 items-start justify-center bg-background px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:h-full lg:w-1/2 lg:items-center lg:overflow-y-auto lg:px-10 lg:py-10 xl:px-14">
        <div className="w-full max-w-md">
          <div className="w-full rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-2xl shadow-ruralia-navy/10 sm:rounded-3xl sm:p-8 lg:p-10">
            <div className="mb-5 flex flex-col items-center text-center sm:mb-6">
              <Image
                src="/icono-fondo-blanco.png"
                alt="Ruralia"
                width={240}
                height={240}
                unoptimized
                className="mb-2 h-auto w-full max-w-[88px] bg-transparent object-contain sm:max-w-[120px]"
                priority
              />
              <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">
                {titulo}
              </h2>
              {descripcion ? (
                <p className="mt-1.5 text-sm text-zinc-600">{descripcion}</p>
              ) : null}
            </div>

            {children}

            {pie}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PantallaAuthCargando() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
    </div>
  );
}

export function PantallaFirebaseSinConfigurar() {
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
