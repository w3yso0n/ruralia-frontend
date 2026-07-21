"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alerta } from "@/components/ui/modal";
import { ArbolJornadas } from "@/components/proyectos/gestion-proyecto/arbol-jornadas";
import { FormularioJornada } from "@/components/proyectos/gestion-proyecto/formulario-jornada";

import { FormularioEditarJornada } from "@/components/proyectos/gestion-proyecto/formulario-editar-jornada";
import {
  actualizarJornada,
  cancelarJornada,
  crearJornada,
  eliminarJornada,
} from "@/lib/api";
import type { Jornada, PlanProyecto, Proyecto } from "@/lib/types";

interface PanelJornadasProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  plan: PlanProyecto | null;
  jornadas: Jornada[];
  puedeGestionar: boolean;
  onActualizar: () => Promise<void>;
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

  async function manejarCrearJornada(datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    metaId: string;
  }) {
    setEnviando(true);
    setError(null);
    try {
      const jornada = await crearJornada(token, {
        proyectoId,
        fecha: datos.fecha,
        veredaId: datos.veredaId,
        observaciones: datos.observaciones,
        metaId: datos.metaId,
      });
      await onActualizar();
      setJornadaSeleccionadaId(jornada.id);
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
      observaciones?: string;
      metaId: string;
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
    if (!confirm("¿Cancelar esta jornada? Quedará marcada como CANCELADA.")) {
      return;
    }
    setError(null);
    try {
      await cancelarJornada(token, jornadaSeleccionadaId);
      await onActualizar();
      setEditandoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar");
    }
  }

  async function manejarEliminar() {
    if (!jornadaSeleccionadaId) return;
    if (
      !confirm(
        "¿Eliminar permanentemente esta jornada? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await eliminarJornada(token, jornadaSeleccionadaId);
      await onActualizar();
      setJornadaSeleccionadaId(null);
      setEditandoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  function seleccionarJornada(id: string) {
    setJornadaSeleccionadaId(id);
    setEditandoId(null);
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
                      Jornada del{" "}
                      {new Date(jornadaSeleccionada.fecha).toLocaleDateString(
                        "es-CO",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {jornadaSeleccionada.vereda?.nombre ?? "Sin vereda"} ·{" "}
                      {jornadaSeleccionada.tecnicoResponsable?.nombre ?? "—"} ·{" "}
                      <span className="font-medium">
                        {jornadaSeleccionada.estado}
                      </span>
                    </p>
                  </div>
                  {puedeGestionar ? (
                    <div className="flex flex-wrap gap-2">
                      {editandoId !== jornadaSeleccionada.id ? (
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

                {editandoId === jornadaSeleccionada.id && puedeGestionar ? (
                  <FormularioEditarJornada
                    key={jornadaSeleccionada.id}
                    jornada={jornadaSeleccionada}
                    veredas={proyecto.veredas ?? []}
                    actividadesPlan={plan?.actividades ?? []}
                    enviando={enviando}
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
