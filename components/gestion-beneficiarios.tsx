"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, EyeOff, Trash2 } from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  actualizarBeneficiario,
  crearBeneficiario,
  desactivarBeneficiario,
  eliminarBeneficiario,
  importarBeneficiariosExcelCatalogo,
  listarBeneficiarios,
  obtenerBeneficiario,
  obtenerUsoBeneficiario,
  reactivarBeneficiario,
} from "@/lib/api";
import {
  AvisosCargaBeneficiarios,
  CargaExcelBeneficiarios,
} from "@/components/proyectos/carga-excel-beneficiarios";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import { SelectorVereda } from "@/components/ui/selector-vereda";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import type {
  Beneficiario,
  CrearBeneficiarioPayload,
  EstadoFiltroBeneficiario,
  Genero,
  TipoDocumento,
  ResultadoFilaCargaBeneficiario,
  UsoBeneficiario,
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
  edad: string;
  fechaNacimiento: string;
  municipio: string;
  lineaProductiva: string;
  nombreAsociacion: string;
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
  edad: "",
  fechaNacimiento: "",
  municipio: "",
  lineaProductiva: "",
  nombreAsociacion: "",
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

const PESTANAS: { valor: EstadoFiltroBeneficiario; etiqueta: string }[] = [
  { valor: "activos", etiqueta: "Activos" },
  { valor: "desactivados", etiqueta: "Desactivados" },
];

export function GestionBeneficiarios({ puedeGestionar }: GestionBeneficiariosProps) {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const puedeEliminar = puede("contrapartes.eliminar");
  const [estado, setEstado] = useState<EstadoFiltroBeneficiario>("activos");
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
  const [confirmarDesactivar, setConfirmarDesactivar] =
    useState<Beneficiario | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<Beneficiario | null>(
    null,
  );
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [detalleCarga, setDetalleCarga] = useState<
    ResultadoFilaCargaBeneficiario[]
  >([]);

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
        estado,
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
  }, [token, pagina, busqueda, estado]);

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
        edad: item.edad != null ? String(item.edad) : "",
        fechaNacimiento: item.fechaNacimiento?.slice(0, 10) ?? "",
        municipio: item.municipio ?? "",
        lineaProductiva: item.lineaProductiva ?? "",
        nombreAsociacion: item.nombreAsociacion ?? "",
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
      edad: formulario.edad.trim() ? Number(formulario.edad) : null,
      fechaNacimiento: formulario.fechaNacimiento || undefined,
      municipio: formulario.municipio.trim(),
      lineaProductiva: formulario.lineaProductiva.trim(),
      nombreAsociacion: formulario.nombreAsociacion.trim(),
    };
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token) return;
    if (formulario.edad.trim() && !/^\d{1,3}$/.test(formulario.edad.trim())) {
      setError("La edad debe ser un número entero");
      return;
    }
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

  async function importarExcel(archivo: File, veredaId: string) {
    if (!token) return;
    setImportando(true);
    setError(null);
    setExito(null);
    setDetalleCarga([]);
    try {
      const resultado = await importarBeneficiariosExcelCatalogo(
        token,
        archivo,
        veredaId,
      );
      setDetalleCarga(resultado.detalle);
      setExito(
        `Carga lista: ${resultado.creados} dadas de alta, ${resultado.asignadosExistentes} ya existían${
          resultado.errores
            ? `. ${resultado.errores} no se pudieron agregar`
            : ""
        }.`,
      );
      setArchivoExcel(null);
      setPagina(1);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el Excel");
    } finally {
      setImportando(false);
    }
  }

  async function ejecutarAccion(
    accion: () => Promise<unknown>,
    mensajeExito: string,
    mensajeError: string,
  ) {
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      await accion();
      setExito(mensajeExito);
      await cargar();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : mensajeError);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function manejarDesactivar() {
    if (!confirmarDesactivar || !token) return;
    const b = confirmarDesactivar;
    const ok = await ejecutarAccion(
      () => desactivarBeneficiario(token, b.id),
      `${b.nombres} ${b.apellidos} quedó desactivado. Lo encuentras en la pestaña Desactivados.`,
      "Error al desactivar",
    );
    if (ok) setConfirmarDesactivar(null);
  }

  async function manejarReactivar(b: Beneficiario) {
    if (!token) return;
    await ejecutarAccion(
      () => reactivarBeneficiario(token, b.id),
      `${b.nombres} ${b.apellidos} volvió a estar activo.`,
      "Error al reactivar",
    );
  }

  async function manejarEliminar() {
    if (!confirmarEliminar || !token) return;
    const b = confirmarEliminar;
    const ok = await ejecutarAccion(
      () => eliminarBeneficiario(token, b.id),
      `${b.nombres} ${b.apellidos} fue eliminado definitivamente.`,
      "Error al eliminar",
    );
    if (ok) setConfirmarEliminar(null);
  }

  function cambiarPestana(valor: EstadoFiltroBeneficiario) {
    setEstado(valor);
    setPagina(1);
    setExito(null);
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
          <div className="flex flex-wrap gap-2">
            {token ? (
              <CargaExcelBeneficiarios
                token={token}
                contexto="catalogo"
                variante="boton"
                archivo={archivoExcel}
                onArchivo={setArchivoExcel}
                importando={importando}
                disabled={importando}
                onImportar={importarExcel}
              />
            ) : null}
            <button
              type="button"
              onClick={abrirCrear}
              className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
            >
              + Nuevo beneficiario
            </button>
          </div>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}
      <AvisosCargaBeneficiarios detalle={detalleCarga} />

      <div className="mb-4 flex gap-6 border-b border-ruralia-teal-border">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            onClick={() => cambiarPestana(p.valor)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
              estado === p.valor
                ? "border-ruralia-teal text-ruralia-teal-text"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        {estado === "activos"
          ? "Desactivar oculta al beneficiario de listados y selectores, pero se puede reactivar. Eliminar es definitivo."
          : "Beneficiarios ocultos temporalmente. Puedes reactivarlos cuando quieras; conservan sus proyectos, jornadas y asociaciones."}
      </p>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre o documento..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
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
                      {estado === "activos"
                        ? "No se encontraron beneficiarios"
                        : "No hay beneficiarios desactivados"}
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
                        {b.vereda?.nombre ?? b.municipio ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            b.estaActivo
                              ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {b.estaActivo ? "Activo" : "Desactivado"}
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
                                onClick={() => setConfirmarDesactivar(b)}
                                className={btnAccionSecundaria}
                              >
                                Desactivar
                              </button>
                            </>
                          ) : null}
                          {puedeGestionar && !b.estaActivo ? (
                            <button
                              type="button"
                              disabled={enviando}
                              onClick={() => void manejarReactivar(b)}
                              className={btnAccionPrimaria}
                            >
                              Reactivar
                            </button>
                          ) : null}
                          {puedeEliminar ? (
                            <button
                              type="button"
                              onClick={() => setConfirmarEliminar(b)}
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
              <dt className="text-zinc-500">Municipio</dt>
              <dd className="font-medium">{seleccionado.municipio ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Asociación</dt>
              <dd className="font-medium">{seleccionado.nombreAsociacion ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Línea productiva</dt>
              <dd className="font-medium">{seleccionado.lineaProductiva ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Edad</dt>
              <dd className="font-medium">
                {seleccionado.edad != null ? seleccionado.edad : "—"}
              </dd>
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
                {seleccionado.estaActivo ? "Activo" : "Desactivado"}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Edad
                </label>
                <input
                  inputMode="numeric"
                  value={formulario.edad}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, edad: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Municipio
                </label>
                <input
                  value={formulario.municipio}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, municipio: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Asociación
                </label>
                <input
                  value={formulario.nombreAsociacion}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      nombreAsociacion: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Línea productiva
                </label>
                <input
                  value={formulario.lineaProductiva}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      lineaProductiva: e.target.value,
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
        titulo="Desactivar beneficiario"
        abierto={confirmarDesactivar !== null}
        onCerrar={() => setConfirmarDesactivar(null)}
      >
        <div className="space-y-3 text-sm text-zinc-600">
          <p>
            ¿Desactivar a{" "}
            <strong className="text-zinc-900">
              {confirmarDesactivar?.nombres} {confirmarDesactivar?.apellidos}
            </strong>
            ?
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Deja de aparecer en listados y al vincular beneficiarios.</li>
            <li>Conserva su historial en proyectos, jornadas y asociaciones.</li>
            <li>Puedes reactivarlo en cualquier momento desde la pestaña Desactivados.</li>
          </ul>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmarDesactivar(null)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void manejarDesactivar()}
            className="inline-flex items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            <EyeOff className="h-4 w-4" />
            {enviando ? "Desactivando..." : "Desactivar"}
          </button>
        </div>
      </Modal>

      {confirmarEliminar && token ? (
        <ModalEliminarBeneficiario
          key={confirmarEliminar.id}
          token={token}
          beneficiario={confirmarEliminar}
          enviando={enviando}
          puedeDesactivar={puedeGestionar}
          onCerrar={() => setConfirmarEliminar(null)}
          onDesactivarEnSuLugar={() => {
            setConfirmarDesactivar(confirmarEliminar);
            setConfirmarEliminar(null);
          }}
          onConfirmar={() => void manejarEliminar()}
        />
      ) : null}
    </>
  );
}

/**
 * Eliminación en dos pasos: primero advierte qué se pierde (con el uso real del
 * beneficiario) y ofrece desactivar en su lugar; después exige escribir el
 * documento y marcar la casilla de entendimiento.
 */
function ModalEliminarBeneficiario({
  token,
  beneficiario,
  enviando,
  puedeDesactivar,
  onCerrar,
  onDesactivarEnSuLugar,
  onConfirmar,
}: {
  token: string;
  beneficiario: Beneficiario;
  enviando: boolean;
  puedeDesactivar: boolean;
  onCerrar: () => void;
  onDesactivarEnSuLugar: () => void;
  onConfirmar: () => void;
}) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [uso, setUso] = useState<UsoBeneficiario | null>(null);
  const [errorUso, setErrorUso] = useState<string | null>(null);
  const [documentoEscrito, setDocumentoEscrito] = useState("");
  const [entiende, setEntiende] = useState(false);

  useEffect(() => {
    let vivo = true;
    obtenerUsoBeneficiario(token, beneficiario.id)
      .then((datos) => {
        if (vivo) setUso(datos);
      })
      .catch((err) => {
        if (vivo) {
          setErrorUso(
            err instanceof Error ? err.message : "No se pudo consultar su uso",
          );
        }
      });
    return () => {
      vivo = false;
    };
  }, [token, beneficiario.id]);

  const nombre = `${beneficiario.nombres} ${beneficiario.apellidos}`;
  const documentoCoincide =
    documentoEscrito.trim() === beneficiario.numeroDocumento.trim();
  const usos = uso
    ? [
        { total: uso.proyectos, singular: "proyecto", plural: "proyectos" },
        { total: uso.jornadas, singular: "jornada", plural: "jornadas" },
        { total: uso.asociaciones, singular: "asociación", plural: "asociaciones" },
        { total: uso.documentos, singular: "documento", plural: "documentos" },
      ]
    : [];
  const tieneUso = usos.some((u) => u.total > 0);

  return (
    <Modal titulo="Eliminar beneficiario" abierto onCerrar={onCerrar}>
      {paso === 1 ? (
        <div className="space-y-4 text-sm">
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Esta acción no se puede deshacer</p>
              <p className="mt-1">
                Vas a eliminar a <strong>{nombre}</strong> ({beneficiario.tipoDocumento}{" "}
                {beneficiario.numeroDocumento}) de forma definitiva.
              </p>
            </div>
          </div>

          <div>
            <p className="font-medium text-zinc-700">Qué pasará:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600">
              <li>Desaparece de todos los listados, incluida la pestaña Desactivados.</li>
              <li>Se quita de todas las asociaciones que lo agrupan.</li>
              <li>No se puede reactivar ni volver a registrar con el mismo documento.</li>
              <li>
                Los proyectos, jornadas y documentos donde ya aparece conservan su
                nombre como historial.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="font-medium">Dónde aparece hoy</p>
            {errorUso ? (
              <p className="mt-1 text-red-700">{errorUso}</p>
            ) : !uso ? (
              <Spinner className="py-3" />
            ) : tieneUso ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {usos
                  .filter((u) => u.total > 0)
                  .map((u) => (
                    <li
                      key={u.singular}
                      className="rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      {u.total} {u.total === 1 ? u.singular : u.plural}
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-1 text-amber-800">
                No está vinculado a proyectos, jornadas, asociaciones ni documentos.
              </p>
            )}
          </div>

          {puedeDesactivar && beneficiario.estaActivo ? (
            <div className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft p-4 text-ruralia-teal-text">
              <p className="font-medium">¿Solo quieres ocultarlo?</p>
              <p className="mt-1">
                Desactívalo: deja de aparecer, pero puedes recuperarlo cuando quieras.
              </p>
              <button
                type="button"
                onClick={onDesactivarEnSuLugar}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
              >
                <EyeOff className="h-4 w-4" />
                Desactivar en su lugar
              </button>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!uso && !errorUso}
              onClick={() => setPaso(2)}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Continuar con la eliminación
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Último paso. Una vez eliminado, <strong>{nombre}</strong> no se podrá
              recuperar.
            </p>
          </div>

          <div>
            <label className="mb-1 block font-medium text-zinc-700">
              Escribe el número de documento{" "}
              <span className="font-semibold text-zinc-900">
                {beneficiario.numeroDocumento}
              </span>{" "}
              para confirmar
            </label>
            <input
              value={documentoEscrito}
              onChange={(e) => setDocumentoEscrito(e.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none hover:border-ruralia-teal-border focus:border-red-400 focus:ring-2 focus:ring-red-200"
            />
          </div>

          <label className="flex items-start gap-2 text-zinc-700">
            <input
              type="checkbox"
              checked={entiende}
              onChange={(e) => setEntiende(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-red-600"
            />
            Entiendo que esta eliminación es definitiva y no se puede deshacer.
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPaso(1)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Volver
            </button>
            <button
              type="button"
              disabled={!documentoCoincide || !entiende || enviando}
              onClick={onConfirmar}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {enviando ? "Eliminando..." : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
