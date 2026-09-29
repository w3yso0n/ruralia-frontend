"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, ListFilter, Search } from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  listarActoresCronologia,
  listarCronologiaActor,
  listarCronologiaProyecto,
  listarProyectos,
  obtenerResumenCronologiaProyecto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  EventoCronologia,
  Proyecto,
  ResumenCronologiaProyecto,
} from "@/lib/types";

type ModoSeguimiento = "persona" | "proyecto";
type PeriodoFiltro = "7" | "30" | "90" | "todo";

const LIMITE_PAGINA = 30;

const OPCIONES_PERIODO = [
  { id: "7", nombre: "Últimos 7 días" },
  { id: "30", nombre: "Últimos 30 días" },
  { id: "90", nombre: "Últimos 90 días" },
  { id: "todo", nombre: "Todo el historial" },
];

const OPCIONES_TIPO_ACCION = [
  { id: "JORNADA_CREADA", nombre: "Jornada creada" },
  { id: "JORNADA_ESTADO_CAMBIADO", nombre: "Estado jornada" },
  { id: "JORNADA_CANCELADA", nombre: "Jornada cancelada" },
  { id: "FORMULARIO_ENVIADO", nombre: "Formulario" },
  { id: "ACTIVIDAD_COMPLETADA", nombre: "Actividad" },
  { id: "SUBACTIVIDAD_COMPLETADA", nombre: "Subactividad" },
];

function etiquetaEstadoProyecto(estado: string): string {
  switch (estado) {
    case "ACTIVO":
      return "Activo";
    case "BORRADOR":
      return "Borrador";
    case "SUSPENDIDO":
      return "Suspendido";
    case "COMPLETADO":
      return "Completado";
    default:
      return estado;
  }
}

type ActorSeguimiento = {
  id: string;
  nombreCompleto: string;
  correo: string;
};

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
    case "JORNADA_ENVIADA_REVISION":
      return "Enviada a revisión";
    case "JORNADA_REENVIADA_REVISION":
      return "Reenviada a revisión";
    case "JORNADA_SUBIDA_PROYECTO":
      return "Subida al proyecto";
    case "JORNADA_APROBADA":
      return "Aprobada";
    case "JORNADA_RECHAZADA":
      return "Rechazada";
    case "DOCUMENTO_VERSION_CREADA":
      return "Nueva versión doc.";
    default:
      return accion
        .toLowerCase()
        .split("_")
        .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
  }
}

