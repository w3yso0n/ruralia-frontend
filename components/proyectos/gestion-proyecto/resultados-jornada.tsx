"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Download,
  FileText,
  Hash,
  MapPin,
  X,
} from "lucide-react";
import {
  descargarPdfFormularioJornada,
  listarEnviosPorJornada,
  listarPlantillasPorJornada,
  obtenerRespuestasEnvio,
} from "@/lib/api";
import type {
  EnvioFormularioResumen,
  Jornada,
  PlantillaFormulario,
  RespuestaFormularioDetalle,
  TipoCampoFormulario,
} from "@/lib/types";

interface ResultadosJornadaProps {
  token: string;
  jornada: Jornada;
}

interface EnvioConRespuestas {
  envio: EnvioFormularioResumen;
  respuestas: RespuestaFormularioDetalle[];
}

function parsearLista(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.map((v) => String(v)).filter(Boolean);
  }
  if (typeof valor === "string") {
    const texto = valor.trim();
    if (!texto) return [];
    if (texto.startsWith("[")) {
      try {
        const parsed = JSON.parse(texto) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v)).filter(Boolean);
        }
      } catch {
        // texto plano
      }
    }
    return [texto];
  }
  return [];
}

function esDataUrlImagen(valor: string | null | undefined): boolean {
  return Boolean(valor && /^data:image\/\w+;base64,/i.test(valor.trim()));
}

function esUrlHttp(valor: string): boolean {
  return /^https?:\/\//i.test(valor) || valor.startsWith("/");
}

function resolverTipo(
  respuesta: RespuestaFormularioDetalle,
): TipoCampoFormulario | "DESCONOCIDO" {
  if (respuesta.tipoCampo) return respuesta.tipoCampo;
  if (respuesta.valorBooleano != null) return "SI_NO";
  if (respuesta.valorFecha != null) return "FECHA";
  if (respuesta.valorNumero != null) return "NUMERO";
  if (respuesta.urlArchivo) {
    return esDataUrlImagen(respuesta.urlArchivo) ? "FIRMA" : "ARCHIVO";
  }
  if (respuesta.valorJson != null) {
    const json = respuesta.valorJson as { filas?: unknown };
    if (json && typeof json === "object" && Array.isArray(json.filas)) {
      return "TABLA";
    }
  }
  const texto = respuesta.valorTexto?.trim() ?? "";
  if (texto.startsWith("[")) return "SELECCION_MULTIPLE";
  return "TEXTO";
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/60 px-2.5 py-1 text-xs font-medium text-ruralia-teal-text">
      {children}
    </span>
  );
}

