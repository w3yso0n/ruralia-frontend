"use client";

import { useState } from "react";
import { Alerta } from "@/components/ui/modal";
import { ArbolJornadas } from "@/components/proyectos/gestion-proyecto/arbol-jornadas";
import { FormularioJornada } from "@/components/proyectos/gestion-proyecto/formulario-jornada";
import {
  cancelarJornada,
  crearActividad,
  crearJornada,
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
  const [jornadaSeleccionadaId, setJornadaSeleccionadaId] = useState<
    string | null
  >(jornadas[0]?.id ?? null);
  const [mostrarFormulario, setMostrarFormulario] = useState(
    jornadas.length === 0 && puedeGestionar,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jornadaSeleccionada = jornadas.find(
    (j) => j.id === jornadaSeleccionadaId,
  );

  async function manejarCrearActividadPlan(nombre: string) {
    try {
      const creada = await crearActividad(token, proyectoId, { nombre });
      await onActualizar();
      return creada.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear actividad");
      return null;
    }
  }

  async function manejarCrearJornada(datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    actividades: { actividadId: string; subactividadId?: string }[];
  }) {
    setEnviando(true);
    setError(null);
    try {
      const jornada = await crearJornada(token, {
        proyectoId,
        fecha: datos.fecha,
        veredaId: datos.veredaId,
        observaciones: datos.observaciones,
        actividades: datos.actividades,
      });
      await onActualizar();
      setJornadaSeleccionadaId(jornada.id);
      setMostrarFormulario(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear jornada");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarCancelar() {
    if (!jornadaSeleccionadaId) return;
    if (!confirm("¿Cancelar esta jornada?")) return;
    try {
      await cancelarJornada(token, jornadaSeleccionadaId);
      await onActualizar();
      setJornadaSeleccionadaId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar");
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          Organiza el trabajo por <strong>jornadas</strong>; dentro de cada una
          defines qué actividades se ejecutan en campo.
        </p>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={() => setMostrarFormulario((v) => !v)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {mostrarFormulario ? "Ver jornadas" : "+ Nueva jornada"}
          </button>
        ) : null}
      </div>

      {mostrarFormulario && puedeGestionar ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6">
          <h3 className="mb-4 font-semibold text-zinc-900">Nueva jornada</h3>
          <FormularioJornada
            veredas={proyecto.veredas ?? []}
            actividadesPlan={plan?.actividades ?? []}
            enviando={enviando}
            onCrearActividadPlan={manejarCrearActividadPlan}
            onSubmit={manejarCrearJornada}
          />
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl border border-emerald-100 bg-white p-4">
            <h3 className="mb-3 font-semibold text-zinc-900">Jornadas</h3>
            <ArbolJornadas
              jornadas={jornadas}
              jornadaSeleccionadaId={jornadaSeleccionadaId}
              onSeleccionarJornada={setJornadaSeleccionadaId}
            />
          </aside>

          <section className="rounded-2xl border border-emerald-100 bg-white p-6">
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
                        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {jornadaSeleccionada.vereda?.nombre ?? "—"} ·{" "}
                      {jornadaSeleccionada.tecnicoResponsable?.nombre ?? "—"} ·{" "}
                      <span className="font-medium">
                        {jornadaSeleccionada.estado}
                      </span>
                    </p>
                  </div>
                  {puedeGestionar &&
                  jornadaSeleccionada.estado !== "CANCELADA" ? (
                    <button
                      type="button"
                      onClick={() => void manejarCancelar()}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Cancelar jornada
                    </button>
                  ) : null}
                </div>

                {jornadaSeleccionada.observaciones ? (
                  <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
                    {jornadaSeleccionada.observaciones}
                  </p>
                ) : null}

                <h4 className="mb-2 mt-6 text-sm font-semibold text-zinc-800">
                  Actividades de esta jornada
                </h4>
                {!jornadaSeleccionada.actividades?.length ? (
                  <p className="text-sm text-zinc-500">
                    Sin actividades vinculadas
                  </p>
                ) : (
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
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          {ja.estadoEjecucion}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
