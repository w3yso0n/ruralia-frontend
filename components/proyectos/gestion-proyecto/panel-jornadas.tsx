"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alerta } from "@/components/ui/modal";
import { ArbolJornadas } from "@/components/proyectos/gestion-proyecto/arbol-jornadas";
import { ControlAsistenciaJornada } from "@/components/proyectos/gestion-proyecto/control-asistencia-jornada";
import { FormularioJornada } from "@/components/proyectos/gestion-proyecto/formulario-jornada";
import { FormularioEditarJornada } from "@/components/proyectos/gestion-proyecto/formulario-editar-jornada";
import { ResultadosJornada } from "@/components/proyectos/gestion-proyecto/resultados-jornada";
import {
  actualizarJornada,
  cancelarJornada,
  crearJornada,
  eliminarJornada,
  ErrorApi,
} from "@/lib/api";
import {
  confirmarEliminacionForzada,
  confirmarEliminacionSimple,
  mostrarErrorApi,
} from "@/lib/swal";
import type { Jornada, PlanProyecto, Proyecto, TipoJornada } from "@/lib/types";

interface PanelJornadasProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  plan: PlanProyecto | null;
  jornadas: Jornada[];
  puedeGestionar: boolean;
  onActualizar: () => Promise<void>;
}

function jornadasDelGrupo(
  jornadas: Jornada[],
  jornada: Jornada | undefined,
): Jornada[] {
  if (!jornada?.grupoJornadaId) {
    return jornada ? [jornada] : [];
  }
  return jornadas.filter((j) => j.grupoJornadaId === jornada.grupoJornadaId);
}

function sumarEjecutadoMetaLocal(jornadas: Jornada[], metaId: string): number {
  return jornadas
    .filter(
      (j) =>
        j.meta?.id === metaId &&
        j.estado !== "CANCELADA" &&
        j.estadoFuncional === "APROBADO",
    )
    .reduce((acc, j) => {
      if (j.cantidadEjecutada != null) {
        return acc + Number(j.cantidadEjecutada);
      }
      if (j.estado === "COMPLETADA") return acc + 1;
      return acc;
    }, 0);
}

