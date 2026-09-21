"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MarcoAuth,
  PantallaAuthCargando,
  PantallaFirebaseSinConfigurar,
} from "@/components/auth/marco-auth";
import { useAuth } from "@/lib/auth-context";
import { codigoErrorFirebase, mensajeErrorFirebase } from "@/lib/errores-auth";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";

export function RecuperarContrasenaPanel() {
  const router = useRouter();
  const { cargando, usuario, token } = useAuth();
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
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
      await sendPasswordResetEmail(obtenerAuth(), correo.trim());
      setEnviado(true);
    } catch (err) {
      const codigo = codigoErrorFirebase(err);

      // No revelamos si el correo existe: se responde igual que en el caso exitoso.
      if (codigo === "auth/user-not-found") {
        setEnviado(true);
        return;
      }

      setError(mensajeErrorFirebase(codigo));
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

  if (enviado) {
    return (
      <MarcoAuth titulo="Revisa tu correo">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ruralia-teal-soft">
            <MailCheck className="h-7 w-7 text-ruralia-teal" />
          </div>
          <p className="mt-4 text-sm text-zinc-600">
            Si <span className="font-medium text-zinc-900">{correo.trim()}</span>{" "}
            está registrado, te enviamos un enlace para restablecer tu contraseña.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            El enlace caduca en poco tiempo. Revisa también la carpeta de correo no
            deseado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setError(null);
          }}
          className="mt-6 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Enviar a otro correo
        </button>

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
      titulo="Recuperar contraseña"
      descripcion="Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva."
    >
      <form onSubmit={manejarSubmit} className="space-y-4 sm:space-y-5">
        <div>
          <label
            htmlFor="correo-recuperacion"
            className="mb-1.5 block text-sm font-medium text-zinc-700"
          >
            Correo electrónico
          </label>
          <input
            id="correo-recuperacion"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
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
          disabled={enviando}
          className="mt-1 w-full rounded-xl bg-ruralia-navy px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ruralia-navy/20 transition hover:bg-ruralia-navy-light disabled:opacity-60 sm:py-4"
        >
          {enviando ? "Enviando..." : "Enviar enlace"}
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
