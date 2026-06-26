"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { obtenerUsuarioActual } from "@/lib/api";
import { firebaseConfigurado, obtenerAuth } from "@/lib/firebase";
import type { Usuario } from "@/lib/types";

type Modo = "iniciar" | "registrar";

function mensajeErrorFirebase(codigo: string): string {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    default:
      return "No se pudo completar la autenticación.";
  }
}

export function AuthPanel() {
  const [modo, setModo] = useState<Modo>("iniciar");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuarioFirebase, setUsuarioFirebase] = useState<User | null>(null);
  const [usuarioBackend, setUsuarioBackend] = useState<Usuario | null>(null);
  const [probandoBackend, setProbandoBackend] = useState(false);

  useEffect(() => {
    if (!firebaseConfigurado()) {
      setCargando(false);
      return;
    }

    const auth = obtenerAuth();
    const cancelar = onAuthStateChanged(auth, (usuario) => {
      setUsuarioFirebase(usuario);
      setCargando(false);
      setUsuarioBackend(null);
    });

    return cancelar;
  }, []);

  async function probarBackend() {
    if (!usuarioFirebase) return;

    setProbandoBackend(true);
    setError(null);

    try {
      const token = await usuarioFirebase.getIdToken();
      const usuario = await obtenerUsuarioActual(token);
      setUsuarioBackend(usuario);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al consultar el backend",
      );
    } finally {
      setProbandoBackend(false);
    }
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setUsuarioBackend(null);

    try {
      const auth = obtenerAuth();

      if (modo === "iniciar") {
        await signInWithEmailAndPassword(auth, correo, contrasena);
      } else {
        const credencial = await createUserWithEmailAndPassword(
          auth,
          correo,
          contrasena,
        );
        if (nombre.trim()) {
          await updateProfile(credencial.user, {
            displayName: nombre.trim(),
          });
        }
      }
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

  async function cerrarSesion() {
    await signOut(obtenerAuth());
    setUsuarioBackend(null);
    setCorreo("");
    setContrasena("");
    setNombre("");
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
            las variables <code>NEXT_PUBLIC_FIREBASE_*</code> desde Firebase
            Console → Configuración del proyecto → Tus apps (Web).
          </p>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (usuarioFirebase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f2] px-4 py-10">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/5">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
              R
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700">
                Sesión activa
              </p>
              <h1 className="text-xl font-semibold text-zinc-900">Ruralia</h1>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-emerald-50/70 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-700/70">
                Firebase
              </p>
              <p className="font-medium text-zinc-900">
                {usuarioFirebase.email}
              </p>
              <p className="mt-1 break-all text-xs text-zinc-500">
                UID: {usuarioFirebase.uid}
              </p>
            </div>

            {usuarioBackend ? (
              <div className="border-t border-emerald-100 pt-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700/70">
                  Backend /autenticacion/yo
                </p>
                <p className="font-medium text-zinc-900">
                  {usuarioBackend.nombreCompleto}
                </p>
                <p className="text-sm text-zinc-600">{usuarioBackend.correo}</p>
                <p className="mt-2 text-sm text-zinc-600">
                  Roles:{" "}
                  {usuarioBackend.roles?.length
                    ? usuarioBackend.roles.map((rol) => rol.nombre).join(", ")
                    : "sin roles"}
                </p>
                <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-zinc-900 p-4 text-xs text-emerald-300">
                  {JSON.stringify(usuarioBackend, null, 2)}
                </pre>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={probarBackend}
              disabled={probandoBackend}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {probandoBackend ? "Consultando..." : "Probar backend"}
            </button>
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <section className="relative hidden flex-1 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-lime-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 left-10 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />

        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            R
          </div>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Gestión rural con datos en tiempo real
          </h1>
          <p className="mt-4 max-w-md text-lg text-emerald-50/90">
            Inicia sesión para probar la integración entre Firebase Auth y el
            backend NestJS de Ruralia.
          </p>
        </div>

        <p className="relative text-sm text-emerald-100/80">
          Prueba de autenticación · Sesión 02
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-bold text-white">
              R
            </div>
            <h2 className="text-2xl font-semibold text-zinc-900">Ruralia</h2>
            <p className="mt-1 text-zinc-600">Accede a tu cuenta</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/5">
            <div className="mb-6 flex rounded-2xl bg-zinc-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setModo("iniciar");
                  setError(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  modo === "iniciar"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo("registrar");
                  setError(null);
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  modo === "registrar"
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={manejarSubmit} className="space-y-4">
              {modo === "registrar" ? (
                <div>
                  <label
                    htmlFor="nombre"
                    className="mb-1.5 block text-sm font-medium text-zinc-700"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="María García"
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
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
                  placeholder="tu@correo.com"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
                  autoComplete={
                    modo === "iniciar" ? "current-password" : "new-password"
                  }
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
                className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {enviando
                  ? "Procesando..."
                  : modo === "iniciar"
                    ? "Entrar"
                    : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500">
              Tras iniciar sesión, usa &quot;Probar backend&quot; para llamar a{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5">
                GET /autenticacion/yo
              </code>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
