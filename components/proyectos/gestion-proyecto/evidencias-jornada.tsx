"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { obtenerJornada } from "@/lib/api";
import type { EvidenciaJornada } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const ETIQUETA_TIPO: Record<string, string> = {
  FOTO: "Foto",
  VIDEO: "Video",
  DOCUMENTO: "Documento",
  FIRMA: "Firma",
};

interface EvidenciasJornadaProps {
  token: string;
  jornadaId: string;
}

function urlPublica(ruta: string): string {
  if (/^https?:\/\//i.test(ruta) || ruta.startsWith("data:")) return ruta;
  return `${API_URL}/${ruta.replace(/^\//, "")}`;
}

function esImagen(evidencia: EvidenciaJornada): boolean {
  if (evidencia.tipoMime?.startsWith("image/")) return true;
  if (evidencia.tipo === "FOTO") return true;
  const url = evidencia.urlArchivo ?? "";
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function etiquetaTipo(tipo: string): string {
  return ETIQUETA_TIPO[tipo] ?? tipo;
}

export function EvidenciasJornada({ token, jornadaId }: EvidenciasJornadaProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaJornada[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const jornada = await obtenerJornada(token, jornadaId);
        if (!cancelado) {
          setEvidencias(jornada.evidencias ?? []);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las evidencias",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [token, jornadaId]);

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-800">Evidencias</h4>
      <p className="mt-1 text-xs text-zinc-500">
        Fotos y archivos capturados durante la jornada, aparte del formulario.
      </p>

      {cargando ? (
        <p className="mt-3 text-sm text-zinc-500">Cargando evidencias...</p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {!cargando && !error && evidencias.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-8 text-center">
          <ImageIcon className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-600">
            Aún no hay evidencias adjuntas
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Las fotos que el agente cargue desde el celular aparecerán aquí.
          </p>
        </div>
      ) : null}

      {!cargando && !error && evidencias.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {evidencias.map((evidencia) => {
            const publica = evidencia.urlArchivo
              ? urlPublica(evidencia.urlArchivo)
              : null;
            const imagen = publica ? esImagen(evidencia) : false;

            return (
              <article
                key={evidencia.id}
                className="overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white"
              >
                {imagen && publica ? (
                  <a href={publica} target="_blank" rel="noreferrer" className="block bg-zinc-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publica}
                      alt={evidencia.nombreArchivo}
                      className="max-h-56 w-full object-contain"
                    />
                  </a>
                ) : null}
                <div className="px-4 py-3">
                  <p
                    className="truncate text-sm font-medium text-zinc-900"
                    title={evidencia.nombreArchivo}
                  >
                    {evidencia.nombreArchivo}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {etiquetaTipo(evidencia.tipo)}
                    {evidencia.capturadoEn
                      ? ` · ${new Date(evidencia.capturadoEn).toLocaleString("es-CO", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}`
                      : ""}
                  </p>
                  {publica && !imagen ? (
                    <a
                      href={publica}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                    >
                      <FileText className="h-4 w-4" />
                      Ver archivo
                    </a>
                  ) : null}
                  {!publica ? (
                    <p className="mt-2 text-xs text-zinc-400">Sin archivo</p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