export function PanelJornadas({
  token,
  proyectoId,
  proyecto,
  plan,
  jornadas,
  puedeGestionar,
  onActualizar,
}: PanelJornadasProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jornadaIdQuery = searchParams.get("jornadaId");

  const [jornadaSeleccionadaId, setJornadaSeleccionadaId] = useState<
    string | null
  >(jornadaIdQuery ?? jornadas[0]?.id ?? null);
  const [mostrarFormulario, setMostrarFormulario] = useState(
    jornadas.length === 0 && puedeGestionar && !jornadaIdQuery,
  );
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jornadaIdQuery && jornadas.some((j) => j.id === jornadaIdQuery)) {
      setJornadaSeleccionadaId(jornadaIdQuery);
      setMostrarFormulario(false);
    }
  }, [jornadaIdQuery, jornadas]);

  const jornadaSeleccionada = jornadas.find(
    (j) => j.id === jornadaSeleccionadaId,
  );

  const grupoActivo = useMemo(
    () => jornadasDelGrupo(jornadas, jornadaSeleccionada),
    [jornadas, jornadaSeleccionada],
  );

  const ejecutadoMeta =
    jornadaSeleccionada?.meta?.ejecutadoTotal != null
      ? Number(jornadaSeleccionada.meta.ejecutadoTotal)
      : jornadaSeleccionada?.meta?.id
        ? sumarEjecutadoMetaLocal(jornadas, jornadaSeleccionada.meta.id)
        : null;

  const agentes = useMemo(
    () =>
      (proyecto.personal ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombreCompleto,
      })),
    [proyecto.personal],
  );

  async function manejarCrearJornada(datos: {
    fecha: string;
    veredaId: string;
    nombre?: string;
    observaciones?: string;
    metaId: string;
    tipo: TipoJornada;
    tecnicoResponsableIds: string[];
    requiereRevision: boolean;
  }) {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await crearJornada(token, {
        proyectoId,
        fecha: datos.fecha,
        veredaId: datos.veredaId,
        nombre: datos.nombre,
        observaciones: datos.observaciones,
        metaId: datos.metaId,
        tipo: datos.tipo,
        tecnicoResponsableIds: datos.tecnicoResponsableIds,
        requiereRevision: datos.requiereRevision,
      });
      const primera = resultado.jornadas[0];
      await onActualizar();
      if (primera) {
        setJornadaSeleccionadaId(primera.id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "jornadas");
        params.set("jornadaId", primera.id);
        router.replace(`/proyectos/${proyectoId}?${params.toString()}`, {
          scroll: false,
        });
      }
      setMostrarFormulario(false);
      setEditandoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear jornada");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarEditarJornada(
    jornadaId: string,
    datos: {
      fecha: string;
      veredaId: string;
      nombre?: string;
      observaciones?: string;
      metaId: string;
      tipo: TipoJornada;
    },
  ) {
    setEnviando(true);
    setError(null);
    try {
      await actualizarJornada(token, jornadaId, datos);
      await onActualizar();
      setEditandoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al editar jornada");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarCancelar() {
    if (!jornadaSeleccionadaId) return;
    const n = grupoActivo.length;
    const confirmado = await confirmarEliminacionSimple({
      titulo: "Cancelar jornada",
      texto:
        n > 1
          ? `¿Cancelar esta jornada para los ${n} agentes del grupo? Todas quedarán marcadas como CANCELADA.`
          : "¿Cancelar esta jornada? Quedará marcada como CANCELADA.",
      textoConfirmar: "Sí, cancelar",
    });
    if (!confirmado) return;
    setError(null);
    try {
      await cancelarJornada(token, jornadaSeleccionadaId);
      await onActualizar();
      setEditandoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar");
    }
  }

  async function finalizarEliminacion() {
    if (!jornadaSeleccionadaId) return;
    await onActualizar();
    setJornadaSeleccionadaId(null);
    setEditandoId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "jornadas");
    params.delete("jornadaId");
    router.replace(`/proyectos/${proyectoId}?${params.toString()}`, {
      scroll: false,
    });
  }

  async function manejarEliminar() {
    if (!jornadaSeleccionadaId) return;
    const n = grupoActivo.length;
    const confirmado = await confirmarEliminacionSimple({
      titulo: "Eliminar jornada",
      texto:
        n > 1
          ? `¿Eliminar permanentemente las ${n} jornadas del grupo? Esta acción no se puede deshacer.`
          : "¿Eliminar permanentemente esta jornada? Esta acción no se puede deshacer.",
    });
    if (!confirmado) return;

    setError(null);
    try {
      await eliminarJornada(token, jornadaSeleccionadaId);
      await finalizarEliminacion();
      return;
    } catch (err) {
      if (!(err instanceof ErrorApi) || err.statusCode !== 400) {
        setError(err instanceof Error ? err.message : "Error al eliminar");
        return;
      }

      const forzar = await confirmarEliminacionForzada({
        titulo: "No se puede eliminar",
        mensajeBloqueo: err.message,
      });
      if (!forzar) return;

      try {
        await eliminarJornada(token, jornadaSeleccionadaId, true);
        await finalizarEliminacion();
      } catch (err2) {
        const mensaje =
          err2 instanceof Error ? err2.message : "Error al eliminar";
        await mostrarErrorApi(mensaje);
      }
    }
  }

  function seleccionarJornada(id: string) {
    setJornadaSeleccionadaId(id);
    setEditandoId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "jornadas");
    params.set("jornadaId", id);
    router.replace(`/proyectos/${proyectoId}?${params.toString()}`, {
      scroll: false,
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          Registra visitas de campo contra una meta del plan. Configura primero
          subactividades, procesos y metas en la pestaña{" "}
          <strong>Plan del proyecto</strong>.
        </p>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={() => {
              setMostrarFormulario((v) => !v);
              setEditandoId(null);
            }}
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            {mostrarFormulario ? "Ver jornadas" : "+ Nueva jornada"}
          </button>
        ) : null}
      </div>

      {mostrarFormulario && puedeGestionar ? (
        <section className="rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-6">
          <h3 className="mb-4 font-semibold text-zinc-900">Nueva jornada</h3>
          <FormularioJornada
            veredas={proyecto.veredas ?? []}
            actividadesPlan={plan?.actividades ?? []}
            agentes={agentes}
            fechaInicioProyecto={proyecto.fechaInicio}
            fechaFinProyecto={proyecto.fechaFin}
            enviando={enviando}
            onSubmit={manejarCrearJornada}
          />
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
            <h3 className="mb-3 font-semibold text-zinc-900">Jornadas</h3>
            <ArbolJornadas
              jornadas={jornadas}
              jornadaSeleccionadaId={jornadaSeleccionadaId}
              onSeleccionarJornada={seleccionarJornada}
            />
          </aside>

          <section className="rounded-2xl border border-ruralia-teal-border bg-white p-6">
            {!jornadaSeleccionada ? (
              <p className="text-zinc-500">
                Selecciona una jornada del árbol o crea una nueva.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {jornadaSeleccionada.nombre?.trim()
                        ? jornadaSeleccionada.nombre
                        : `Jornada del ${new Date(
                            jornadaSeleccionada.fecha,
                          ).toLocaleDateString("es-CO", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}`}
                    </h3>
                    {jornadaSeleccionada.nombre?.trim() ? (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {new Date(jornadaSeleccionada.fecha).toLocaleDateString(
                          "es-CO",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sm text-zinc-500">
                      {jornadaSeleccionada.vereda?.nombre ?? "Sin vereda"} ·{" "}
                      {jornadaSeleccionada.tecnicoResponsable?.nombre ?? "—"} ·{" "}
                      <span className="font-medium">
                        {jornadaSeleccionada.estado}
                      </span>
                      {jornadaSeleccionada.tipo === "GRUPAL" ? (
                        <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Grupal · asistencia
                        </span>
                      ) : null}
                      {jornadaSeleccionada.requiereRevision !== false ? (
                        <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Requiere revisión
                        </span>
                      ) : (
                        <span className="ml-2 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-medium text-ruralia-teal-text">
                          Sin revisión
                        </span>
                      )}
                      {grupoActivo.length > 1 ? (
                        <span className="ml-2 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-medium text-ruralia-teal-text">
                          {grupoActivo.length} agentes
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {puedeGestionar ? (
                    <div className="flex flex-wrap gap-2">
                      {editandoId !== jornadaSeleccionada.id &&
                      jornadaSeleccionada.estadoFuncional !== "EN_REVISION" &&
                      jornadaSeleccionada.estadoFuncional !== "APROBADO" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEditandoId(jornadaSeleccionada.id)
                          }
                          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Editar
                        </button>
                      ) : null}
                      {jornadaSeleccionada.estadoFuncional === "EN_REVISION" ||
                      jornadaSeleccionada.estadoFuncional === "APROBADO" ? (
                        <span className="self-center text-xs text-zinc-500">
                          {jornadaSeleccionada.estadoFuncional === "APROBADO"
                            ? "Completada: sin edición"
                            : "En revisión: sin edición"}
                        </span>
                      ) : null}
                      {jornadaSeleccionada.estado !== "CANCELADA" ? (
                        <button
                          type="button"
                          onClick={() => void manejarCancelar()}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-600 hover:text-white"
                        >
                          Cancelar jornada
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void manejarEliminar()}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>

                {grupoActivo.length > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {grupoActivo.map((hermana) => {
                      const activa = hermana.id === jornadaSeleccionada.id;
                      return (
                        <button
                          key={hermana.id}
                          type="button"
                          onClick={() => seleccionarJornada(hermana.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            activa
                              ? "border-ruralia-teal bg-ruralia-teal text-white"
                              : "border-zinc-200 bg-white text-zinc-700 hover:border-ruralia-teal-border"
                          }`}
                        >
                          {hermana.tecnicoResponsable?.nombre ?? "Agente"}
                          <span
                            className={`ml-1.5 font-normal ${
                              activa ? "text-white/80" : "text-zinc-400"
                            }`}
                          >
                            {hermana.estado.replace(/_/g, " ")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {editandoId === jornadaSeleccionada.id &&
                puedeGestionar &&
                jornadaSeleccionada.estadoFuncional !== "EN_REVISION" &&
                jornadaSeleccionada.estadoFuncional !== "APROBADO" ? (
                  <FormularioEditarJornada
                    key={jornadaSeleccionada.id}
                    jornada={jornadaSeleccionada}
                    veredas={proyecto.veredas ?? []}
                    actividadesPlan={plan?.actividades ?? []}
                    fechaInicioProyecto={proyecto.fechaInicio}
                    fechaFinProyecto={proyecto.fechaFin}
                    enviando={enviando}
                    tamanoGrupo={grupoActivo.length}
                    onSubmit={(datos) =>
                      manejarEditarJornada(jornadaSeleccionada.id, datos)
                    }
                    onCancelar={() => setEditandoId(null)}
                  />
                ) : (
                  <>
                    {jornadaSeleccionada.observaciones ? (
                      <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
                        {jornadaSeleccionada.observaciones}
                      </p>
                    ) : null}

                    {jornadaSeleccionada.meta ? (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                          Meta del plan
                        </h4>
                        <div className="rounded-xl border border-zinc-100 px-4 py-3 text-sm">
                          {jornadaSeleccionada.meta.actividadNombre ? (
                            <p className="text-xs text-zinc-400">
                              {jornadaSeleccionada.meta.actividadNombre}
                              {jornadaSeleccionada.meta.subactividadNombre
                                ? ` › ${jornadaSeleccionada.meta.subactividadNombre}`
                                : ""}
                              {jornadaSeleccionada.meta.procesoNombre
                                ? ` › ${jornadaSeleccionada.meta.procesoNombre}`
                                : ""}
                            </p>
                          ) : null}
                          <p className="font-medium text-zinc-900">
                            {jornadaSeleccionada.meta.nombre}
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              ({jornadaSeleccionada.meta.unidadMedida})
                            </span>
                          </p>
                          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-zinc-100 pt-3">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                Unidades en esta jornada
                              </p>
                              <p className="mt-0.5 text-base font-semibold text-ruralia-teal-text">
                                {jornadaSeleccionada.cantidadEjecutada != null
                                  ? `${Number(jornadaSeleccionada.cantidadEjecutada)} ${jornadaSeleccionada.meta.unidadMedida}`
                                  : "Sin registrar"}
                              </p>
                            </div>
                            {ejecutadoMeta != null &&
                            jornadaSeleccionada.meta.cantidadTotal != null ? (
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                                  Acumulado del plan
                                </p>
                                <p className="mt-0.5 text-sm font-medium text-zinc-700">
                                  {ejecutadoMeta} /{" "}
                                  {Number(
                                    jornadaSeleccionada.meta.cantidadTotal,
                                  )}{" "}
                                  {jornadaSeleccionada.meta.unidadMedida}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : jornadaSeleccionada.actividades?.length ? (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                          Actividades (legacy)
                        </h4>
                        <ul className="space-y-2">
                          {jornadaSeleccionada.actividades.map((ja) => (
                            <li
                              key={ja.id}
                              className="flex items-center justify-between rounded-xl border border-zinc-100 px-4 py-3 text-sm"
                            >
                              <div>
                                <p className="font-medium text-zinc-900">
                                  {ja.actividad.nombre}
                                </p>
                                {ja.subactividad ? (
                                  <p className="text-xs text-zinc-500">
                                    Subactividad: {ja.subactividad.nombre}
                                  </p>
                                ) : null}
                              </div>
                              <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs text-ruralia-teal-text">
                                {ja.estadoEjecucion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-medium text-amber-900">
                          Esta jornada no tiene meta vinculada
                        </p>
                        <p className="mt-1 text-xs text-amber-800">
                          Sin meta no se pueden mostrar formularios en el
                          celular. Usa <strong>Editar</strong> para vincular la
                          meta del plan.
                        </p>
                      </div>
                    )}

                    {jornadaSeleccionada.tipo === "GRUPAL" ? (
                      <ControlAsistenciaJornada
                        token={token}
                        jornada={jornadaSeleccionada}
                        puedeEditar={puedeGestionar}
                        onCambio={() => void onActualizar()}
                      />
                    ) : (
                      <ResultadosJornada
                        token={token}
                        jornada={jornadaSeleccionada}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
