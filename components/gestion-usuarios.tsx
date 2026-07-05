"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { NombreRol, Usuario } from "@/lib/types";

type ModoModal = "crear" | "editar" | "ver" | null;

interface FormularioUsuario {
  correo: string;
  contrasena: string;
  nombreCompleto: string;
  roles: NombreRol[];
  estaActivo: boolean;
}

const FORM_VACIO: FormularioUsuario = {
  correo: "",
  contrasena: "",
  nombreCompleto: "",
  roles: ["VISUALIZADOR"],
  estaActivo: true,
};

const ROLES_DISPONIBLES: NombreRol[] = [
  "ADMINISTRADOR",
  "COORDINADOR",
  "TECNICO",
  "VISUALIZADOR",
];

function etiquetaRol(rol: string): string {
  return rol.charAt(0) + rol.slice(1).toLowerCase();
}

export function GestionUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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

  const cargar = useCallback(async () => {
    if (!token) return;
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
  }, [token, pagina, busqueda]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!token) return;
    listarRoles(token).catch(() => {});
  }, [token]);

  function abrirCrear() {
    setFormulario(FORM_VACIO);
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
        roles: usuario.roles.map((r) => r.nombre as NombreRol),
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

  function toggleRol(rol: NombreRol) {
    setFormulario((prev) => {
      const tiene = prev.roles.includes(rol);
      const roles = tiene
        ? prev.roles.filter((r) => r !== rol)
        : [...prev.roles, rol];
      return { ...prev, roles: roles.length ? roles : prev.roles };
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
          roles: formulario.roles,
        });
        setExito("Usuario creado correctamente");
      } else if (modo === "editar" && usuarioSeleccionado) {
        await actualizarUsuario(token, usuarioSeleccionado.id, {
          correo: formulario.correo,
          contrasena: formulario.contrasena || undefined,
          nombreCompleto: formulario.nombreCompleto,
          roles: formulario.roles,
          estaActivo: formulario.estaActivo,
        });
        setExito("Usuario actualizado correctamente");
      }
      cerrarModal();
      await cargar();
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

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Gestión de usuarios
          </h2>
          <p className="mt-1 text-zinc-600">
            Crear, editar y administrar roles del equipo
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          + Nuevo usuario
        </button>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? (
        <Alerta mensaje={exito} tipo="exito" />
      ) : null}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre o correo..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="w-full max-w-sm rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        {cargando ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-100 bg-emerald-50/50 text-xs uppercase tracking-wide text-emerald-800">
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
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {usuario.nombreCompleto}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{usuario.correo}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles.map((rol) => (
                            <span
                              key={rol.id}
                              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
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
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {usuario.estaActivo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => abrirVer(usuario.id)}
                            className="text-emerald-700 hover:underline"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEditar(usuario.id)}
                            className="text-zinc-600 hover:underline"
                          >
                            Editar
                          </button>
                          {usuario.estaActivo ? (
                            <button
                              type="button"
                              onClick={() => setConfirmarEliminar(usuario)}
                              className="text-red-600 hover:underline"
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
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700"
                  >
                    {etiquetaRol(rol.nombre)}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Estado</dt>
              <dd className="font-medium text-zinc-900">
                {usuarioSeleccionado.estaActivo ? "Activo" : "Inactivo"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Creado</dt>
              <dd className="font-medium text-zinc-900">
                {new Date(usuarioSeleccionado.creadoEn).toLocaleString("es-CO")}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={manejarSubmit} className="space-y-4">
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
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
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
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Contraseña {modo === "editar" ? "(dejar vacío para no cambiar)" : ""}
              </label>
              <input
                type="password"
                required={modo === "crear"}
                minLength={6}
                value={formulario.contrasena}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, contrasena: e.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                Roles
              </label>
              <div className="flex flex-wrap gap-2">
                {ROLES_DISPONIBLES.map((rol) => (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => toggleRol(rol)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      formulario.roles.includes(rol)
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {etiquetaRol(rol)}
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
                disabled={enviando}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
          <strong>{confirmarEliminar?.nombreCompleto}</strong>? El usuario no
          podrá iniciar sesión pero sus datos se conservarán.
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
            onClick={manejarEliminar}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {enviando ? "Eliminando..." : "Desactivar"}
          </button>
        </div>
      </Modal>
    </>
  );
}
