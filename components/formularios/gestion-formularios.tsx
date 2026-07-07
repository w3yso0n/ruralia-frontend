"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  asignarSubactividadesPlantilla,
  clonarPlantillaFormulario,
  listarPlantillasFormulario,
  listarProyectos,
  obtenerPlanProyecto,
  publicarPlantillaFormulario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { PlantillaFormulario, Proyecto } from "@/lib/types";

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

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await listarPlantillasFormulario(token);
      setPlantillas(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar plantillas");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
    setCargandoGrupos(true);
    setError(null);
    try {
      const respuesta = await listarProyectos(token, { limite: 100 });
      const gruposCargados: GrupoProyecto[] = [];
      for (const proyecto of respuesta.datos) {
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

  async function confirmarAsignacion() {
    if (!token || !plantillaAsignando) return;
    setEnviando(true);
    setError(null);
    try {
      await asignarSubactividadesPlantilla(
        token,
        plantillaAsignando.id,
        subactividadIds,
      );
      setExito("Asignación actualizada correctamente");
      setPlantillaAsignando(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar proyectos");
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
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Nueva plantilla
        </Link>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        {cargando ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-emerald-50/50 text-xs uppercase tracking-wide text-emerald-800">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Versión</th>
                  <th className="px-5 py-3 font-semibold">Campos</th>
                  <th className="px-5 py-3 font-semibold">Proyectos asignados</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {plantillas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-zinc-500">
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
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            plantilla.estaActivo
                              ? "bg-emerald-50 text-emerald-700"
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
                            className="text-emerald-700 hover:underline"
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
        titulo="Asignar proyectos"
        abierto={plantillaAsignando !== null}
        onCerrar={() => setPlantillaAsignando(null)}
        ancho="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Selecciona en qué subactividades estará disponible{" "}
            <strong>{plantillaAsignando?.nombre}</strong>. Esto reemplaza la
            asignación actual.
          </p>

          {cargandoGrupos ? (
            <Spinner className="py-8" />
          ) : grupos.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay proyectos con subactividades registradas todavía.
            </p>
          ) : (
            <div className="max-h-96 space-y-4 overflow-y-auto">
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
                            ? "bg-emerald-600 text-white"
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
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Guardar asignación"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
