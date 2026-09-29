"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  SelectorCatalogo,
  type OpcionCatalogo,
} from "@/components/ui/selector-catalogo";
import {
  actualizarAsociacion,
  crearAsociacion,
  eliminarAsociacion,
  listarAsociaciones,
  listarBeneficiarios,
  listarTodasLasPaginas,
  obtenerAsociacion,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SelectorVereda } from "@/components/ui/selector-vereda";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import type { Asociacion, CrearAsociacionPayload, Vereda } from "@/lib/types";

type ModoModal = "crear" | "editar" | "ver" | null;

interface FormularioAsociacion {
  nombre: string;
  nit: string;
  nombreRepresentante: string;
  veredaId: string;
  telefono: string;
  correo: string;
  beneficiarioIds: string[];
}

const FORM_VACIO: FormularioAsociacion = {
  nombre: "",
  nit: "",
  nombreRepresentante: "",
  veredaId: "",
  telefono: "",
  correo: "",
  beneficiarioIds: [],
};

function nombreBeneficiario(b: { nombres: string; apellidos: string }) {
  return `${b.nombres} ${b.apellidos}`.trim();
}

interface GestionAsociacionesProps {
  puedeGestionar: boolean;
}

export function GestionAsociaciones({ puedeGestionar }: GestionAsociacionesProps) {
  const { token } = useAuth();
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [veredaSeleccionada, setVeredaSeleccionada] = useState<Vereda | null>(
    null,
  );
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [modo, setModo] = useState<ModoModal>(null);
  const [seleccionado, setSeleccionado] = useState<Asociacion | null>(null);
  const [formulario, setFormulario] = useState<FormularioAsociacion>(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Asociacion | null>(
    null,
  );

  const [opcionesBeneficiarios, setOpcionesBeneficiarios] = useState<
    OpcionCatalogo[] | null
  >(null);
  const [cargandoBeneficiarios, setCargandoBeneficiarios] = useState(false);

  const limite = 10;

  /** Catálogo de beneficiarios activos para agrupar; se carga una sola vez al abrir el formulario. */
  async function asegurarOpcionesBeneficiarios() {
    if (!token || opcionesBeneficiarios || cargandoBeneficiarios) return;
    setCargandoBeneficiarios(true);
    try {
      const beneficiarios = await listarTodasLasPaginas((pag, lim) =>
        listarBeneficiarios(token, { pagina: pag, limite: lim }),
      );
      setOpcionesBeneficiarios(
        beneficiarios.map((b) => ({
          id: b.id,
          nombre: nombreBeneficiario(b),
          subtitulo: [
            `${b.tipoDocumento} ${b.numeroDocumento}`,
            b.vereda?.nombre,
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar beneficiarios",
      );
    } finally {
      setCargandoBeneficiarios(false);
    }
  }

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarAsociaciones(token, {
        pagina,
        limite,
        busqueda: busqueda || undefined,
      });
      setAsociaciones(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asociaciones",
      );
    } finally {
      setCargando(false);
    }
  }, [token, pagina, busqueda]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirCrear() {
    setFormulario(FORM_VACIO);
    setVeredaSeleccionada(null);
    setSeleccionado(null);
    setModo("crear");
    void asegurarOpcionesBeneficiarios();
  }

  async function abrirVer(id: string) {
    if (!token) return;
    try {
      const item = await obtenerAsociacion(token, id);
      setSeleccionado(item);
      setModo("ver");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  async function abrirEditar(id: string) {
    if (!token) return;
    try {
      const item = await obtenerAsociacion(token, id);
      setSeleccionado(item);
      setVeredaSeleccionada(
        item.vereda
          ? {
              id: item.vereda.id,
              nombre: item.vereda.nombre,
              codigo: "",
            }
          : null,
      );
      setFormulario({
        nombre: item.nombre,
        nit: item.nit,
        nombreRepresentante: item.nombreRepresentante,
        veredaId: item.vereda?.id ?? "",
        telefono: item.telefono ?? "",
        correo: item.correo ?? "",
        beneficiarioIds: (item.beneficiarios ?? []).map((b) => b.id),
      });
      setModo("editar");
      void asegurarOpcionesBeneficiarios();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  function cerrarModal() {
    setModo(null);
    setSeleccionado(null);
    setVeredaSeleccionada(null);
    setFormulario(FORM_VACIO);
  }

  function aPayload(): CrearAsociacionPayload {
    return {
      nombre: formulario.nombre.trim(),
      nit: formulario.nit.trim(),
      nombreRepresentante: formulario.nombreRepresentante.trim(),
      veredaId: formulario.veredaId,
      telefono: formulario.telefono.trim() || undefined,
      correo: formulario.correo.trim() || undefined,
      beneficiarioIds: formulario.beneficiarioIds,
    };
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      if (modo === "crear") {
        await crearAsociacion(token, aPayload());
        setExito("Asociación creada correctamente");
      } else if (modo === "editar" && seleccionado) {
        await actualizarAsociacion(token, seleccionado.id, aPayload());
        setExito("Asociación actualizada correctamente");
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
      await eliminarAsociacion(token, confirmarEliminar.id);
      setExito("Asociación desactivada correctamente");
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          Organizaciones que agrupan beneficiarios y pueden vincularse como
          contraparte de un proyecto.
        </p>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={abrirCrear}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            + Nueva asociación
          </button>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre o NIT..."
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
                  <th className="px-5 py-3 font-semibold">NIT</th>
                  <th className="px-5 py-3 font-semibold">Representante</th>
                  <th className="px-5 py-3 font-semibold">Vereda</th>
                  <th className="px-5 py-3 font-semibold">Beneficiarios</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {asociaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-500">
                      No se encontraron asociaciones
                    </td>
                  </tr>
                ) : (
                  asociaciones.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {a.nombre}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">{a.nit}</td>
                      <td className="px-5 py-3 text-zinc-600">
                        {a.nombreRepresentante}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {a.vereda?.nombre ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-semibold text-ruralia-teal-text">
                          <Users className="h-3.5 w-3.5" />
                          {a.totalBeneficiarios ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.estaActivo
                              ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {a.estaActivo ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void abrirVer(a.id)}
                            className={btnAccionPrimaria}
                          >
                            Ver
                          </button>
                          {puedeGestionar && a.estaActivo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void abrirEditar(a.id)}
                                className={btnAccionSecundaria}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmarEliminar(a)}
                                className={btnAccionPeligro}
                              >
                                Eliminar
                              </button>
                            </>
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
            Página {pagina} de {totalPaginas} ({total} registros)
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
            ? "Nueva asociación"
            : modo === "editar"
              ? "Editar asociación"
              : "Detalle de la asociación"
        }
        abierto={modo !== null}
        onCerrar={cerrarModal}
        ancho="lg"
      >
        {modo === "ver" && seleccionado ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Nombre</dt>
              <dd className="font-medium">{seleccionado.nombre}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">NIT</dt>
              <dd className="font-medium">{seleccionado.nit}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Representante</dt>
              <dd className="font-medium">{seleccionado.nombreRepresentante}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Vereda</dt>
              <dd className="font-medium">{seleccionado.vereda?.nombre ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Teléfono</dt>
              <dd className="font-medium">{seleccionado.telefono ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Correo</dt>
              <dd className="font-medium">{seleccionado.correo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Estado</dt>
              <dd className="font-medium">
                {seleccionado.estaActivo ? "Activa" : "Inactiva"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mb-2 text-zinc-500">
                Beneficiarios ({seleccionado.beneficiarios?.length ?? 0})
              </dt>
              <dd>
                {seleccionado.beneficiarios?.length ? (
                  <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-ruralia-teal-border">
                    {seleccionado.beneficiarios.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="truncate font-medium text-zinc-900">
                          {nombreBeneficiario(b)}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {b.tipoDocumento} {b.numeroDocumento}
                          {b.vereda?.nombre ? ` · ${b.vereda.nombre}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-zinc-500">
                    Esta asociación todavía no agrupa beneficiarios.
                  </p>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={manejarSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nombre de la asociación *
              </label>
              <input
                required
                value={formulario.nombre}
                onChange={(e) =>
                  setFormulario((f) => ({ ...f, nombre: e.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  NIT *
                </label>
                <input
                  required
                  value={formulario.nit}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, nit: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Representante legal *
                </label>
                <input
                  required
                  value={formulario.nombreRepresentante}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      nombreRepresentante: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            {token ? (
              <SelectorVereda
                token={token}
                value={formulario.veredaId}
                veredaInicial={veredaSeleccionada}
                required
                onChange={(veredaId, vereda) => {
                  setFormulario((f) => ({ ...f, veredaId }));
                  setVeredaSeleccionada(vereda ?? null);
                }}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Teléfono
                </label>
                <input
                  value={formulario.telefono}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, telefono: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Correo
                </label>
                <input
                  type="email"
                  value={formulario.correo}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, correo: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
              <p className="text-sm font-medium text-zinc-700">
                Beneficiarios de la asociación
              </p>
              <p className="mb-3 text-xs text-zinc-500">
                Elige beneficiarios ya registrados. Uno puede pertenecer a varias
                asociaciones.
              </p>
              {cargandoBeneficiarios || !opcionesBeneficiarios ? (
                <Spinner className="py-6" />
              ) : (
                <SelectorCatalogo
                  multiple
                  opciones={opcionesBeneficiarios}
                  value={formulario.beneficiarioIds}
                  onChange={(beneficiarioIds) =>
                    setFormulario((f) => ({ ...f, beneficiarioIds }))
                  }
                  placeholder="Buscar por nombre o documento..."
                  mensajeVacio="Sin beneficiarios agrupados todavía."
                />
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
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
          ¿Desactivar la asociación{" "}
          <strong>{confirmarEliminar?.nombre}</strong>? No se podrá vincular a
          nuevos proyectos.
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
