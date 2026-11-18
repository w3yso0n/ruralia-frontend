"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  History,
  Search,
  Send,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { SelectorFechaJornada } from "@/components/ui/selector-fecha-jornada";
import {
  altaRapidaBeneficiarioLineaBase,
  asignarLineaBase,
  configurarLineaBaseProyecto,
  descargarExcelLineaBase,
  listarBeneficiariosLineaBase,
  listarPlantillasFormulario,
  obtenerDetalleJornadaLineaBase,
  obtenerLineaBaseProyecto,
} from "@/lib/api";
import { mostrarErrorApi } from "@/lib/swal";
import { usePermisos } from "@/lib/use-permisos";
import {
  ETIQUETA_ESTADO_LINEA_BASE,
  type DetalleJornadaLineaBase,
  type EstadoLineaBase,
  type EstadoLineaBaseProyecto,
  type FilaBeneficiarioLineaBase,
  type PlantillaFormulario,
  type Proyecto,
} from "@/lib/types";

const LIMITE = 25;

const CLASE_ESTADO: Record<EstadoLineaBase, string> = {
  SIN_ASIGNAR: "bg-zinc-100 text-zinc-600",
  ASIGNADA: "bg-ruralia-teal-soft text-ruralia-teal-text",
  ENVIADA: "border border-ruralia-teal-border bg-white text-ruralia-teal-text",
  EN_CORRECCION: "bg-amber-50 text-amber-800",
  COMPLETA: "bg-ruralia-teal text-white",
};

const ORDEN_ESTADOS: EstadoLineaBase[] = [
  "SIN_ASIGNAR",
  "ASIGNADA",
  "ENVIADA",
  "EN_CORRECCION",
  "COMPLETA",
];

const claseInput =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20";

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

