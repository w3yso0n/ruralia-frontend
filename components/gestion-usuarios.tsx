"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  listarRoles,
  listarUsuarios,
  obtenerUsuario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import { etiquetaRol, type RolDetalle, type Usuario } from "@/lib/types";
import { usePermisos } from "@/lib/use-permisos";

type ModoModal = "crear" | "editar" | "ver" | null;

interface FormularioUsuario {
  correo: string;
  contrasena: string;
  nombreCompleto: string;
  rolIds: string[];
  estaActivo: boolean;
}

const FORM_VACIO: FormularioUsuario = {
  correo: "",
  contrasena: "",
  nombreCompleto: "",
  rolIds: [],
  estaActivo: true,
};

function MatrizPermisosSoloLectura({ claves }: { claves: string[] }) {
  const porModulo = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const clave of claves) {
      const [modulo, accion] = clave.split(".");
      if (!modulo || !accion) continue;
      const lista = map.get(modulo) ?? [];
      lista.push(accion);
      map.set(modulo, lista);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [claves]);

  if (!porModulo.length) {
    return <p className="text-sm text-zinc-500">Sin permisos efectivos</p>;
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-100 p-3">
      {porModulo.map(([modulo, acciones]) => (
        <div key={modulo} className="text-sm">
          <p className="font-medium capitalize text-zinc-800">{modulo}</p>
          <p className="text-xs text-zinc-500">{acciones.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}

export function GestionUsuarios() {
  const { token, refrescarUsuario } = useAuth();
  const { puede } = usePermisos();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<RolDetalle[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoModal>(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<Usuario | null>(
    null,
  );
  const [formulario, setFormulario] = useState<FormularioUsuario>(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Usuario | null>(
    null,
  );

  const limite = 10;
  const puedeVerUsuarios = puede("usuarios.ver");
  const puedeListarRoles =
    puede("roles.ver") ||
    puede("usuarios.crear") ||
    puede("usuarios.editar");

  const cargar = useCallback(async () => {
    if (!token || !puedeVerUsuarios) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarUsuarios(token, {
        pagina,
        limite,
        busqueda: busqueda || undefined,
      });
      setUsuarios(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuarios");
    } finally {
      setCargando(false);
    }
  }, [token, pagina, busqueda, puedeVerUsuarios]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!token || !puedeListarRoles) return;
    listarRoles(token)
      .then(setRolesDisponibles)
      .catch(() => {});
  }, [token, puedeListarRoles]);
  function abrirCrear() {
    const defaultRol =
      rolesDisponibles.find((r) => r.nombre === "VISUALIZADOR") ??
      rolesDisponibles[0];
    setFormulario({
      ...FORM_VACIO,
      rolIds: defaultRol ? [defaultRol.id] : [],
    });
    setUsuarioSeleccionado(null);
    setModo("crear");
  }

  async function abrirVer(id: string) {
    if (!token) return;
    try {
      const usuario = await obtenerUsuario(token, id);
      setUsuarioSeleccionado(usuario);
      setModo("ver");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuario");
    }
  }

  async function abrirEditar(id: string) {
    if (!token) return;
    try {
      const usuario = await obtenerUsuario(token, id);
      setUsuarioSeleccionado(usuario);
      setFormulario({
        correo: usuario.correo,
        contrasena: "",
        nombreCompleto: usuario.nombreCompleto,
        rolIds: usuario.roles.map((r) => r.id),
        estaActivo: usuario.estaActivo,
      });
      setModo("editar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar usuario");
    }
  }

  function cerrarModal() {
    setModo(null);
    setUsuarioSeleccionado(null);
    setFormulario(FORM_VACIO);
  }

  function toggleRol(rolId: string) {
    setFormulario((prev) => {
      const tiene = prev.rolIds.includes(rolId);
      const rolIds = tiene
        ? prev.rolIds.filter((id) => id !== rolId)
        : [...prev.rolIds, rolId];
      return { ...prev, rolIds: rolIds.length ? rolIds : prev.rolIds };
    });
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setError(null);

    try {
      if (modo === "crear") {
        await crearUsuario(token, {
          correo: formulario.correo,
          contrasena: formulario.contrasena,
          nombreCompleto: formulario.nombreCompleto,
          rolIds: formulario.rolIds,
        });
        setExito("Usuario creado correctamente");
      } else if (modo === "editar" && usuarioSeleccionado) {
        await actualizarUsuario(token, usuarioSeleccionado.id, {
          correo: formulario.correo,
          contrasena: formulario.contrasena || undefined,
          nombreCompleto: formulario.nombreCompleto,
          rolIds: formulario.rolIds,
          estaActivo: formulario.estaActivo,
        });
        setExito("Usuario actualizado correctamente");
      }
      cerrarModal();
      await cargar();
      await refrescarUsuario();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarEliminar() {
    if (!confirmarEliminar || !token) return;
    setEnviando(true);
    setError(null);
    try {
      await eliminarUsuario(token, confirmarEliminar.id);
      setExito("Usuario desactivado correctamente");
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setEnviando(false);
    }
  }

  const totalPaginas = Math.ceil(total / limite) || 1;

  if (!puedeVerUsuarios) {
    return <Alerta mensaje="No tienes permiso para acceder a esta sección" />;
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Gestión de usuarios
          </h2>
          <p className="mt-1 text-zinc-600">
            Crear, editar y asignar roles del equipo. La matriz de permisos está
            en Roles y permisos.
          </p>
        </div>
        {puede("usuarios.crear") ? (
          <button
            type="button"
            onClick={abrirCrear}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
          >
            + Nuevo usuario
          </button>
        ) : null}
      </div>

          {error ? <Alerta mensaje={error} /> : null}
          {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

          <div className="mb-4">
            <input
              type="search"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPagina(1);
              }}
              className="w-full max-w-sm rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white shadow-sm">
            {cargando ? (
              <Spinner />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-ruralia-teal-soft/50 text-xs uppercase tracking-wide text-ruralia-teal-text">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Nombre</th>
                      <th className="px-5 py-3 font-semibold">Correo</th>
                      <th className="px-5 py-3 font-semibold">Roles</th>
                      <th className="px-5 py-3 font-semibold">Estado</th>
                      <th className="px-5 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {usuarios.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-8 text-center text-zinc-500"
                        >
                          No se encontraron usuarios
                        </td>
                      </tr>
                    ) : (
                      usuarios.map((usuario) => (
                        <tr key={usuario.id} className="hover:bg-zinc-50/50">
                          <td className="px-5 py-3 font-medium text-zinc-900">
                            {usuario.nombreCompleto}
                          </td>
                          <td className="px-5 py-3 text-zinc-600">
                            {usuario.correo}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {usuario.roles.map((rol) => (
                                <span
                                  key={rol.id}
                                  className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs text-ruralia-teal-text"
                                >
                                  {etiquetaRol(rol.nombre)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                usuario.estaActivo
                                  ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                                  : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              {usuario.estaActivo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => void abrirVer(usuario.id)}
                                className={btnAccionPrimaria}
                              >
                                Ver
                              </button>
                              {puede("usuarios.editar") ? (
                                <button
                                  type="button"
                                  onClick={() => void abrirEditar(usuario.id)}
                                  className={btnAccionSecundaria}
                                >
                                  Editar
                                </button>
                              ) : null}
                              {usuario.estaActivo && puede("usuarios.eliminar") ? (
                                <button
                                  type="button"
                                  onClick={() => setConfirmarEliminar(usuario)}
                                  className={btnAccionPeligro}
                                >
                                  Eliminar
                                </button>
                              ) : null}
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

          {totalPaginas > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
              <span>
                Página {pagina} de {totalPaginas} ({total} usuarios)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}

          <Modal
            titulo={
              modo === "crear"
                ? "Nuevo usuario"
                : modo === "editar"
                  ? "Editar usuario"
                  : "Detalle del usuario"
            }
            abierto={modo !== null}
            onCerrar={cerrarModal}
            ancho={modo === "ver" ? "lg" : "md"}
          >
            {modo === "ver" && usuarioSeleccionado ? (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-zinc-500">Nombre completo</dt>
                  <dd className="font-medium text-zinc-900">
                    {usuarioSeleccionado.nombreCompleto}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Correo</dt>
                  <dd className="font-medium text-zinc-900">
                    {usuarioSeleccionado.correo}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Roles</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    {usuarioSeleccionado.roles.map((rol) => (
                      <span
                        key={rol.id}
                        className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-ruralia-teal-text"
                      >
                        {etiquetaRol(rol.nombre)}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-zinc-500">Acceso efectivo</dt>
                  <dd>
                    <MatrizPermisosSoloLectura
                      claves={usuarioSeleccionado.permisos ?? []}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Estado</dt>
                  <dd className="font-medium text-zinc-900">
                    {usuarioSeleccionado.estaActivo ? "Activo" : "Inactivo"}
                  </dd>
                </div>
              </dl>
            ) : (
              <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Nombre completo
                  </label>
                  <input
                    required
                    value={formulario.nombreCompleto}
                    onChange={(e) =>
                      setFormulario((f) => ({
                        ...f,
                        nombreCompleto: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Correo electrónico
                  </label>
                  <input
                    required
                    type="email"
                    value={formulario.correo}
                    onChange={(e) =>
                      setFormulario((f) => ({ ...f, correo: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Contraseña{" "}
                    {modo === "editar" ? "(dejar vacío para no cambiar)" : ""}
                  </label>
                  <input
                    type="password"
                    required={modo === "crear"}
                    minLength={6}
                    value={formulario.contrasena}
                    onChange={(e) =>
                      setFormulario((f) => ({
                        ...f,
                        contrasena: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rolesDisponibles.map((rol) => (
                      <button
                        key={rol.id}
                        type="button"
                        onClick={() => toggleRol(rol.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          formulario.rolIds.includes(rol.id)
                            ? "bg-ruralia-teal text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {etiquetaRol(rol.nombre)}
                      </button>
                    ))}
                  </div>
                </div>
                {modo === "editar" ? (
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={formulario.estaActivo}
                      onChange={(e) =>
                        setFormulario((f) => ({
                          ...f,
                          estaActivo: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-300"
                    />
                    Usuario activo
                  </label>
                ) : null}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando || formulario.rolIds.length === 0}
                    className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {enviando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </Modal>

          <Modal
            titulo="Confirmar eliminación"
            abierto={confirmarEliminar !== null}
            onCerrar={() => setConfirmarEliminar(null)}
          >
            <p className="text-sm text-zinc-600">
              ¿Desactivar a{" "}
              <strong>{confirmarEliminar?.nombreCompleto}</strong>? El usuario
              no podrá iniciar sesión pero sus datos se conservarán.
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
                {enviando ? "Eliminando..." : "Desactivar"}
              </button>
            </div>
          </Modal>
    </>
  );
}
