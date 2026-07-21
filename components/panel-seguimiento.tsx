"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  listarCronologiaActor,
  listarCronologiaProyecto,
  listarProyectos,
  listarUsuarios,
  obtenerResumenCronologiaProyecto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  EventoCronologia,
  Proyecto,
  ResumenCronologiaProyecto,
  Usuario,
} from "@/lib/types";

type ModoSeguimiento = "persona" | "proyecto";
type PeriodoFiltro = "7" | "30" | "90" | "todo";

const LIMITE_PAGINA = 30;

function esAgenteCampo(usuario: Usuario): boolean {
  return (usuario.roles ?? []).some((rol) => rol.nombre === "CAMPO");
}

function etiquetaAccion(accion: string): string {
  switch (accion) {
    case "JORNADA_CREADA":
      return "Jornada creada";
    case "JORNADA_ESTADO_CAMBIADO":
      return "Estado jornada";
    case "JORNADA_CANCELADA":
      return "Jornada cancelada";
    case "FORMULARIO_ENVIADO":
      return "Formulario";
    case "ACTIVIDAD_COMPLETADA":
      return "Actividad";
    case "SUBACTIVIDAD_COMPLETADA":
      return "Subactividad";
    default:
      return accion;
  }
}

function formatearFechaEvento(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatearDiaGrupo(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function claveDia(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toISOString().slice(0, 10);
}

function deepLinkJornada(evento: EventoCronologia): string | null {
  if (evento.entidadTipo !== "jornada" || !evento.entidadId) return null;
  return `/proyectos/${evento.proyectoId}?tab=jornadas&jornadaId=${evento.entidadId}`;
}

function rangoDesdePeriodo(periodo: PeriodoFiltro): {
  fechaDesde?: string;
  fechaHasta?: string;
} {
  if (periodo === "todo") return {};
  const dias = Number(periodo);
  const desde = new Date();
  desde.setHours(0, 0, 0, 0);
  desde.setDate(desde.getDate() - dias);
  return { fechaDesde: desde.toISOString() };
}

function agruparPorDia(
  eventos: EventoCronologia[],
): Array<{ dia: string; etiqueta: string; eventos: EventoCronologia[] }> {
  const mapa = new Map<string, EventoCronologia[]>();
  for (const evento of eventos) {
    const clave = claveDia(evento.ocurridoEn);
    const lista = mapa.get(clave) ?? [];
    lista.push(evento);
    mapa.set(clave, lista);
  }
  return [...mapa.entries()].map(([dia, evs]) => ({
    dia,
    etiqueta: formatearDiaGrupo(evs[0].ocurridoEn),
    eventos: evs,
  }));
}

function ItemEvento({
  evento,
  mostrarProyecto,
  mostrarActor,
}: {
  evento: EventoCronologia;
  mostrarProyecto: boolean;
  mostrarActor: boolean;
}) {
  const enlace = deepLinkJornada(evento);
  const origen =
    evento.detalle && typeof evento.detalle.origen === "string"
      ? evento.detalle.origen
      : null;

  return (
    <li className="relative pb-5 last:pb-0">
      <span className="absolute -left-[1.625rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-ruralia-teal" />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <time className="text-xs text-zinc-500">
            {formatearFechaEvento(evento.ocurridoEn)}
          </time>
          <span className="rounded-md bg-ruralia-teal/10 px-2 py-0.5 text-xs font-medium text-ruralia-teal-text">
            {etiquetaAccion(evento.accion)}
          </span>
          {origen === "sync" ? (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Offline
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-zinc-900">
          {enlace ? (
            <Link
              href={enlace}
              className="text-ruralia-teal-text underline-offset-2 hover:underline"
            >
              {evento.titulo}
            </Link>
          ) : (
            evento.titulo
          )}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500">
          {mostrarProyecto && evento.proyectoNombre ? (
            <span>Proyecto: {evento.proyectoNombre}</span>
          ) : null}
          {mostrarActor && evento.actorNombre ? (
            <span>Por: {evento.actorNombre}</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function PanelSeguimiento() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const modoInicial =
    searchParams.get("modo") === "proyecto" ? "proyecto" : "persona";
  const idInicial = searchParams.get("id") ?? "";

  const [modo, setModo] = useState<ModoSeguimiento>(modoInicial);
  const [seleccionId, setSeleccionId] = useState(idInicial);
  const [agentes, setAgentes] = useState<Usuario[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventos, setEventos] = useState<EventoCronologia[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalEventos, setTotalEventos] = useState(0);
  const [cargandoCronologia, setCargandoCronologia] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorCronologia, setErrorCronologia] = useState<string | null>(null);

  const [resumen, setResumen] = useState<ResumenCronologiaProyecto | null>(
    null,
  );
  const [cargandoResumen, setCargandoResumen] = useState(false);

  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroActorId, setFiltroActorId] = useState("");

  const sincronizarUrl = useCallback(
    (siguienteModo: ModoSeguimiento, siguienteId: string) => {
      const params = new URLSearchParams();
      params.set("modo", siguienteModo);
      if (siguienteId) params.set("id", siguienteId);
      router.replace(`/seguimiento?${params.toString()}`);
    },
    [router],
  );

  const cargarOpciones = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [usuariosRes, proyectosRes] = await Promise.all([
        listarUsuarios(token, { estaActivo: true, limite: 100 }),
        listarProyectos(token, { limite: 100 }),
      ]);
      setAgentes(usuariosRes.datos.filter(esAgenteCampo));
      setProyectos(proyectosRes.datos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar opciones",
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargarOpciones();
  }, [cargarOpciones]);

  const filtrosActivos = useMemo(() => {
    const rango = rangoDesdePeriodo(periodo);
    return {
      ...rango,
      ...(filtroAccion ? { accion: filtroAccion } : {}),
      ...(modo === "proyecto" && filtroActorId
        ? { actorId: filtroActorId }
        : {}),
    };
  }, [periodo, filtroAccion, filtroActorId, modo]);

  const cargarResumen = useCallback(async () => {
    if (!token || !seleccionId || modo !== "proyecto") {
      setResumen(null);
      return;
    }
    setCargandoResumen(true);
    try {
      const data = await obtenerResumenCronologiaProyecto(token, seleccionId);
      setResumen(data);
    } catch {
      setResumen(null);
    } finally {
      setCargandoResumen(false);
    }
  }, [token, seleccionId, modo]);

  useEffect(() => {
    void cargarResumen();
  }, [cargarResumen]);

  const cargarCronologia = useCallback(
    async (paginaSolicitada: number, acumular: boolean) => {
      if (!token || !seleccionId) {
        setEventos([]);
        setTotalEventos(0);
        setTotalPaginas(0);
        setErrorCronologia(null);
        return;
      }

      if (acumular) setCargandoMas(true);
      else setCargandoCronologia(true);
      setErrorCronologia(null);

      try {
        const params = {
          pagina: paginaSolicitada,
          limite: LIMITE_PAGINA,
          ...filtrosActivos,
        };
        const respuesta =
          modo === "persona"
            ? await listarCronologiaActor(token, seleccionId, params)
            : await listarCronologiaProyecto(token, seleccionId, params);

        setEventos((prev) =>
          acumular ? [...prev, ...respuesta.datos] : respuesta.datos,
        );
        setPagina(respuesta.pagina);
        setTotalPaginas(respuesta.totalPaginas);
        setTotalEventos(respuesta.total);
      } catch (err) {
        if (!acumular) {
          setEventos([]);
          setTotalEventos(0);
          setTotalPaginas(0);
        }
        setErrorCronologia(
          err instanceof Error ? err.message : "Error al cargar cronología",
        );
      } finally {
        setCargandoCronologia(false);
        setCargandoMas(false);
      }
    },
    [token, seleccionId, modo, filtrosActivos],
  );

  useEffect(() => {
    void cargarCronologia(1, false);
  }, [cargarCronologia]);

  function cambiarModo(siguiente: ModoSeguimiento) {
    setModo(siguiente);
    setSeleccionId("");
    setFiltroAccion("");
    setFiltroActorId("");
    setPeriodo("30");
    sincronizarUrl(siguiente, "");
  }

  function cambiarSeleccion(id: string) {
    setSeleccionId(id);
    setFiltroAccion("");
    setFiltroActorId("");
    sincronizarUrl(modo, id);
  }

  const seleccionadoPersona = useMemo(
    () => agentes.find((a) => a.id === seleccionId) ?? null,
    [agentes, seleccionId],
  );

  const seleccionadoProyecto = useMemo(
    () => proyectos.find((p) => p.id === seleccionId) ?? null,
    [proyectos, seleccionId],
  );

  const tituloSeleccion =
    modo === "persona"
      ? seleccionadoPersona?.nombreCompleto
      : seleccionadoProyecto?.nombre;

  const grupos = useMemo(() => agruparPorDia(eventos), [eventos]);
  const hayMas = pagina < totalPaginas;
  const filtrosProyectoActivos = Boolean(filtroAccion || filtroActorId);

  if (cargando) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Seguimiento</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {modo === "proyecto"
            ? "Vista de proyecto a escala: primero el resumen y filtros, después el detalle."
            : "Cronología de un agente de campo: qué hizo y cuándo."}
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cambiarModo("persona")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            modo === "persona"
              ? "bg-ruralia-teal text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Por persona
        </button>
        <button
          type="button"
          onClick={() => cambiarModo("proyecto")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            modo === "proyecto"
              ? "bg-ruralia-teal text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Por proyecto
        </button>
      </div>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          {modo === "persona" ? "Agente de campo" : "Proyecto"}
        </label>
        {modo === "persona" ? (
          <select
            value={seleccionId}
            onChange={(e) => cambiarSeleccion(e.target.value)}
            className="w-full max-w-lg rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
          >
            <option value="">Selecciona un agente…</option>
            {agentes.map((agente) => (
              <option key={agente.id} value={agente.id}>
                {agente.nombreCompleto} ({agente.correo})
              </option>
            ))}
          </select>
        ) : (
          <select
            value={seleccionId}
            onChange={(e) => cambiarSeleccion(e.target.value)}
            className="w-full max-w-lg rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
          >
            <option value="">Selecciona un proyecto…</option>
            {proyectos.map((proyecto) => (
              <option key={proyecto.id} value={proyecto.id}>
                {proyecto.nombre}
                {proyecto.estado ? ` · ${proyecto.estado}` : ""}
              </option>
            ))}
          </select>
        )}
      </section>

      {!seleccionId ? (
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <p className="text-sm text-zinc-500">
            Selecciona {modo === "persona" ? "un agente" : "un proyecto"} para
            abrir su seguimiento.
          </p>
        </section>
      ) : (
        <>
          {modo === "proyecto" ? (
            <section className="space-y-4 rounded-2xl border border-ruralia-teal-border bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
                    Panorama del proyecto
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-zinc-900">
                    {tituloSeleccion}
                  </h2>
                  {resumen?.ultimaActividadEn ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Última actividad:{" "}
                      {formatearFechaEvento(resumen.ultimaActividadEn)}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-semibold tabular-nums text-zinc-800">
                  {cargandoResumen
                    ? "…"
                    : `${resumen?.totalEventos ?? 0} eventos totales`}
                </p>
              </div>

              {cargandoResumen ? (
                <Spinner />
              ) : resumen && resumen.totalEventos > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Por tipo de acción
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {resumen.porAccion.map((item) => {
                        const activo = filtroAccion === item.accion;
                        return (
                          <button
                            key={item.accion}
                            type="button"
                            onClick={() =>
                              setFiltroAccion(activo ? "" : item.accion)
                            }
                            className={`rounded-lg px-3 py-1.5 text-left text-xs transition ${
                              activo
                                ? "bg-ruralia-teal text-white"
                                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                            }`}
                          >
                            <span className="font-medium">
                              {etiquetaAccion(item.accion)}
                            </span>
                            <span className="ml-2 tabular-nums opacity-80">
                              {item.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Quién más actúa (clic para filtrar)
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
                      {resumen.porActor.map((item) => {
                        const activo = filtroActorId === item.actorId;
                        return (
                          <li key={item.actorId}>
                            <button
                              type="button"
                              onClick={() =>
                                setFiltroActorId(activo ? "" : item.actorId)
                              }
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                                activo
                                  ? "bg-ruralia-teal text-white"
                                  : "hover:bg-zinc-50"
                              }`}
                            >
                              <span className="truncate font-medium">
                                {item.actorNombre}
                              </span>
                              <span className="shrink-0 tabular-nums text-xs opacity-80">
                                {item.total}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  Aún no hay actividad registrada en este proyecto.
                </p>
              )}
            </section>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-ruralia-teal-border bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
                  {modo === "persona"
                    ? "Cronología del agente"
                    : "Actividad filtrada"}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-900">
                  {modo === "persona" ? tituloSeleccion : "Detalle"}
                </h2>
              </div>
              {!cargandoCronologia && !errorCronologia ? (
                <p className="text-xs text-zinc-500">
                  {totalEventos.toLocaleString("es-CO")} resultado
                  {totalEventos === 1 ? "" : "s"}
                  {modo === "proyecto" && filtrosProyectoActivos
                    ? " con filtros"
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-b border-zinc-100 pb-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Periodo
                </label>
                <select
                  value={periodo}
                  onChange={(e) =>
                    setPeriodo(e.target.value as PeriodoFiltro)
                  }
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                >
                  <option value="7">Últimos 7 días</option>
                  <option value="30">Últimos 30 días</option>
                  <option value="90">Últimos 90 días</option>
                  <option value="todo">Todo el historial</option>
                </select>
              </div>

              {modo === "persona" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Tipo
                  </label>
                  <select
                    value={filtroAccion}
                    onChange={(e) => setFiltroAccion(e.target.value)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                  >
                    <option value="">Todas las acciones</option>
                    <option value="JORNADA_CREADA">Jornada creada</option>
                    <option value="JORNADA_ESTADO_CAMBIADO">
                      Estado jornada
                    </option>
                    <option value="JORNADA_CANCELADA">Jornada cancelada</option>
                    <option value="FORMULARIO_ENVIADO">Formulario</option>
                    <option value="ACTIVIDAD_COMPLETADA">Actividad</option>
                    <option value="SUBACTIVIDAD_COMPLETADA">
                      Subactividad
                    </option>
                  </select>
                </div>
              ) : null}

              {(filtroAccion || filtroActorId || periodo !== "30") && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroAccion("");
                    setFiltroActorId("");
                    setPeriodo("30");
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-600 underline-offset-2 hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {errorCronologia ? <Alerta mensaje={errorCronologia} /> : null}

            {cargandoCronologia ? (
              <Spinner />
            ) : !errorCronologia && eventos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-zinc-700">
                  Sin eventos en este recorte
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {modo === "proyecto"
                    ? "Prueba ampliar el periodo o quitar filtros. El panorama de arriba muestra el volumen total del proyecto."
                    : "Prueba ampliar el periodo o cambiar el tipo de acción."}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {grupos.map((grupo) => (
                  <div key={grupo.dia}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {grupo.etiqueta}
                      <span className="ml-2 font-normal normal-case text-zinc-400">
                        · {grupo.eventos.length}
                      </span>
                    </h3>
                    <ol className="relative border-l border-ruralia-teal-border pl-6">
                      {grupo.eventos.map((evento) => (
                        <ItemEvento
                          key={evento.id}
                          evento={evento}
                          mostrarProyecto={modo === "persona"}
                          mostrarActor={modo === "proyecto"}
                        />
                      ))}
                    </ol>
                  </div>
                ))}

                {hayMas ? (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      disabled={cargandoMas}
                      onClick={() => void cargarCronologia(pagina + 1, true)}
                      className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {cargandoMas
                        ? "Cargando…"
                        : `Cargar más (${pagina}/${totalPaginas})`}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