/** Botón reutilizable: también se usa en el listado de beneficiarios del proyecto. */
export function BotonExcelLineaBase({
  token,
  proyectoId,
  compacto = false,
}: {
  token: string;
  proyectoId: string;
  compacto?: boolean;
}) {
  const [descargando, setDescargando] = useState(false);
  async function descargar() {
    setDescargando(true);
    try {
      const { blob, nombreArchivo } = await descargarExcelLineaBase(token, proyectoId);
      descargarBlob(blob, nombreArchivo);
    } catch (err) {
      mostrarErrorApi(
        err instanceof Error ? err.message : "No se pudo descargar el Excel",
        "Excel de línea base",
      );
    } finally {
      setDescargando(false);
    }
  }
  return (
    <button
      type="button"
      onClick={descargar}
      disabled={descargando}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 ${
        compacto ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
      }`}
    >
      <Download className="h-4 w-4 text-ruralia-teal" />
      {descargando ? "Generando…" : compacto ? "Excel línea base" : "Descargar Excel"}
    </button>
  );
}

interface PanelLineaBaseProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
}

export function PanelLineaBase({ token, proyectoId, proyecto }: PanelLineaBaseProps) {
  const { puede } = usePermisos();
  const puedeAsignar = puede("linea_base.asignar");
  const puedeExportar = puede("linea_base.exportar");

  const [estado, setEstado] = useState<EstadoLineaBaseProyecto | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);
  const [filas, setFilas] = useState<FilaBeneficiarioLineaBase[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState<EstadoLineaBase | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [cargandoFilas, setCargandoFilas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [modalAlta, setModalAlta] = useState(false);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [detalleJornadaId, setDetalleJornadaId] = useState<string | null>(null);

  const cargarEstado = useCallback(async () => {
    const datos = await obtenerLineaBaseProyecto(token, proyectoId);
    setEstado(datos);
  }, [token, proyectoId]);

  const cargarFilas = useCallback(async () => {
    setCargandoFilas(true);
    try {
      const respuesta = await listarBeneficiariosLineaBase(token, proyectoId, {
        pagina,
        limite: LIMITE,
        estado: filtroEstado || undefined,
        busqueda: busquedaAplicada || undefined,
      });
      setFilas(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar beneficiarios");
    } finally {
      setCargandoFilas(false);
    }
  }, [token, proyectoId, pagina, filtroEstado, busquedaAplicada]);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    Promise.all([
      cargarEstado(),
      puedeAsignar
        ? listarPlantillasFormulario(token).then((lista) => {
            if (!cancelado) {
              setPlantillas(
                lista.filter((p) => p.fase === "LINEA_BASE" && p.estaActivo),
              );
            }
          })
        : Promise.resolve(),
    ])
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al cargar la línea base");
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, cargarEstado, puedeAsignar]);

  useEffect(() => {
    void cargarFilas();
  }, [cargarFilas]);

  async function recargarTodo() {
    await Promise.all([cargarEstado(), cargarFilas()]);
  }

  async function cambiarPlantilla(id: string) {
    setGuardandoConfig(true);
    setError(null);
    try {
      setEstado(await configurarLineaBaseProyecto(token, proyectoId, id || null));
      setExito(
        id
          ? "Formulario de línea base actualizado. Las jornadas ya asignadas conservan el suyo."
          : "Se quitó el formulario de línea base del proyecto.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardandoConfig(false);
    }
  }

  const seleccionables = useMemo(
    () => filas.filter((f) => f.estado === "SIN_ASIGNAR"),
    [filas],
  );
  const todosSeleccionados =
    seleccionables.length > 0 && seleccionables.every((f) => seleccion.has(f.beneficiarioId));

  function alternar(id: string) {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodos() {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (todosSeleccionados) seleccionables.forEach((f) => siguiente.delete(f.beneficiarioId));
      else seleccionables.forEach((f) => siguiente.add(f.beneficiarioId));
      return siguiente;
    });
  }

  if (cargando) return <Spinner />;

  const resumen = estado?.resumen;
  const porcentaje =
    resumen && resumen.total > 0 ? Math.round((resumen.completa / resumen.total) * 100) : 0;
  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));
  const conteoEstado: Record<EstadoLineaBase, number> = {
    SIN_ASIGNAR: resumen?.sinAsignar ?? 0,
    ASIGNADA: resumen?.asignada ?? 0,
    ENVIADA: resumen?.enviada ?? 0,
    EN_CORRECCION: resumen?.enCorreccion ?? 0,
    COMPLETA: resumen?.completa ?? 0,
  };

  return (
    <div className="space-y-6">
      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-ruralia-teal" />
            <h3 className="font-semibold text-zinc-900">Formulario de línea base</h3>
          </div>
          <p className="mb-3 text-sm text-zinc-600">
            Todos los beneficiarios del proyecto responden las mismas preguntas.
            Estas jornadas no cuentan en metas, avance ni reportes.
          </p>
          {puedeAsignar ? (
            <SelectorDesplegable
              value={estado?.plantilla?.id ?? ""}
              onChange={(id) => void cambiarPlantilla(id)}
              opciones={plantillas.map((p) => ({
                id: p.id,
                nombre: p.nombre,
                subtitulo: `${p.campos?.length ?? 0} preguntas · versión ${p.version}`,
              }))}
              placeholder="Elegir formulario de línea base"
              mensajeSinOpciones="No hay formularios de línea base en uso. Créalo en Formularios > Línea base."
              disabled={guardandoConfig}
              permitirVacio={Boolean(estado?.plantilla)}
              etiquetaVacio="Sin formulario"
              icono={FileText}
            />
          ) : (
            <p className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-800">
              {estado?.plantilla?.nombre ?? "Sin formulario configurado"}
            </p>
          )}
          {estado?.plantilla ? (
            <p className="mt-2 text-xs text-zinc-500">
              {estado.plantilla.cantidadPreguntas} preguntas. Cambiarlo solo
              afecta a las jornadas que se asignen después.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-500">Avance informativo</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {resumen?.completa ?? 0}{" "}
                <span className="text-base font-medium text-zinc-500">
                  de {resumen?.total ?? 0} beneficiarios
                </span>
              </p>
              <p className="text-xs text-zinc-500">con línea base completa</p>
            </div>
            {puedeExportar ? <BotonExcelLineaBase token={token} proyectoId={proyectoId} /> : null}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ruralia-teal-soft">
            <div className="h-full rounded-full bg-ruralia-teal" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            No alimenta las métricas del proyecto.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setFiltroEstado("");
                setPagina(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                filtroEstado === ""
                  ? "bg-ruralia-teal text-white"
                  : "bg-ruralia-teal-soft text-ruralia-teal-text hover:bg-ruralia-teal-border"
              }`}
            >
              Todos · {resumen?.total ?? 0}
            </button>
            {ORDEN_ESTADOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setFiltroEstado(e);
                  setPagina(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  filtroEstado === e
                    ? "bg-ruralia-teal text-white"
                    : "bg-ruralia-teal-soft text-ruralia-teal-text hover:bg-ruralia-teal-border"
                }`}
              >
                {ETIQUETA_ESTADO_LINEA_BASE[e]} · {conteoEstado[e]}
              </button>
            ))}
          </div>
          {puedeAsignar ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalAlta(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <UserPlus className="h-4 w-4 text-ruralia-teal" />
                Agregar beneficiario
              </button>
              <button
                type="button"
                onClick={() => setModalAsignar(true)}
                disabled={!seleccion.size || !estado?.plantilla}
                title={
                  !estado?.plantilla
                    ? "Configura primero el formulario de línea base"
                    : undefined
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Asignar línea base{seleccion.size ? ` (${seleccion.size})` : ""}
              </button>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPagina(1);
            setBusquedaAplicada(busqueda.trim());
          }}
          className="relative mb-4"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ruralia-teal-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento y presionar Enter"
            className={`${claseInput} pl-10`}
          />
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-500">
                {puedeAsignar ? (
                  <th className="w-10 py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={alternarTodos}
                      disabled={!seleccionables.length}
                      aria-label="Seleccionar los que no tienen línea base"
                      className="h-4 w-4 accent-ruralia-teal"
                    />
                  </th>
                ) : null}
                <th className="py-2 pr-3">Beneficiario</th>
                <th className="py-2 pr-3">Municipio</th>
                <th className="py-2 pr-3">Vereda DANE</th>
                <th className="py-2 pr-3">Vereda PDET</th>
                <th className="py-2 pr-3">Línea productiva</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2 pr-3">Técnico</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {cargandoFilas && !filas.length ? (
                <tr>
                  <td colSpan={9} className="py-8">
                    <Spinner />
                  </td>
                </tr>
              ) : null}
              {!cargandoFilas && !filas.length ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-zinc-500">
                    No hay beneficiarios con este filtro.
                  </td>
                </tr>
              ) : null}
              {filas.map((fila) => (
                <tr
                  key={fila.beneficiarioId}
                  className="border-b border-zinc-100 transition hover:bg-ruralia-teal-soft/40"
                >
                  {puedeAsignar ? (
                    <td className="py-2.5 pr-2">
                      <input
                        type="checkbox"
                        checked={seleccion.has(fila.beneficiarioId)}
                        onChange={() => alternar(fila.beneficiarioId)}
                        disabled={fila.estado !== "SIN_ASIGNAR"}
                        aria-label={`Seleccionar ${fila.nombreCompleto}`}
                        className="h-4 w-4 accent-ruralia-teal disabled:opacity-30"
                      />
                    </td>
                  ) : null}
                  <td className="py-2.5 pr-3">
                    <p className="font-medium text-zinc-900">{fila.nombreCompleto}</p>
                    <p className="text-xs text-zinc-500">
                      {fila.tipoDocumento} {fila.numeroDocumento}
                    </p>
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {fila.territorio.municipio ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {fila.territorio.veredaDane ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {fila.territorio.veredaPdet ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-zinc-700">
                    {fila.lineaProductiva ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLASE_ESTADO[fila.estado]}`}
                    >
                      {ETIQUETA_ESTADO_LINEA_BASE[fila.estado]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-zinc-600">
                    {fila.tecnico ?? "—"}
                    {fila.fecha ? <span className="block text-zinc-400">{fila.fecha}</span> : null}
                  </td>
                  <td className="py-2.5 text-right">
                    {fila.jornadaId ? (
                      <button
                        type="button"
                        onClick={() => setDetalleJornadaId(fila.jornadaId!)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
            <span>
              Página {pagina} de {totalPaginas} · {total} beneficiarios
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <ModalAltaRapida
        abierto={modalAlta}
        onCerrar={() => setModalAlta(false)}
        token={token}
        proyectoId={proyectoId}
        onCreado={async (fila) => {
          setModalAlta(false);
          setExito(`${fila.nombreCompleto} quedó en el proyecto. El resto de sus datos se completa en campo.`);
          await recargarTodo();
        }}
      />

      <ModalAsignar
        abierto={modalAsignar}
        onCerrar={() => setModalAsignar(false)}
        token={token}
        proyectoId={proyectoId}
        proyecto={proyecto}
        beneficiarioIds={[...seleccion]}
        onAsignado={async (creadas) => {
          setModalAsignar(false);
          setSeleccion(new Set());
          setExito(
            `Se crearon ${creadas} jornada${creadas === 1 ? "" : "s"} de línea base. El técnico ya las ve en su app.`,
          );
          await recargarTodo();
        }}
      />

      <ModalDetalle
        jornadaId={detalleJornadaId}
        onCerrar={() => setDetalleJornadaId(null)}
        token={token}
        proyectoId={proyectoId}
      />
    </div>
  );
}

function ModalAltaRapida({
  abierto,
  onCerrar,
  token,
  proyectoId,
  onCreado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  token: string;
  proyectoId: string;
  onCreado: (fila: FilaBeneficiarioLineaBase) => void;
}) {
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [documento, setDocumento] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombres("");
    setApellidos("");
    setDocumento("");
    setError(null);
  }, [abierto]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const fila = await altaRapidaBeneficiarioLineaBase(token, proyectoId, {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        numeroDocumento: documento.trim(),
      });
      onCreado(fila);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Agregar beneficiario" abierto={abierto} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <p className="text-sm text-zinc-600">
          Solo nombre y cédula. El resto de datos se completa en campo con la
          línea base. Si la cédula ya existe, se vincula esa persona.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Nombres</label>
            <input required value={nombres} onChange={(e) => setNombres(e.target.value)} className={claseInput} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Apellidos</label>
            <input required value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={claseInput} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Cédula</label>
          <input
            required
            inputMode="numeric"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className={claseInput}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalAsignar({
  abierto,
  onCerrar,
  token,
  proyectoId,
  proyecto,
  beneficiarioIds,
  onAsignado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  beneficiarioIds: string[];
  onAsignado: (creadas: number) => void;
}) {
  const [tecnicoId, setTecnicoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tecnicos = useMemo(
    () =>
      (proyecto.personal ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombreCompleto,
        subtitulo: p.correo,
      })),
    [proyecto.personal],
  );

  useEffect(() => {
    if (!abierto) return;
    setError(null);
  }, [abierto]);

  async function asignar(e: React.FormEvent) {
    e.preventDefault();
    if (!tecnicoId) {
      setError("Elige el técnico que hará el levantamiento.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const resultado = await asignarLineaBase(token, proyectoId, {
        beneficiarioIds,
        tecnicoId,
        fecha: fecha || undefined,
        observaciones: observaciones.trim() || undefined,
      });
      onAsignado(resultado.creadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo asignar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Asignar línea base" abierto={abierto} onCerrar={onCerrar} ancho="lg">
      <form onSubmit={asignar} className="space-y-4">
        <p className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 px-4 py-3 text-sm text-ruralia-teal-text">
          Se creará una jornada de línea base por cada uno de los{" "}
          <strong>{beneficiarioIds.length}</strong> beneficiarios elegidos, con
          el formulario del proyecto. Sin meta ni plan.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Técnico *</label>
          <SelectorCatalogo
            opciones={tecnicos}
            value={tecnicoId}
            onChange={setTecnicoId}
            placeholder="Buscar un técnico del equipo..."
            mensajeVacio="No hay personal asignado al proyecto. Configúralo en Equipo y contraparte."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Fecha <span className="font-normal text-zinc-400">(opcional, por defecto hoy)</span>
          </label>
          <SelectorFechaJornada value={fecha} onChange={setFecha} enFlujo />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Observaciones <span className="font-normal text-zinc-400">(opcional)</span>
          </label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={claseInput}
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            {guardando ? "Asignando…" : "Crear jornadas"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function textoRespuesta(
  tipo: string,
  r: DetalleJornadaLineaBase["respuestas"][number] | undefined,
): string {
  if (!r) return "";
  if (tipo === "VEREDA_PDET") {
    return (r.valorJson as { nombre?: string } | null)?.nombre ?? "";
  }
  if (r.urlArchivo) return "Archivo adjunto";
  if (r.valorBooleano != null) return r.valorBooleano ? "Sí" : "No";
  if (r.valorNumero != null) return String(r.valorNumero);
  if (r.valorFecha) return r.valorFecha.slice(0, 10);
  if (Array.isArray(r.valorJson)) return (r.valorJson as unknown[]).join("; ");
  if (r.valorJson && typeof r.valorJson === "object") {
    const gps = r.valorJson as { latitud?: number; longitud?: number };
    if (gps.latitud != null && gps.longitud != null) return `${gps.latitud}, ${gps.longitud}`;
  }
  return r.valorTexto ?? "";
}

function textoValor(valor: unknown): string {
  if (valor == null || valor === "") return "Vacío";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  return String(valor);
}

function ModalDetalle({
  jornadaId,
  onCerrar,
  token,
  proyectoId,
}: {
  jornadaId: string | null;
  onCerrar: () => void;
  token: string;
  proyectoId: string;
}) {
  const [detalle, setDetalle] = useState<DetalleJornadaLineaBase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jornadaId) return;
    let cancelado = false;
    setDetalle(null);
    setError(null);
    obtenerDetalleJornadaLineaBase(token, proyectoId, jornadaId)
      .then((d) => {
        if (!cancelado) setDetalle(d);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar");
      });
    return () => {
      cancelado = true;
    };
  }, [jornadaId, token, proyectoId]);

  const porClave = useMemo(
    () => new Map((detalle?.respuestas ?? []).map((r) => [r.claveCampo, r])),
    [detalle],
  );

  return (
    <Modal titulo="Línea base" abierto={Boolean(jornadaId)} onCerrar={onCerrar} ancho="xl">
      {error ? <Alerta mensaje={error} /> : null}
      {!detalle && !error ? <Spinner /> : null}
      {detalle ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">
              {detalle.beneficiario?.nombreCompleto ?? "Beneficiario"}
            </span>
            {detalle.beneficiario ? <span>· {detalle.beneficiario.numeroDocumento}</span> : null}
            <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-semibold text-ruralia-teal-text">
              {detalle.jornada.estadoFuncional}
            </span>
            <span>
              · {detalle.jornada.tecnico} · {String(detalle.jornada.fecha).slice(0, 10)}
            </span>
            {detalle.envio ? (
              <span>· Enviada {new Date(detalle.envio.enviadoEn).toLocaleString("es-CO")}</span>
            ) : (
              <span>· Sin respuestas todavía</span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-ruralia-teal-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-ruralia-teal-soft/40 text-xs font-semibold text-zinc-600">
                <tr>
                  <th className="px-4 py-2">Pregunta</th>
                  <th className="px-4 py-2">Respuesta</th>
                </tr>
              </thead>
              <tbody>
                {detalle.campos.map((campo) => {
                  const texto = textoRespuesta(campo.tipoCampo, porClave.get(campo.clave));
                  return (
                    <tr key={campo.id} className="border-t border-zinc-100">
                      <td className="px-4 py-2 align-top text-zinc-700">
                        {campo.etiqueta}
                        {campo.vincularBeneficiario ? (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
                            <UserCheck className="h-3 w-3" />
                            Ficha
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-zinc-900">
                        {texto || <span className="text-zinc-400">Sin respuesta</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detalle.cambiosAplicados.length ? (
            <div className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                <UserCheck className="h-4 w-4 text-ruralia-teal" />
                Datos actualizados en la ficha
              </p>
              <ul className="space-y-1 text-sm text-zinc-700">
                {detalle.cambiosAplicados.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.etiqueta}:</span>{" "}
                    <span className="text-zinc-400 line-through">{textoValor(c.valorAnterior)}</span>{" "}
                    {textoValor(c.valorNuevo)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
              <History className="h-4 w-4 text-ruralia-teal" />
              Versiones
            </p>
            {detalle.versiones.length ? (
              <ul className="space-y-2 text-sm">
                {detalle.versiones.map((v) => (
                  <li key={v.id} className="rounded-xl border border-zinc-100 px-3 py-2">
                    <p className="font-medium text-zinc-900">
                      Versión {v.versionNumber}{" "}
                      <span className="ml-1 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
                        {v.status}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(v.creadoEn).toLocaleString("es-CO")}
                      {v.creadoPor ? ` · ${v.creadoPor}` : ""}
                      {v.motivo ? ` · ${v.motivo}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">
                Las versiones aparecen cuando el técnico envía a revisión.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