function EstadoVacio({
  titulo,
  detalle,
  onAccion,
  etiquetaBoton,
}: {
  titulo: string;
  detalle: string;
  onAccion?: () => void;
  etiquetaBoton?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ruralia-teal-border bg-ruralia-teal-soft/30 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-zinc-900">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
        {detalle}
      </p>
      {onAccion && etiquetaBoton ? (
        <button
          type="button"
          onClick={onAccion}
          className="mt-4 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
        >
          {etiquetaBoton}
        </button>
      ) : null}
    </div>
  );
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
  const { puede } = usePermisos();
  const router = useRouter();
  const searchParams = useSearchParams();

  const puedeSeguimiento = puede("proyectos.ver") || puede("jornadas.ver");

  const modoInicial: ModoSeguimiento =
    searchParams.get("modo") === "persona" ? "persona" : "proyecto";
  const idInicial = searchParams.get("id") ?? "";

  const [modo, setModo] = useState<ModoSeguimiento>(modoInicial);
  const [seleccionId, setSeleccionId] = useState(idInicial);
  const [agentes, setAgentes] = useState<ActorSeguimiento[]>([]);
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
  const [busqueda, setBusqueda] = useState("");

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
    if (!token || !puedeSeguimiento) return;
    setCargando(true);
    setError(null);
    try {
      const [actoresRes, proyectosRes] = await Promise.all([
        listarActoresCronologia(token),
        listarProyectos(token, { limite: 100 }),
      ]);
      setAgentes(actoresRes);
      setProyectos(proyectosRes.datos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar opciones",
      );
    } finally {
      setCargando(false);
    }
  }, [token, puedeSeguimiento]);

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
    setBusqueda("");
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

  if (!puedeSeguimiento) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes permisos para ver Seguimiento. Se requiere acceso a proyectos
        o jornadas.
      </div>
    );
  }

  if (cargando) return <Spinner />;

  const sinActividadProyecto =
    modo === "proyecto" &&
    Boolean(seleccionId) &&
    !cargandoResumen &&
    resumen !== null &&
    resumen.totalEventos === 0;

  const hayFiltros =
    Boolean(filtroAccion || filtroActorId) || periodo !== "30";

  function limpiarFiltros() {
    setFiltroAccion("");
    setFiltroActorId("");
    setPeriodo("30");
  }

  function verTodoElHistorial() {
    setFiltroAccion("");
    setFiltroActorId("");
    setPeriodo("todo");
  }

  const etiquetaPeriodo =
    OPCIONES_PERIODO.find((opcion) => opcion.id === periodo)?.nombre ??
    "este periodo";

  const textoBusqueda = busqueda.trim().toLowerCase();
  const proyectosVisibles = proyectos.filter((proyecto) =>
    proyecto.nombre.toLowerCase().includes(textoBusqueda),
  );
  const agentesVisibles = agentes.filter(
    (agente) =>
      agente.nombreCompleto.toLowerCase().includes(textoBusqueda) ||
      agente.correo.toLowerCase().includes(textoBusqueda),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Seguimiento</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Qué ocurrió en campo, por proyecto o por persona.
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {seleccionId ? (
          <button
            type="button"
            onClick={() => cambiarSeleccion("")}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            {modo === "persona" ? "Todas las personas" : "Todos los proyectos"}
          </button>
        ) : (
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ruralia-teal-muted" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder={
                modo === "persona" ? "Buscar persona" : "Buscar proyecto"
              }
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-9 pr-4 text-sm text-zinc-900 outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
          </div>
        )}
      </div>

      {!seleccionId ? (
        <ul className="space-y-2">
          {modo === "persona" ? (
            agentesVisibles.length === 0 ? (
              <li>
                <EstadoVacio
                  titulo="No hay personas para mostrar"
                  detalle={
                    textoBusqueda
                      ? "Prueba con otro nombre o correo."
                      : "Cuando haya agentes con acceso a campo, aparecerán aquí."
                  }
                />
              </li>
            ) : (
              agentesVisibles.map((agente) => (
                <li key={agente.id}>
                  <button
                    type="button"
                    onClick={() => cambiarSeleccion(agente.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ruralia-teal-border bg-white px-4 py-3.5 text-left transition hover:bg-ruralia-teal-soft"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-zinc-900">
                        {agente.nombreCompleto}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-zinc-500">
                        {agente.correo}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ruralia-teal-muted" />
                  </button>
                </li>
              ))
            )
          ) : proyectosVisibles.length === 0 ? (
            <li>
              <EstadoVacio
                titulo="No hay proyectos para mostrar"
                detalle={
                  textoBusqueda
                    ? "Prueba con otro nombre."
                    : "Cuando haya proyectos, aparecerán aquí para abrir su seguimiento."
                }
              />
            </li>
          ) : (
            proyectosVisibles.map((proyecto) => (
              <li key={proyecto.id}>
                <button
                  type="button"
                  onClick={() => cambiarSeleccion(proyecto.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-ruralia-teal-border bg-white px-4 py-3.5 text-left transition hover:bg-ruralia-teal-soft"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-zinc-900">
                      {proyecto.nombre}
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">
                      {etiquetaEstadoProyecto(proyecto.estado)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ruralia-teal-muted" />
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {seleccionId && modo === "proyecto" ? (
        <section className="space-y-5 rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
                Resumen
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">
                {tituloSeleccion}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {cargandoResumen
                  ? "Cargando resumen…"
                  : resumen?.ultimaActividadEn
                    ? `Última actividad: ${formatearFechaEvento(resumen.ultimaActividadEn)}`
                    : "Sin actividad registrada"}
              </p>
            </div>
            <div className="rounded-xl bg-ruralia-teal-soft px-4 py-3 text-right">
              <p className="text-2xl font-semibold tabular-nums text-zinc-900">
                {cargandoResumen ? "…" : (resumen?.totalEventos ?? 0)}
              </p>
              <p className="text-xs font-medium text-ruralia-teal-text">
                {(resumen?.totalEventos ?? 0) === 1
                  ? "evento en total"
                  : "eventos en total"}
              </p>
            </div>
          </div>

          {cargandoResumen ? (
            <Spinner />
          ) : sinActividadProyecto ? (
            <EstadoVacio
              titulo="Este proyecto aún no tiene actividad"
              detalle="Cuando haya jornadas, formularios o cambios de estado, el resumen y la cronología aparecerán aquí."
            />
          ) : resumen ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700">
                  Acciones
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
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          activo
                            ? "bg-ruralia-teal text-white"
                            : "border border-ruralia-teal-border bg-white text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                        }`}
                      >
                        {etiquetaAccion(item.accion)}
                        <span className="ml-1.5 tabular-nums opacity-80">
                          {item.total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-zinc-700">
                  Personas
                </p>
                <p className="mb-2 text-xs text-zinc-500">
                  Clic para ver solo lo que hizo esa persona.
                </p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {resumen.porActor.map((item) => {
                    const activo = filtroActorId === item.actorId;
                    return (
                      <li key={item.actorId}>
                        <button
                          type="button"
                          onClick={() =>
                            setFiltroActorId(activo ? "" : item.actorId)
                          }
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                            activo
                              ? "border-ruralia-teal bg-ruralia-teal text-white"
                              : "border-zinc-200 bg-white text-zinc-900 hover:bg-ruralia-teal-soft"
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
          ) : null}
        </section>
      ) : null}

      {seleccionId && !sinActividadProyecto ? (
        <section className="space-y-4 rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Cronología
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {modo === "persona"
                  ? (tituloSeleccion ?? "Agente")
                  : "Movimientos del periodo seleccionado"}
              </p>
            </div>
            {!cargandoCronologia && !errorCronologia ? (
              <p className="text-sm font-medium tabular-nums text-zinc-700">
                {totalEventos.toLocaleString("es-CO")}{" "}
                {totalEventos === 1 ? "resultado" : "resultados"}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-56">
              <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                Periodo
              </span>
              <SelectorDesplegable
                value={periodo}
                onChange={(id) => setPeriodo(id as PeriodoFiltro)}
                opciones={OPCIONES_PERIODO}
                icono={CalendarDays}
              />
            </div>

            {modo === "persona" ? (
              <div className="w-56">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  Tipo
                </span>
                <SelectorDesplegable
                  value={filtroAccion}
                  onChange={setFiltroAccion}
                  opciones={OPCIONES_TIPO_ACCION}
                  permitirVacio
                  etiquetaVacio="Todas las acciones"
                  placeholder="Todas las acciones"
                  icono={ListFilter}
                />
              </div>
            ) : null}

            {hayFiltros ? (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {errorCronologia ? <Alerta mensaje={errorCronologia} /> : null}

          {cargandoCronologia ? (
            <Spinner />
          ) : !errorCronologia && eventos.length === 0 ? (
            <EstadoVacio
              titulo={
                modo === "proyecto" && (resumen?.totalEventos ?? 0) > 0
                  ? `Nada en ${etiquetaPeriodo.toLowerCase()}`
                  : "Sin movimientos en este periodo"
              }
              detalle={
                modo === "proyecto" && (resumen?.totalEventos ?? 0) > 0
                  ? `Este proyecto tiene ${resumen?.totalEventos} eventos en total. El recorte actual no incluye ninguno.`
                  : periodo === "todo"
                    ? modo === "persona"
                      ? "Este agente aún no tiene actividad registrada."
                      : "No hay movimientos que coincidan con los filtros."
                    : "Amplía el periodo o quita filtros para ver si hay actividad anterior."
              }
              onAccion={
                modo === "proyecto" && (resumen?.totalEventos ?? 0) > 0
                  ? verTodoElHistorial
                  : periodo !== "todo" || filtroAccion || filtroActorId
                    ? verTodoElHistorial
                    : undefined
              }
              etiquetaBoton={
                modo === "proyecto" && (resumen?.totalEventos ?? 0) > 0
                  ? "Ver todo el historial"
                  : periodo !== "todo" || filtroAccion || filtroActorId
                    ? "Ver todo el historial"
                    : undefined
              }
            />
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
      ) : null}
    </div>
  );
}
