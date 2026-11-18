"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  Download,
  FileText,
  Hash,
  Lock,
  MapPin,
  PencilLine,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  descargarPdfFormularioJornada,
  listarEnviosPorJornada,
  listarPlantillasPorJornada,
  obtenerPlantillaFormulario,
  obtenerRespuestasEnvio,
} from "@/lib/api";
import {
  CLAVE_FILA_BENEFICIARIO,
  CorreccionEnvioFormulario,
} from "@/components/proyectos/gestion-proyecto/correccion-envio-formulario";
import { usePermisos } from "@/lib/use-permisos";
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
  if (!valor) return false;
  const texto = valor.trim();
  // Admite parámetros como ";name=foto.jpg" antes de ";base64".
  return /^data:image\/[\w+.-]+(?:;[^;,]*)*,/i.test(texto);
}

/** Archivo adjunto que viaja como data URL: `data:<mime>;name=<nombre>;base64,...`. */
function leerDataUrlArchivo(
  valor: string | null | undefined,
): { mime: string; nombre: string | null; tamano: number } | null {
  if (!valor) return null;
  const texto = valor.trim();
  const data = /^data:([^;,]+)((?:;[^;,]*)*?);base64,/i.exec(texto);
  if (!data) return null;
  const crudo = /;name=([^;,]*)/i.exec(data[2] ?? "")?.[1];
  let nombre: string | null = null;
  if (crudo) {
    try {
      nombre = decodeURIComponent(crudo);
    } catch {
      nombre = crudo;
    }
  }
  return {
    mime: data[1],
    nombre,
    tamano: Math.floor(((texto.length - data[0].length) * 3) / 4),
  };
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Descarga un data URL como archivo (el navegador no abre data URL en pestañas nuevas). */
function descargarDataUrl(dataUrl: string, nombre: string, mime: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AdjuntoDataUrl({ url, etiqueta }: { url: string; etiqueta: string }) {
  const datos = leerDataUrlArchivo(url);
  if (!datos) return null;
  const nombre = datos.nombre ?? `${etiqueta}${datos.mime.includes("pdf") ? ".pdf" : ""}`;
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-3 py-2.5">
      <FileText className="h-5 w-5 shrink-0 text-ruralia-teal-text" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ruralia-teal-text">{nombre}</p>
        <p className="text-xs text-zinc-500">{formatearTamano(datos.tamano)}</p>
      </div>
      <button
        type="button"
        onClick={() => descargarDataUrl(url, nombre, datos.mime)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-ruralia-teal-border bg-white px-3 py-1.5 text-xs font-medium text-ruralia-teal hover:bg-ruralia-teal-soft"
      >
        <Download className="h-3.5 w-3.5" />
        Descargar
      </button>
    </div>
  );
}

function esUrlHttp(valor: string): boolean {
  return /^https?:\/\//i.test(valor) || valor.startsWith("/");
}

function leerUbicacion(valor: unknown): {
  latitud: number;
  longitud: number;
  precisionMetros?: number;
  capturadoEn?: string;
} | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const u = valor as Record<string, unknown>;
  if (typeof u.latitud !== "number" || typeof u.longitud !== "number") return null;
  if (!Number.isFinite(u.latitud) || !Number.isFinite(u.longitud)) return null;
  return {
    latitud: u.latitud,
    longitud: u.longitud,
    precisionMetros:
      typeof u.precisionMetros === "number" ? u.precisionMetros : undefined,
    capturadoEn: typeof u.capturadoEn === "string" ? u.capturadoEn : undefined,
  };
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
    const json = respuesta.valorJson as {
      filas?: unknown;
      latitud?: unknown;
      longitud?: unknown;
    };
    if (json && typeof json === "object" && Array.isArray(json.filas)) {
      return "TABLA";
    }
    if (
      json &&
      typeof json === "object" &&
      typeof json.latitud === "number" &&
      typeof json.longitud === "number"
    ) {
      return "GPS";
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

/** Indica si la respuesta vino de la ficha del beneficiario o la corrigió administración. */
function MarcaOrigen({ origen }: { origen?: "ficha" | "corregida" }) {
  if (origen === "corregida") {
    return (
      <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
        <ShieldCheck className="h-3 w-3" />
        Corregida
      </span>
    );
  }
  if (origen === "ficha") {
    return (
      <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[10px] font-semibold text-ruralia-teal-text">
        <Lock className="h-3 w-3" />
        De la ficha
      </span>
    );
  }
  return null;
}

function CampoFormularioVista({
  respuesta,
  origen,
}: {
  respuesta: RespuestaFormularioDetalle;
  origen?: "ficha" | "corregida";
}) {
  const tipo = resolverTipo(respuesta);
  const etiquetaBase = respuesta.etiquetaCampo ?? respuesta.claveCampo;
  const etiqueta = (
    <>
      {etiquetaBase}
      <MarcaOrigen origen={origen} />
    </>
  );

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
    const fuente =
      respuesta.urlArchivo ??
      (esDataUrlImagen(respuesta.valorTexto) ? respuesta.valorTexto : null);
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        {fuente && esDataUrlImagen(fuente) ? (
          <div className="mt-2 flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fuente}
              alt={`Firma: ${etiquetaBase}`}
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        ) : fuente && esUrlHttp(fuente) ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fuente}
              alt={`Firma: ${etiquetaBase}`}
              className="max-h-24 w-full object-contain"
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
              alt={etiquetaBase}
              className="max-h-48 w-full object-contain bg-zinc-50"
            />
          </div>
        ) : url && leerDataUrlArchivo(url) ? (
          <AdjuntoDataUrl url={url} etiqueta={etiquetaBase} />
        ) : (
          <p className="mt-2 text-sm text-zinc-400">Sin archivo</p>
        )}
      </div>
    );
  }

  if (tipo === "GPS") {
    const ubicacion = leerUbicacion(respuesta.valorJson);
    const mapa = ubicacion
      ? `https://www.google.com/maps/search/?api=1&query=${ubicacion.latitud},${ubicacion.longitud}`
      : null;
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 sm:col-span-2">
        <p className="text-xs font-medium text-zinc-500">{etiqueta}</p>
        {ubicacion ? (
          <div className="mt-2 space-y-1 text-sm text-zinc-900">
            <p className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 shrink-0 text-ruralia-teal" />
              Ubicación registrada
            </p>
            {ubicacion.capturadoEn ? (
              <p className="text-xs text-zinc-500">
                {new Date(ubicacion.capturadoEn).toLocaleString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
            <p>Latitud: {ubicacion.latitud.toFixed(6)}</p>
            <p>Longitud: {ubicacion.longitud.toFixed(6)}</p>
            <p>
              Precisión:{" "}
              {ubicacion.precisionMetros != null
                ? `±${Math.round(ubicacion.precisionMetros)} m`
                : "no disponible"}
            </p>
            {mapa ? (
              <>
                <iframe
                  title={`Mapa de ${etiquetaBase}`}
                  src={`https://maps.google.com/maps?q=${ubicacion.latitud},${ubicacion.longitud}&z=16&output=embed`}
                  className="mt-2 h-44 w-full rounded-xl border border-zinc-100"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={mapa}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-sm font-medium text-ruralia-teal hover:underline"
                >
                  Ver en el mapa
                </a>
              </>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">
            {respuesta.valorTexto ?? "Sin ubicación"}
          </p>
        )}
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
        ? Object.keys(filas[0]).filter(
            (k) => k !== "id" && k !== CLAVE_FILA_BENEFICIARIO,
          )
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
  const [recarga, setRecarga] = useState(0);
  const [corrigiendo, setCorrigiendo] = useState<{
    envio: EnvioFormularioResumen;
    respuestas: RespuestaFormularioDetalle[];
    plantilla: PlantillaFormulario;
  } | null>(null);
  const [abriendoCorreccion, setAbriendoCorreccion] = useState<string | null>(null);
  const { puede } = usePermisos();
  const puedeCorregir = puede("formularios.corregir_respuestas");

  async function abrirCorreccion(item: EnvioConRespuestas) {
    if (!item.envio.plantillaFormularioId) return;
    setAbriendoCorreccion(item.envio.id);
    setError(null);
    try {
      // La de la jornada pudo cambiar: se corrige contra la plantilla del envío.
      const plantilla = await obtenerPlantillaFormulario(
        token,
        item.envio.plantillaFormularioId,
      );
      setCorrigiendo({ ...item, plantilla });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la corrección");
    } finally {
      setAbriendoCorreccion(null);
    }
  }

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
  }, [token, jornada.id, recarga]);

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
        const deFicha = new Set(
          (envio.origenRespuestas?.autocompletado ?? [])
            .filter((r) => !r.columna)
            .map((r) => r.clave),
        );
        const corregidas = new Set(envio.origenRespuestas?.corregidasPorAdmin ?? []);

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
                  {envio.beneficiarioNombre ? (
                    <p className="flex items-center gap-1 text-xs font-medium text-ruralia-teal-text">
                      <UserRound className="h-3 w-3" />
                      {envio.beneficiarioNombre}
                    </p>
                  ) : null}
                  <p className="text-xs text-zinc-500">
                    Enviado el{" "}
                    {new Date(envio.enviadoEn).toLocaleString("es-CO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {envios.length > 1 && !envio.beneficiarioNombre ? (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-200">
                    Fila {envio.indiceFila + 1}
                  </span>
                ) : null}
                {puedeCorregir && envio.plantillaFormularioId ? (
                  <button
                    type="button"
                    disabled={abriendoCorreccion === envio.id}
                    onClick={() => void abrirCorreccion({ envio, respuestas })}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    {abriendoCorreccion === envio.id ? "Abriendo…" : "Corregir"}
                  </button>
                ) : null}
              </div>
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
                    origen={
                      corregidas.has(respuesta.claveCampo)
                        ? "corregida"
                        : deFicha.has(respuesta.claveCampo)
                          ? "ficha"
                          : undefined
                    }
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}

      {corrigiendo ? (
        <CorreccionEnvioFormulario
          token={token}
          envio={corrigiendo.envio}
          plantilla={corrigiendo.plantilla}
          respuestas={corrigiendo.respuestas}
          onCerrar={() => setCorrigiendo(null)}
          onGuardado={() => {
            setCorrigiendo(null);
            setRecarga((n) => n + 1);
          }}
        />
      ) : null}
    </div>
  );
}
