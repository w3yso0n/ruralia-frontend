"use client";

import { useCallback, useEffect, useState } from "react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  actualizarBeneficiario,
  crearBeneficiario,
  eliminarBeneficiario,
  listarBeneficiarios,
  obtenerBeneficiario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SelectorVereda } from "@/components/ui/selector-vereda";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import type {
  Beneficiario,
  CrearBeneficiarioPayload,
  Genero,
  TipoDocumento,
  Vereda,
} from "@/lib/types";

type ModoModal = "crear" | "editar" | "ver" | null;

interface FormularioBeneficiario {
  nombres: string;
  apellidos: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  veredaId: string;
  telefono: string;
  correo: string;
  genero: Genero | "";
  fechaNacimiento: string;
}

const FORM_VACIO: FormularioBeneficiario = {
  nombres: "",
  apellidos: "",
  tipoDocumento: "CC",
  numeroDocumento: "",
  veredaId: "",
  telefono: "",
  correo: "",
  genero: "",
  fechaNacimiento: "",
};

const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: "CC", etiqueta: "Cédula de ciudadanía" },
  { valor: "CE", etiqueta: "Cédula de extranjería" },
  { valor: "TI", etiqueta: "Tarjeta de identidad" },
  { valor: "PASAPORTE", etiqueta: "Pasaporte" },
];

const GENEROS: { valor: Genero; etiqueta: string }[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "OTRO", etiqueta: "Otro" },
];

interface GestionBeneficiariosProps {
  puedeGestionar: boolean;
}

export function GestionBeneficiarios({ puedeGestionar }: GestionBeneficiariosProps) {
  const { token } = useAuth();
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
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
  const [seleccionado, setSeleccionado] = useState<Beneficiario | null>(null);
  const [formulario, setFormulario] = useState<FormularioBeneficiario>(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Beneficiario | null>(
    null,
  );

  const limite = 10;

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarBeneficiarios(token, {
        pagina,
        limite,
        busqueda: busqueda || undefined,
      });
      setBeneficiarios(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar beneficiarios",
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
  }

  async function abrirVer(id: string) {
    if (!token) return;
    try {
      const item = await obtenerBeneficiario(token, id);
      setSeleccionado(item);
      setModo("ver");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    }
  }

  async function abrirEditar(id: string) {
    if (!token) return;
    try {
      const item = await obtenerBeneficiario(token, id);
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
        nombres: item.nombres,
        apellidos: item.apellidos,
        tipoDocumento: item.tipoDocumento,
        numeroDocumento: item.numeroDocumento,
        veredaId: item.vereda?.id ?? "",
        telefono: item.telefono ?? "",
        correo: item.correo ?? "",
        genero: item.genero ?? "",
        fechaNacimiento: item.fechaNacimiento?.slice(0, 10) ?? "",
      });
      setModo("editar");
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

  function aPayload(): CrearBeneficiarioPayload {
    return {
      nombres: formulario.nombres.trim(),
      apellidos: formulario.apellidos.trim(),
      tipoDocumento: formulario.tipoDocumento,
      numeroDocumento: formulario.numeroDocumento.trim(),
      veredaId: formulario.veredaId,
      telefono: formulario.telefono.trim() || undefined,
      correo: formulario.correo.trim() || undefined,
      genero: formulario.genero || undefined,
      fechaNacimiento: formulario.fechaNacimiento || undefined,
    };
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      if (modo === "crear") {
        await crearBeneficiario(token, aPayload());
        setExito("Beneficiario creado correctamente");
      } else if (modo === "editar" && seleccionado) {
        await actualizarBeneficiario(token, seleccionado.id, aPayload());
        setExito("Beneficiario actualizado correctamente");
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
      await eliminarBeneficiario(token, confirmarEliminar.id);
      setExito("Beneficiario desactivado correctamente");
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
          Personas beneficiarias que pueden vincularse como contraparte de un
          proyecto.
        </p>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={abrirCrear}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            + Nuevo beneficiario
          </button>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre o documento..."
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
                  <th className="px-5 py-3 font-semibold">Documento</th>
                  <th className="px-5 py-3 font-semibold">Vereda</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {beneficiarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-500">
                      No se encontraron beneficiarios
                    </td>
                  </tr>
                ) : (
                  beneficiarios.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-medium text-zinc-900">
                        {b.nombres} {b.apellidos}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {b.tipoDocumento} {b.numeroDocumento}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {b.vereda?.nombre ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.estaActivo
                              ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {b.estaActivo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => void abrirVer(b.id)}
                            className={btnAccionPrimaria}
                          >
                            Ver
                          </button>
                          {puedeGestionar && b.estaActivo ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void abrirEditar(b.id)}
                                className={btnAccionSecundaria}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmarEliminar(b)}
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
            ? "Nuevo beneficiario"
            : modo === "editar"
              ? "Editar beneficiario"
              : "Detalle del beneficiario"
        }
        abierto={modo !== null}
        onCerrar={cerrarModal}
        ancho={modo === "ver" ? "lg" : "md"}
      >
        {modo === "ver" && seleccionado ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Nombres</dt>
              <dd className="font-medium">{seleccionado.nombres}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Apellidos</dt>
              <dd className="font-medium">{seleccionado.apellidos}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Documento</dt>
              <dd className="font-medium">
                {seleccionado.tipoDocumento} {seleccionado.numeroDocumento}
              </dd>
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
              <dt className="text-zinc-500">Género</dt>
              <dd className="font-medium">{seleccionado.genero ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Estado</dt>
              <dd className="font-medium">
                {seleccionado.estaActivo ? "Activo" : "Inactivo"}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={manejarSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Nombres *
                </label>
                <input
                  required
                  value={formulario.nombres}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, nombres: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Apellidos *
                </label>
                <input
                  required
                  value={formulario.apellidos}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, apellidos: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Tipo de documento *
                </label>
                <select
                  required
                  value={formulario.tipoDocumento}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      tipoDocumento: e.target.value as TipoDocumento,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                >
                  {TIPOS_DOCUMENTO.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Número de documento *
                </label>
                <input
                  required
                  value={formulario.numeroDocumento}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      numeroDocumento: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
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
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
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
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Género
                </label>
                <select
                  value={formulario.genero}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      genero: e.target.value as Genero | "",
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                >
                  <option value="">Sin especificar</option>
                  {GENEROS.map((g) => (
                    <option key={g.valor} value={g.valor}>
                      {g.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Fecha de nacimiento
                </label>
                <input
                  type="date"
                  value={formulario.fechaNacimiento}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      fechaNacimiento: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
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
          ¿Desactivar a{" "}
          <strong>
            {confirmarEliminar?.nombres} {confirmarEliminar?.apellidos}
          </strong>
          ? No se podrá vincular a nuevos proyectos.
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
