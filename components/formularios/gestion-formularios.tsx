"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  asignarProcesosPlantilla,
  asignarUsuariosPlantilla,
  clonarPlantillaFormulario,
  listarPlantillasFormulario,
  listarProyectos,
  listarUsuarios,
  obtenerPlanProyecto,
  publicarPlantillaFormulario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import type { PlantillaFormulario, Proyecto, Usuario } from "@/lib/types";

interface OpcionProceso {
  id: string;
  etiqueta: string;
}

interface GrupoProyecto {
  proyecto: Proyecto;
  procesos: OpcionProceso[];
}

export function GestionFormularios() {
  const { token } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [plantillaAsignando, setPlantillaAsignando] =
    useState<PlantillaFormulario | null>(null);
  const [grupos, setGrupos] = useState<GrupoProyecto[]>([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [procesoIds, setProcesoIds] = useState<string[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);

  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [plantillaViendoUsuarios, setPlantillaViendoUsuarios] =
    useState<PlantillaFormulario | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [datos, respuestaUsuarios] = await Promise.all([
        listarPlantillasFormulario(token),
        listarUsuarios(token, { limite: 100 }),
      ]);
      setPlantillas(datos);
      setTodosUsuarios(respuestaUsuarios.datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar plantillas");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nombreUsuario(id: string) {
    return todosUsuarios.find((u) => u.id === id)?.nombreCompleto ?? id;
  }

  async function manejarPublicar(plantilla: PlantillaFormulario) {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      await publicarPlantillaFormulario(token, plantilla.id);
      setExito("El formulario ya está listo para usarse");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar plantilla");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarClonar(plantilla: PlantillaFormulario) {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      await clonarPlantillaFormulario(token, plantilla.id);
      setExito("Copia creada. Puedes editarla sin afectar el original.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al clonar plantilla");
    } finally {
      setEnviando(false);
    }
  }

  async function abrirAsignar(plantilla: PlantillaFormulario) {
    if (!token) return;
    setPlantillaAsignando(plantilla);
    setProcesoIds(plantilla.procesoIds ?? []);
    setUsuarioIds(plantilla.usuarioIds ?? []);
    setCargandoGrupos(true);
    setError(null);
    try {
      const [respuestaProyectos, respuestaUsuarios] = await Promise.all([
        listarProyectos(token, { limite: 100 }),
        listarUsuarios(token, { limite: 100, estaActivo: true }),
      ]);
      const gruposCargados: GrupoProyecto[] = [];
      for (const proyecto of respuestaProyectos.datos) {
        const plan = await obtenerPlanProyecto(token, proyecto.id);
        const procesos: OpcionProceso[] = [];
        for (const actividad of plan.actividades) {
          for (const sub of actividad.subactividades ?? []) {
            for (const proceso of sub.procesos ?? []) {
              procesos.push({
                id: proceso.id,
                etiqueta: `${actividad.nombre} — ${sub.nombre} — ${proceso.nombre}`,
              });
            }
          }
        }
        if (procesos.length) {
          gruposCargados.push({ proyecto, procesos });
        }
      }
      setGrupos(gruposCargados);
      setUsuarios(respuestaUsuarios.datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyectos");
    } finally {
      setCargandoGrupos(false);
    }
  }

  function alternarProceso(id: string) {
    setProcesoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function alternarUsuarioAsignacion(id: string) {
    setUsuarioIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  }

  async function confirmarAsignacion() {
    if (!token || !plantillaAsignando) return;
    setEnviando(true);
    setError(null);
    try {
      await Promise.all([
        asignarProcesosPlantilla(token, plantillaAsignando.id, procesoIds),
        asignarUsuariosPlantilla(token, plantillaAsignando.id, usuarioIds),
      ]);
      setExito("Listo: ya quedó definido dónde se usa");
      setPlantillaAsignando(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Formularios</h2>
          <p className="mt-1 text-zinc-600">
            Arma las preguntas que los técnicos llenan en campo. Luego las usas
            en las jornadas.
          </p>
        </div>
        <Link
          href="/formularios/nuevo"
          className="inline-flex items-center justify-center rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
        >
          Crear formulario
        </Link>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      {cargando ? (
        <Spinner />
      ) : plantillas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-800">
            Todavía no hay formularios
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Crea el primero: un nombre, las preguntas y cómo se responde cada
            una.
          </p>
          <Link
            href="/formularios/nuevo"
            className="mt-5 inline-flex rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            Crear formulario
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plantillas.map((plantilla) => {
            const nPreguntas = plantilla.campos?.length ?? 0;
            const nProcesos = plantilla.procesoIds?.length ?? 0;
            const nPersonas = plantilla.usuarioIds?.length ?? 0;
            return (
              <article
                key={plantilla.id}
                className="flex flex-col rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plantilla.estaActivo
                        ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {plantilla.estaActivo ? "En uso" : "Borrador"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                    {plantilla.tipoPlantilla === "GRUPAL"
                      ? "Varias personas"
                      : "Una persona"}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {plantilla.nombre}
                </h3>
                {plantilla.descripcion ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                    {plantilla.descripcion}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-zinc-600">
                  {nPreguntas} pregunta{nPreguntas !== 1 ? "s" : ""}
                  {nProcesos > 0
                    ? ` · ${nProcesos} proceso${nProcesos !== 1 ? "s" : ""}`
                    : " · sin proceso"}
                  {nPersonas > 0 ? (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => setPlantillaViendoUsuarios(plantilla)}
                        className="font-medium text-ruralia-teal-text hover:underline"
                      >
                        {nPersonas} persona{nPersonas !== 1 ? "s" : ""}
                      </button>
                    </>
                  ) : null}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <Link
                    href={`/formularios/${plantilla.id}`}
                    className={btnAccionPrimaria}
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => abrirAsignar(plantilla)}
                    className={btnAccionSecundaria}
                  >
                    Dónde se usa
                  </button>
                  {!plantilla.estaActivo ? (
                    <button
                      type="button"
                      onClick={() => manejarPublicar(plantilla)}
                      disabled={enviando}
                      className={btnAccionSecundaria}
                    >
                      Poner en uso
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => manejarClonar(plantilla)}
                    disabled={enviando}
                    className={btnAccionSecundaria}
                  >
                    Duplicar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        titulo="Dónde se usa"
        abierto={plantillaAsignando !== null}
        onCerrar={() => setPlantillaAsignando(null)}
        ancho="lg"
      >
        <div className="space-y-5">
          <p className="text-sm text-zinc-600">
            Elige en qué procesos o a qué personas aparece{" "}
            <strong>{plantillaAsignando?.nombre}</strong>. Si no marcas nada,
            no sale en las jornadas hasta que lo asignes.
          </p>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-800">
              Procesos del plan
            </p>
            {cargandoGrupos ? (
              <Spinner className="py-8" />
            ) : grupos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay proyectos con procesos definidos. Configúralos en Plan del
                proyecto.
              </p>
            ) : (
              <div className="max-h-56 space-y-4 overflow-y-auto">
                {grupos.map((grupo) => (
                  <div key={grupo.proyecto.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {grupo.proyecto.nombre}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {grupo.procesos.map((proceso) => (
                        <button
                          key={proceso.id}
                          type="button"
                          onClick={() => alternarProceso(proceso.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            procesoIds.includes(proceso.id)
                              ? "bg-ruralia-teal text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {proceso.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-800">
              Personas concretas
            </p>
            {cargandoGrupos ? (
              <Spinner className="py-8" />
            ) : usuarios.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay usuarios activos registrados todavía.
              </p>
            ) : (
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {usuarios.map((usuario) => (
                  <button
                    key={usuario.id}
                    type="button"
                    onClick={() => alternarUsuarioAsignacion(usuario.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      usuarioIds.includes(usuario.id)
                        ? "bg-ruralia-teal text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {usuario.nombreCompleto}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPlantillaAsignando(null)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarAsignacion}
              disabled={enviando || cargandoGrupos}
              className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        titulo="Quién lo tiene asignado"
        abierto={plantillaViendoUsuarios !== null}
        onCerrar={() => setPlantillaViendoUsuarios(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Personas con este formulario asignado a mano:{" "}
            <strong>{plantillaViendoUsuarios?.nombre}</strong>.
          </p>
          {plantillaViendoUsuarios &&
          plantillaViendoUsuarios.usuarioIds.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay usuarios asignados directamente a este formulario.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plantillaViendoUsuarios?.usuarioIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-ruralia-teal-soft px-3 py-1 text-xs font-medium text-ruralia-teal-text"
                >
                  {nombreUsuario(id)}
                </span>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setPlantillaViendoUsuarios(null)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
