"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MarcoAuth,
  PantallaAuthCargando,
  PantallaFirebaseSinConfigurar,
} from "@/components/auth/marco-auth";
import { useAuth } from "@/lib/auth-context";
import { codigoErrorFirebase, mensajeErrorFirebase } from "@/lib/errores-auth";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";

export function AuthPanel() {
  const router = useRouter();
  const parametros = useSearchParams();
  const { cargando, usuario, token } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contrasenaRestablecida = parametros.get("restablecida") === "1";

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
      setError(mensajeErrorFirebase(codigoErrorFirebase(err)));
    } finally {
      setEnviando(false);
    }
  }

  if (!firebaseConfigurado()) {
    return <PantallaFirebaseSinConfigurar />;
  }

  if (cargando || (usuario && token)) {
    return <PantallaAuthCargando />;
  }

  return (
    <MarcoAuth titulo="Iniciar sesión">
      <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-5">
        {contrasenaRestablecida ? (
          <p className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-4 py-3 text-sm text-ruralia-teal-text">
            Tu contraseña se actualizó. Inicia sesión con la nueva contraseña.
          </p>
        ) : null}

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
            className="w-full rounded-xl border border-zinc-200 bg-ruralia-teal-soft/40 px-4 py-2.5 text-base text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20 sm:py-3"
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
            className="w-full rounded-xl border border-zinc-200 bg-ruralia-teal-soft/40 px-4 py-2.5 text-base text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20 sm:py-3"
          />
          <div className="mt-2 flex justify-end">
            <Link
              href="/recuperar"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="mt-1 w-full rounded-xl bg-ruralia-navy px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ruralia-navy/20 transition hover:bg-ruralia-navy-light disabled:opacity-60 sm:py-4"
        >
          {enviando ? "Ingresando..." : "Entrar"}
        </button>
      </form>
    </MarcoAuth>
  );
}