function CampoFormularioVista({
  respuesta,
}: {
  respuesta: RespuestaFormularioDetalle;
}) {
  const tipo = resolverTipo(respuesta);
  const etiqueta = respuesta.etiquetaCampo ?? respuesta.claveCampo;

  if (tipo === "SI_NO") {
    const afirmativo =
      respuesta.valorBooleano === true ||
      respuesta.valorTexto?.toLowerCase() === "sí" ||
      respuesta.valorTexto?.toLowerCase() === "si" ||
      respuesta.valorTexto?.toLowerCase() === "true";
    const negativo =
      respuesta.valorBooleano === false ||
      respuesta.valorTexto?.toLowerCase() === "no" ||
      respuesta.valorTexto?.toLowerCase() === "false";

    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <div className="mt-2">
          {afirmativo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Sí
            </span>
          ) : negativo ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">
              <X className="h-3.5 w-3.5" />
              No
            </span>
          ) : (
            <span className="text-sm text-zinc-400">Sin respuesta</span>
          )}
        </div>
      </div>
    );
  }

  if (tipo === "SELECCION_UNICA" || tipo === "SELECCION_MULTIPLE") {
    const opciones = parsearLista(
      respuesta.valorJson ?? respuesta.valorTexto ?? [],
    );
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {opciones.length > 0 ? (
            opciones.map((opcion) => <Pill key={opcion}>{opcion}</Pill>)
          ) : (
            <span className="text-sm text-zinc-400">Sin selección</span>
          )}
        </div>
      </div>
    );
  }

  if (tipo === "FECHA") {
    const valor =
      respuesta.valorFecha != null
        ? new Date(respuesta.valorFecha).toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : respuesta.valorTexto
          ? new Date(respuesta.valorTexto).toLocaleDateString("es-CO", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null;
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-zinc-900">
          <Calendar className="h-4 w-4 shrink-0 text-ruralia-teal" />
          {valor ?? "Sin fecha"}
        </p>
      </div>
    );
  }

  if (tipo === "NUMERO") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <p className="mt-2 flex items-center gap-2 text-lg font-semibold tabular-nums text-zinc-900">
          <Hash className="h-4 w-4 shrink-0 text-ruralia-teal" />
          {respuesta.valorNumero != null
            ? Number(respuesta.valorNumero)
            : (respuesta.valorTexto ?? "—")}
        </p>
      </div>
    );
  }

  if (tipo === "FIRMA") {
    const fuente = respuesta.urlArchivo ?? respuesta.valorTexto;
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        {fuente && esDataUrlImagen(fuente) ? (
          <div className="mt-2 flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fuente}
              alt={`Firma: ${etiqueta}`}
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Sin firma</p>
        )}
      </div>
    );
  }

  if (tipo === "FOTO" || tipo === "ARCHIVO") {
    const url = respuesta.urlArchivo ?? respuesta.valorTexto;
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        {url && esUrlHttp(url) ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-ruralia-teal hover:underline"
          >
            <FileText className="h-4 w-4" />
            Ver archivo adjunto
          </a>
        ) : url && esDataUrlImagen(url) ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={etiqueta}
              className="max-h-48 w-full object-contain bg-zinc-50"
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Sin archivo</p>
        )}
      </div>
    );
  }

  if (tipo === "GPS") {
    const texto =
      respuesta.valorTexto ??
      (respuesta.valorJson != null
        ? JSON.stringify(respuesta.valorJson)
        : null);
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-zinc-900">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ruralia-teal" />
          <span className="break-all font-medium">{texto ?? "Sin ubicación"}</span>
        </p>
      </div>
    );
  }

  if (tipo === "TABLA") {
    const filas =
      respuesta.valorJson &&
      typeof respuesta.valorJson === "object" &&
      Array.isArray((respuesta.valorJson as { filas?: unknown }).filas)
        ? ((respuesta.valorJson as { filas: Record<string, unknown>[] }).filas ??
          [])
        : [];
    const columnas =
      filas.length > 0
        ? Object.keys(filas[0]).filter((k) => k !== "id")
        : [];

    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="mb-3 text-xs font-medium text-zinc-500">{etiqueta}</p>
        {filas.length === 0 ? (
          <p className="text-sm text-zinc-400">Sin filas registradas</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-100">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  {columnas.map((col) => (
                    <th key={col} className="px-3 py-2 font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, index) => (
                  <tr
                    key={index}
                    className="border-t border-zinc-100 text-zinc-800"
                  >
                    <td className="px-3 py-2 text-zinc-400">{index + 1}</td>
                    {columnas.map((col) => {
                      const valor = fila[col];
                      const texto =
                        valor == null || valor === ""
                          ? "—"
                          : Array.isArray(valor)
                            ? valor.join(", ")
                            : String(valor);
                      return (
                        <td key={col} className="px-3 py-2">
                          {esDataUrlImagen(texto) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={texto}
                              alt={col}
                              className="h-10 max-w-[120px] object-contain"
                            />
                          ) : (
                            texto
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // TEXTO y fallback
  let valorMostrado =
    respuesta.valorTexto?.trim() ||
    (respuesta.valorNumero != null ? String(respuesta.valorNumero) : "") ||
    "";

  // Si llegó un array serializado en texto, mostrarlo limpio
  const comoLista = parsearLista(valorMostrado);
  if (
    valorMostrado.startsWith("[") &&
    comoLista.length > 0 &&
    comoLista.join("") !== valorMostrado
  ) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {comoLista.map((opcion) => (
            <Pill key={opcion}>{opcion}</Pill>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
      <p className="mt-1.5 text-base font-medium leading-relaxed text-zinc-900">
        {valorMostrado || "—"}
      </p>
    </div>
  );
}

export function ResultadosJornada({ token, jornada }: ResultadosJornadaProps) {
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envios, setEnvios] = useState<EnvioConRespuestas[]>([]);
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      setError(null);
      try {
        const [lista, plantillasJornada] = await Promise.all([
          listarEnviosPorJornada(token, jornada.id),
          listarPlantillasPorJornada(token, jornada.id).catch(
            () => [] as PlantillaFormulario[],
          ),
        ]);
        const conRespuestas = await Promise.all(
          lista.map(async (envio) => ({
            envio,
            respuestas: await obtenerRespuestasEnvio(token, envio.id),
          })),
        );
        if (!cancelado) {
          setEnvios(conRespuestas);
          setPlantillas(plantillasJornada);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los resultados",
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
  }, [token, jornada.id]);

  const plantillaPorId = useMemo(() => {
    const mapa = new Map<string, PlantillaFormulario>();
    for (const p of plantillas) mapa.set(p.id, p);
    return mapa;
  }, [plantillas]);

  async function descargarPdf() {
    setDescargando(true);
    setError(null);
    try {
      const blob = await descargarPdfFormularioJornada(token, jornada.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `formulario-${jornada.fecha.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el PDF",
      );
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800">
            Formulario rellenado
          </h4>
          <p className="mt-1 text-xs text-zinc-500">
            Respuestas de{" "}
            <span className="font-medium text-zinc-700">
              {jornada.tecnicoResponsable?.nombre ?? "el agente"}
            </span>
            {" · "}
            {jornada.estado.replace(/_/g, " ")}
          </p>
        </div>
        <button
          type="button"
          disabled={descargando}
          onClick={() => void descargarPdf()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {descargando ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div className="inline-flex items-center gap-3 rounded-2xl border border-ruralia-teal-border bg-gradient-to-r from-ruralia-teal-soft/70 to-white px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ruralia-teal-text/80">
            Unidades en esta jornada
          </p>
          <p className="text-xl font-semibold tabular-nums text-ruralia-teal-text">
            {jornada.cantidadEjecutada != null
              ? Number(jornada.cantidadEjecutada)
              : "—"}
            {jornada.meta?.unidadMedida ? (
              <span className="ml-1.5 text-sm font-medium">
                {jornada.meta.unidadMedida}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-zinc-500">Cargando respuestas del formulario...</p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!cargando && !error && envios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-600">
            Aún no hay formulario enviado
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Cuando el agente complete el formulario en campo, las respuestas
            aparecerán aquí.
          </p>
        </div>
      ) : null}

      {envios.map(({ envio, respuestas }) => {
        const plantilla = envio.plantillaFormularioId
          ? plantillaPorId.get(envio.plantillaFormularioId)
          : undefined;
        const nombreFormulario =
          plantilla?.nombre ??
          (envios.length > 1
            ? `Registro ${envio.indiceFila + 1}`
            : "Respuestas del formulario");

        return (
          <article
            key={envio.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ruralia-teal-soft text-ruralia-teal">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {nombreFormulario}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Enviado el{" "}
                    {new Date(envio.enviadoEn).toLocaleString("es-CO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
              {envios.length > 1 ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-200">
                  Fila {envio.indiceFila + 1}
                </span>
              ) : null}
            </header>

            {respuestas.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">
                Este envío no tiene respuestas.
              </p>
            ) : (
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {respuestas.map((respuesta) => (
                  <CampoFormularioVista
                    key={respuesta.id}
                    respuesta={respuesta}
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
