"use client";

import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { AvatarUsuario } from "@/components/ui/avatar-usuario";
import { Alerta } from "@/components/ui/modal";
import { eliminarFotoPerfil, subirFotoPerfil } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANO_MAXIMO = 5 * 1024 * 1024;

export function ConfiguracionPerfil() {
  const { token, usuario, refrescarUsuario } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  if (!usuario) return null;

  const ejecutar = async (
    accion: () => Promise<unknown>,
    exito: string,
    errorPorDefecto: string,
  ) => {
    setProcesando(true);
    setError(null);
    setMensajeExito(null);
    try {
      await accion();
      await refrescarUsuario();
      setMensajeExito(exito);
    } catch (err) {
      setError(err instanceof Error ? err.message : errorPorDefecto);
    } finally {
      setProcesando(false);
    }
  };

  const alSeleccionarArchivo = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || !token) return;

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      setMensajeExito(null);
      setError("Formato no permitido. Usa una imagen JPG, PNG o WebP.");
      return;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      setMensajeExito(null);
      setError("La imagen supera los 5 MB. Elige una más liviana.");
      return;
    }

    void ejecutar(
      () => subirFotoPerfil(token, archivo),
      "Foto de perfil actualizada.",
      "No se pudo subir la foto",
    );
  };

  const quitarFoto = () => {
    if (!token) return;
    void ejecutar(
      () => eliminarFotoPerfil(token),
      "Foto de perfil eliminada.",
      "No se pudo quitar la foto",
    );
  };

  const roles = usuario.roles.map((rol) => rol.nombre).join(", ");

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900">Mi perfil</h2>
        <p className="mt-1 text-zinc-600">
          Tu foto se muestra en el encabezado del panel.
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {mensajeExito ? <Alerta mensaje={mensajeExito} tipo="exito" /> : null}

      <section className="max-w-2xl rounded-2xl border border-ruralia-teal-border bg-white p-6">
        <h3 className="font-semibold text-zinc-900">Foto de perfil</h3>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            <AvatarUsuario
              nombre={usuario.nombreCompleto}
              urlFoto={usuario.urlFoto}
              tamano="lg"
            />
            {procesando ? (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-ruralia-teal-border border-t-ruralia-teal" />
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">
              {usuario.nombreCompleto}
            </p>
            <p className="truncate text-xs text-zinc-500">{usuario.correo}</p>
            {roles ? (
              <p className="mt-2">
                <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-semibold text-ruralia-teal-text">
                  {roles}
                </span>
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={procesando}
                className="inline-flex items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                <ImageUp className="h-4 w-4" />
                {usuario.urlFoto ? "Cambiar foto" : "Subir foto"}
              </button>
              {usuario.urlFoto ? (
                <button
                  type="button"
                  onClick={quitarFoto}
                  disabled={procesando}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar foto
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              JPG, PNG o WebP de hasta 5 MB. Se recomienda una imagen cuadrada.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={TIPOS_PERMITIDOS.join(",")}
          onChange={alSeleccionarArchivo}
          className="hidden"
        />
      </section>
    </>
  );
}
