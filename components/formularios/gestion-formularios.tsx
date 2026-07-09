"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  asignarSubactividadesPlantilla,
  asignarUsuariosPlantilla,
  clonarPlantillaFormulario,
  listarPlantillasFormulario,
  listarProyectos,
  listarUsuarios,
  obtenerPlanProyecto,
  publicarPlantillaFormulario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PlantillaFormulario, Proyecto, Usuario } from "@/lib/types";

interface OpcionSubactividad {
  id: string;
  etiqueta: string;
}

interface GrupoProyecto {
  proyecto: Proyecto;
  subactividades: OpcionSubactividad[];
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
  const [subactividadIds, setSubactividadIds] = useState<string[]>([]);

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
      setExito("Plantilla publicada correctamente");
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
      setExito("Plantilla clonada correctamente (sin proyectos asignados)");
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
    setSubactividadIds(plantilla.subactividadIds ?? []);
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
        const subactividades: OpcionSubactividad[] = [];
        for (const actividad of plan.actividades) {
          for (const sub of actividad.subactividades ?? []) {
            subactividades.push({
              id: sub.id,
              etiqueta: `${actividad.nombre} — ${sub.nombre}`,
            });
          }
        }
        if (subactividades.length) {
          gruposCargados.push({ proyecto, subactividades });
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

  function alternarSubactividad(id: string) {
    setSubactividadIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
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
        asignarSubactividadesPlantilla(
          token,
          plantillaAsignando.id,
          subactividadIds,
        ),
        asignarUsuariosPlantilla(token, plantillaAsignando.id, usuarioIds),
      ]);
      setExito("Asignación actualizada correctamente");
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
          <h2 className="text-2xl font-semibold text-zinc-900">
            Formularios dinámicos
          </h2>
          <p className="mt-1 text-zinc-600">
            Diseñar plantillas de formulario reutilizables para captura en campo
          </p>
        </div>
        <Link
          href="/formularios/nuevo"
          className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
        >
          + Nueva plantilla
        </Link>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <div className="overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white shadow-sm">
        {cargando ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-ruralia-teal-soft/50 text-xs uppercase tracking-wide text-ruralia-teal-text">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Versión</th>
                  <th className="px-5 py-3 font-semibold">Campos</th>
                  <th className="px-5 py-3 font-semibold">Proyectos asignados</th>
                  <th className="px-5 py-3 font-semibold">Usuarios asignados</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {plantillas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-500">
                      No hay plantillas de formulario creadas
                    </td>
                  </tr>
                ) : (
                  plantillas.map((plantilla) => (
                    <tr key={plantilla.id} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-zinc-900">
                          {plantilla.nombre}
                        </p>
                        {plantilla.descripcion ? (
                          <p className="text-xs text-zinc-500">
                            {plantilla.descripcion}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        v{plantilla.version}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {plantilla.campos?.length ?? 0}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {plantilla.subactividadIds.length > 0 ? (
                          <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs text-ruralia-teal-text">
                            {plantilla.subactividadIds.length} subactividad
                            {plantilla.subactividadIds.length !== 1 ? "es" : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setPlantillaViendoUsuarios(plantilla)}
                          className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                            plantilla.usuarioIds.length > 0
                              ? "bg-ruralia-teal-soft text-ruralia-teal-text hover:bg-ruralia-teal-border"
                              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                          }`}
                        >
                          {plantilla.usuarioIds.length > 0
                            ? `${plantilla.usuarioIds.length} usuario${
                                plantilla.usuarioIds.length !== 1 ? "s" : ""
                              }`
                            : "Sin asignar"}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            plantilla.estaActivo
                              ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {plantilla.estaActivo ? "Publicada" : "Borrador"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3">
                          <Link
                            href={`/formularios/${plantilla.id}`}
                            className="text-ruralia-teal-text hover:underline"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => abrirAsignar(plantilla)}
                            className="text-zinc-600 hover:underline"
                          >
                            Asignar
                          </button>
                          {!plantilla.estaActivo ? (
                            <button
                              type="button"
                              onClick={() => manejarPublicar(plantilla)}
                              disabled={enviando}
                              className="text-zinc-600 hover:underline disabled:opacity-50"
                            >
                              Publicar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => manejarClonar(plantilla)}
                            disabled={enviando}
                            className="text-zinc-600 hover:underline disabled:opacity-50"
                          >
                            Clonar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        titulo="Asignar plantilla"
        abierto={plantillaAsignando !== null}
        onCerrar={() => setPlantillaAsignando(null)}
        ancho="lg"
      >
        <div className="space-y-5">
          <p className="text-sm text-zinc-600">
            Define dónde estará disponible{" "}
            <strong>{plantillaAsignando?.nombre}</strong>. Ambas secciones
            reemplazan la asignación actual y son independientes entre sí.
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Por proyecto / subactividad
            </p>
            {cargandoGrupos ? (
              <Spinner className="py-8" />
            ) : grupos.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay proyectos con subactividades registradas todavía.
              </p>
            ) : (
              <div className="max-h-56 space-y-4 overflow-y-auto">
                {grupos.map((grupo) => (
                  <div key={grupo.proyecto.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {grupo.proyecto.nombre}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {grupo.subactividades.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => alternarSubactividad(sub.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            subactividadIds.includes(sub.id)
                              ? "bg-ruralia-teal text-white"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          }`}
                        >
                          {sub.etiqueta}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Directamente a usuarios
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
              {enviando ? "Guardando..." : "Guardar asignación"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        titulo="Usuarios asignados"
        abierto={plantillaViendoUsuarios !== null}
        onCerrar={() => setPlantillaViendoUsuarios(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Usuarios con acceso directo a{" "}
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
