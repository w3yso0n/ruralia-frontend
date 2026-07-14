"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  actualizarRol,
  crearRol,
  eliminarRol,
  listarPermisos,
  listarRoles,
  obtenerRol,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ModuloPermisos, RolDetalle } from "@/lib/types";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import { etiquetaRol, PERMISOS_CRITICOS_CUANTIVA } from "@/lib/types";
import { usePermisos } from "@/lib/use-permisos";

const ETIQUETAS_MODULO: Record<string, string> = {
  dashboard: "Dashboard",
  usuarios: "Usuarios",
  roles: "Roles",
  proyectos: "Proyectos",
  actividades: "Actividades",
  contrapartes: "Contrapartes",
  jornadas: "Jornadas",
  formularios: "Formularios",
  indicadores: "Indicadores",
  reportes: "Reportes",
  sincronizacion: "Sincronización",
  archivos: "Archivos",
  territorios: "Territorios",
};

function etiquetaModulo(modulo: string): string {
  return ETIQUETAS_MODULO[modulo] ?? modulo;
}

function etiquetaAccion(accion: string): string {
  return accion.replace(/_/g, " ");
}

export function GestionRoles() {
  const { token, refrescarUsuario } = useAuth();
  const { puede } = usePermisos();
  const [roles, setRoles] = useState<RolDetalle[]>([]);
  const [modulos, setModulos] = useState<ModuloPermisos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [editando, setEditando] = useState<RolDetalle | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [permisoIds, setPermisoIds] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<RolDetalle | null>(
    null,
  );

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [listaRoles, listaPermisos] = await Promise.all([
        listarRoles(token),
        listarPermisos(token),
      ]);
      setRoles(listaRoles);
      setModulos(listaPermisos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar roles");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const mapaClaveAId = useMemo(() => {
    const map = new Map<string, string>();
    for (const mod of modulos) {
      for (const p of mod.permisos) {
        map.set(p.clave, p.id);
      }
    }
    return map;
  }, [modulos]);

  const mapaIdAClave = useMemo(() => {
    const map = new Map<string, string>();
    for (const mod of modulos) {
      for (const p of mod.permisos) {
        map.set(p.id, p.clave);
      }
    }
    return map;
  }, [modulos]);

  const todasLasAcciones = useMemo(() => {
    const set = new Set<string>();
    for (const mod of modulos) {
      for (const p of mod.permisos) {
        set.add(p.accion);
      }
    }
    const ordenBase = ["ver", "crear", "editar", "eliminar"];
    const extras = [...set].filter((a) => !ordenBase.includes(a)).sort();
    return [...ordenBase.filter((a) => set.has(a)), ...extras];
  }, [modulos]);

  function abrirCrear() {
    setCreando(true);
    setEditando(null);
    setNombre("");
    setDescripcion("");
    setPermisoIds(new Set());
  }

  async function abrirEditar(id: string) {
    if (!token) return;
    try {
      const rol = await obtenerRol(token, id);
      setEditando(rol);
      setCreando(false);
      setNombre(rol.nombre);
      setDescripcion(rol.descripcion ?? "");
      setPermisoIds(new Set(rol.permisoIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar rol");
    }
  }

  function cerrarEditor() {
    setEditando(null);
    setCreando(false);
    setNombre("");
    setDescripcion("");
    setPermisoIds(new Set());
  }

  const esCuantivaEditando = editando?.nombre === "CUANTIVA";

  function esCritico(clave: string): boolean {
    return esCuantivaEditando && PERMISOS_CRITICOS_CUANTIVA.includes(clave);
  }

  function togglePermiso(id: string) {
    const clave = mapaIdAClave.get(id);
    if (clave && esCritico(clave)) return;
    setPermisoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModulo(modulo: ModuloPermisos, activar: boolean) {
    setPermisoIds((prev) => {
      const next = new Set(prev);
      for (const p of modulo.permisos) {
        if (esCritico(p.clave)) {
          next.add(p.id);
          continue;
        }
        if (activar) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  function moduloCompleto(modulo: ModuloPermisos): boolean {
    return modulo.permisos.every((p) => permisoIds.has(p.id));
  }

  function moduloParcial(modulo: ModuloPermisos): boolean {
    const alguno = modulo.permisos.some((p) => permisoIds.has(p.id));
    return alguno && !moduloCompleto(modulo);
  }

  async function guardar() {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      const ids = [...permisoIds];
      if (creando) {
        await crearRol(token, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          permisoIds: ids,
        });
        setExito("Rol creado correctamente");
      } else if (editando) {
        await actualizarRol(token, editando.id, {
          nombre: esCuantivaEditando ? undefined : nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          permisoIds: ids,
        });
        setExito("Rol actualizado correctamente");
      }
      cerrarEditor();
      await cargar();
      await refrescarUsuario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar rol");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarEliminar() {
    if (!token || !confirmarEliminar) return;
    setEnviando(true);
    setError(null);
    try {
      await eliminarRol(token, confirmarEliminar.id);
      setExito("Rol eliminado");
      setConfirmarEliminar(null);
      await cargar();
      await refrescarUsuario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setEnviando(false);
    }
  }

  // Forzar críticos en matriz admin
  useEffect(() => {
    if (!esCuantivaEditando) return;
    setPermisoIds((prev) => {
      const next = new Set(prev);
      for (const clave of PERMISOS_CRITICOS_CUANTIVA) {
        const id = mapaClaveAId.get(clave);
        if (id) next.add(id);
      }
      return next;
    });
  }, [esCuantivaEditando, mapaClaveAId, editando?.id]);

  if (!puede("roles.ver")) {
    return (
      <Alerta mensaje="No tienes permiso para ver roles y permisos" />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Roles y permisos
          </h2>
          <p className="mt-1 text-zinc-600">
            Define roles personalizados y su acceso por módulo
          </p>
        </div>
        {puede("roles.crear") ? (
          <button
            type="button"
            onClick={abrirCrear}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
          >
            + Nuevo rol
          </button>
        ) : null}
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
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Permisos</th>
                  <th className="px-5 py-3 font-semibold">Usuarios</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {roles.map((rol) => (
                  <tr key={rol.id} className="hover:bg-zinc-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900">
                        {etiquetaRol(rol.nombre)}
                      </p>
                      <p className="text-[11px] text-zinc-400">{rol.nombre}</p>
                      {rol.descripcion ? (
                        <p className="text-xs text-zinc-500">{rol.descripcion}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {rol.conteoPermisos}
                    </td>
                    <td className="px-5 py-3 text-zinc-600">
                      {rol.conteoUsuarios}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                        {rol.esSistema ? "Sistema" : "Personalizado"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {puede("roles.editar") ? (
                          <button
                            type="button"
                            onClick={() => void abrirEditar(rol.id)}
                            className={btnAccionPrimaria}
                          >
                            Editar matriz
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void abrirEditar(rol.id)}
                            className={btnAccionSecundaria}
                          >
                            Ver
                          </button>
                        )}
                        {!rol.esSistema && puede("roles.eliminar") ? (
                          <button
                            type="button"
                            onClick={() => setConfirmarEliminar(rol)}
                            className={btnAccionPeligro}
                          >
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        titulo={creando ? "Nuevo rol" : editando ? `Matriz: ${editando.nombre}` : ""}
        abierto={creando || editando !== null}
        onCerrar={cerrarEditor}
        ancho="xl"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nombre
              </label>
              <input
                required
                disabled={esCuantivaEditando || (!puede("roles.editar") && !creando)}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal disabled:bg-zinc-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Descripción
              </label>
              <input
                disabled={!puede("roles.editar") && !creando}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal disabled:bg-zinc-50"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Módulo</th>
                  <th className="px-3 py-2 font-semibold">Todo</th>
                  {todasLasAcciones.map((accion) => (
                    <th key={accion} className="px-2 py-2 font-semibold capitalize">
                      {etiquetaAccion(accion)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {modulos.map((modulo) => {
                  const porAccion = new Map(
                    modulo.permisos.map((p) => [p.accion, p]),
                  );
                  const completo = moduloCompleto(modulo);
                  const parcial = moduloParcial(modulo);
                  return (
                    <tr key={modulo.modulo}>
                      <td className="px-3 py-2 font-medium text-zinc-800">
                        {etiquetaModulo(modulo.modulo)}
                        {parcial ? (
                          <span className="ml-2 text-[10px] text-amber-600">
                            parcial
                          </span>
                        ) : completo ? (
                          <span className="ml-2 text-[10px] text-ruralia-teal-text">
                            completo
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={completo}
                          disabled={!puede("roles.editar") && !creando}
                          onChange={(e) =>
                            toggleModulo(modulo, e.target.checked)
                          }
                          className="rounded border-zinc-300"
                        />
                      </td>
                      {todasLasAcciones.map((accion) => {
                        const permiso = porAccion.get(accion);
                        if (!permiso) {
                          return (
                            <td key={accion} className="px-2 py-2 text-zinc-300">
                              —
                            </td>
                          );
                        }
                        const critico = esCritico(permiso.clave);
                        return (
                          <td key={accion} className="px-2 py-2">
                            <input
                              type="checkbox"
                              title={permiso.descripcion ?? permiso.clave}
                              checked={permisoIds.has(permiso.id)}
                              disabled={
                                critico ||
                                (!puede("roles.editar") && !creando)
                              }
                              onChange={() => togglePermiso(permiso.id)}
                              className="rounded border-zinc-300 disabled:opacity-60"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {esCuantivaEditando ? (
            <p className="text-xs text-amber-700">
              Los permisos críticos del rol Cuantiva están bloqueados para evitar
              quedarse sin acceso a la gestión de roles.
            </p>
          ) : null}

          {(puede("roles.editar") || creando) && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cerrarEditor}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando || !nombre.trim()}
                onClick={() => void guardar()}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {enviando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        titulo="Eliminar rol"
        abierto={confirmarEliminar !== null}
        onCerrar={() => setConfirmarEliminar(null)}
      >
        <p className="text-sm text-zinc-600">
          ¿Eliminar el rol{" "}
          <strong>{confirmarEliminar?.nombre}</strong>? Solo es posible si no
          tiene usuarios asignados.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmarEliminar(null)}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void manejarEliminar()}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
