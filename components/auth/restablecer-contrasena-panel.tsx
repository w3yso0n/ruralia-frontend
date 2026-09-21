"use client";

import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { ArrowLeft, Eye, EyeOff, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MarcoAuth,
  PantallaAuthCargando,
  PantallaFirebaseSinConfigurar,
} from "@/components/auth/marco-auth";
import { codigoErrorFirebase, mensajeErrorFirebase } from "@/lib/errores-auth";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";

const LARGO_MINIMO_CONTRASENA = 6;

export function RestablecerContrasenaPanel() {
  const router = useRouter();
  const parametros = useSearchParams();
  const codigo = parametros.get("oobCode");
  // Firebase usa una sola URL de accion para todos sus correos, asi que puede
  // llegar aqui un enlace de otro tipo (verificacion de correo, por ejemplo).
  const modo = parametros.get("mode");

  const [verificando, setVerificando] = useState(true);
  const [correoCuenta, setCorreoCuenta] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigurado()) return;

    if (!codigo) {
      setErrorCodigo("El enlace no es válido. Solicita uno nuevo.");
      setVerificando(false);
      return;
    }

    if (modo && modo !== "resetPassword") {
      setErrorCodigo(
        "Este enlace no es para restablecer una contraseña. Vuelve a abrirlo desde el correo correspondiente.",
      );
      setVerificando(false);
      return;
    }

    let vigente = true;

    verifyPasswordResetCode(obtenerAuth(), codigo)
      .then((correo) => {
        if (!vigente) return;
        setCorreoCuenta(correo);
      })
      .catch((err) => {
        if (!vigente) return;
        setErrorCodigo(mensajeErrorFirebase(codigoErrorFirebase(err)));
      })
      .finally(() => {
        if (vigente) setVerificando(false);
      });

    return () => {
      vigente = false;
    };
  }, [codigo, modo]);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!codigo) return;

    if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
      setError(
        `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
      );
      return;
    }

    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await confirmPasswordReset(obtenerAuth(), codigo, contrasena);
      router.replace("/?restablecida=1");
    } catch (err) {
      setError(mensajeErrorFirebase(codigoErrorFirebase(err)));
      setGuardando(false);
    }
  }

  if (!firebaseConfigurado()) {
    return <PantallaFirebaseSinConfigurar />;
  }

  if (verificando) {
    return <PantallaAuthCargando />;
  }

  if (errorCodigo) {
    return (
      <MarcoAuth titulo="Enlace no válido">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <ShieldAlert className="h-7 w-7 text-amber-800" />
          </div>
          <p className="mt-4 text-sm text-zinc-600">{errorCodigo}</p>
        </div>

        <Link
          href="/recuperar"
          className="mt-6 block w-full rounded-xl bg-ruralia-navy px-4 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-ruralia-navy/20 transition hover:bg-ruralia-navy-light"
        >
          Solicitar un enlace nuevo
        </Link>

        <div className="mt-3 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      titulo="Nueva contraseña"
      descripcion={
        correoCuenta
          ? `Estás restableciendo la contraseña de ${correoCuenta}.`
          : undefined
      }
    >
      <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label
            htmlFor="nueva-contrasena"
            className="mb-1.5 block text-sm font-medium text-zinc-700"
          >
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="nueva-contrasena"
              type={mostrarContrasena ? "text" : "password"}
              required
              autoFocus
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-11 text-base text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20 sm:py-3"
            />
            <button
              type="button"
              onClick={() => setMostrarContrasena((valor) => !valor)}
              aria-label={
                mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-ruralia-teal-muted transition hover:text-ruralia-teal"
            >
              {mostrarContrasena ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Mínimo {LARGO_MINIMO_CONTRASENA} caracteres.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirmar-contrasena"
            className="mb-1.5 block text-sm font-medium text-zinc-700"
          >
            Confirmar contraseña
          </label>
          <input
            id="confirmar-contrasena"
            type={mostrarContrasena ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-base text-zinc-900 outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/20 sm:py-3"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 w-full rounded-xl bg-ruralia-navy px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ruralia-navy/20 transition hover:bg-ruralia-navy-light disabled:opacity-60 sm:py-4"
        >
          {guardando ? "Guardando..." : "Guardar contraseña"}
        </button>

        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      </form>
    </MarcoAuth>
  );
}
