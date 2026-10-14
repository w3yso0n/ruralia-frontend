"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AvisosCargaBeneficiarios,
  CargaExcelBeneficiarios,
} from "@/components/proyectos/carga-excel-beneficiarios";
import { Alerta, Modal } from "@/components/ui/modal";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import { SelectorVeredasMultiple } from "@/components/ui/selector-veredas-multiple";
import {
  asignarAsociacionesProyecto,
  asignarPersonalProyecto,
  asignarTerritoriosProyecto,
  desvincularBeneficiarioProyecto,
  historialBeneficiarioProyecto,
  importarBeneficiariosExcelProyecto,
  listarAsociaciones,
  listarBeneficiarios,
  listarBeneficiariosProyecto,
  listarTodasLasPaginas,
  listarUsuarios,
  reemplazarBeneficiarioProyecto,
  vincularBeneficiariosProyecto,
} from "@/lib/api";
import type {
  BeneficiarioResumen,
  HistorialBeneficiarioProyecto,
  Proyecto,
  RespuestaPaginada,
  ResultadoCargaMasivaBeneficiarios,
  TipoDocumento,
} from "@/lib/types";
import { etiquetaOrganizacion } from "@/lib/types";
import { mostrarResultadoCargaBeneficiarios } from "@/lib/swal";

interface EquipoVinculosProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  puedeGestionar: boolean;
  onActualizar: (opciones?: { silencioso?: boolean }) => Promise<void>;
}

function etiquetaBeneficiario(b: {
  nombres: string;
  apellidos: string;
  numeroDocumento?: string;
}): string {
  const nombre = `${b.nombres} ${b.apellidos}`.trim();
  return b.numeroDocumento ? `${nombre} · ${b.numeroDocumento}` : nombre;
}

export function EquipoVinculos({
  token,
  proyectoId,
  proyecto,
  puedeGestionar,
  onActualizar,
}: EquipoVinculosProps) {
  const [veredaIds, setVeredaIds] = useState<string[]>([]);
  const [municipioIds, setMunicipioIds] = useState<string[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);
  const [asociacionIds, setAsociacionIds] = useState<string[]>([]);
  const [opcionesUsuarios, setOpcionesUsuarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesAsociaciones, setOpcionesAsociaciones] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [resultadoCarga, setResultadoCarga] =
    useState<ResultadoCargaMasivaBeneficiarios | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reemplazo, setReemplazo] = useState<BeneficiarioResumen | null>(null);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [estadoLista, setEstadoLista] = useState<"activos" | "reemplazados">(
    "activos",
  );
  const [busquedaLista, setBusquedaLista] = useState("");
  const [paginaLista, setPaginaLista] = useState(1);
  const [lista, setLista] = useState<RespuestaPaginada<BeneficiarioResumen> | null>(
    null,
  );
  const [cargandoLista, setCargandoLista] = useState(false);
  const [recargaLista, setRecargaLista] = useState(0);
  const [modoReemplazo, setModoReemplazo] = useState<"existente" | "nuevo">(
    "nuevo",
  );
  const [nuevoBeneficiarioId, setNuevoBeneficiarioId] = useState("");
  const [nombresNuevo, setNombresNuevo] = useState("");
  const [documentoNuevo, setDocumentoNuevo] = useState("");
  const [tipoDocumentoNuevo, setTipoDocumentoNuevo] =
    useState<TipoDocumento>("CC");
  const [notaReemplazo, setNotaReemplazo] = useState("");

  const [historialId, setHistorialId] = useState<string | null>(null);
  const [historial, setHistorial] =
    useState<HistorialBeneficiarioProyecto | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    setVeredaIds(proyecto.veredas?.map((v) => v.id) ?? []);
    setMunicipioIds(proyecto.municipios?.map((m) => m.id) ?? []);
    setUsuarioIds(proyecto.personal?.map((p) => p.id) ?? []);
    setAsociacionIds(proyecto.asociaciones?.map((a) => a.id) ?? []);
  }, [proyecto]);

  useEffect(() => {
    void Promise.all([
      listarTodasLasPaginas((pagina, limite) =>
        listarUsuarios(token, { pagina, limite, estaActivo: true }),
      ),
      listarTodasLasPaginas((pagina, limite) =>
        listarAsociaciones(token, { pagina, limite }),
      ),
    ])
      .then(([usuarios, asociaciones]) => {
        setOpcionesUsuarios(
          usuarios.map((u) => ({ id: u.id, nombre: u.nombreCompleto })),
        );
        setOpcionesAsociaciones(
          asociaciones.map((a) => ({
            id: a.id,
            nombre: etiquetaOrganizacion(a),
          })),
        );
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar equipo y contraparte",
        );
      });
  }, [token]);

  useEffect(() => {
    if (!listaAbierta) return;
    let cancelado = false;
    const timer = setTimeout(() => {
      setCargandoLista(true);
      void listarBeneficiariosProyecto(token, proyectoId, {
        busqueda: busquedaLista.trim() || undefined,
        pagina: paginaLista,
        limite: 20,
        estado: estadoLista,
      })
        .then((datos) => {
          if (!cancelado) setLista(datos);
        })
        .catch((err: unknown) => {
          if (cancelado) return;
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la lista de beneficiarios",
          );
        })
        .finally(() => {
          if (!cancelado) setCargandoLista(false);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [
    listaAbierta,
    busquedaLista,
    paginaLista,
    estadoLista,
    token,
    proyectoId,
    recargaLista,
  ]);

  const buscarEnCatalogo = useCallback(
    async (termino: string) => {
      const respuesta = await listarBeneficiarios(token, {
        busqueda: termino || undefined,
        limite: 5,
      });
      return respuesta.datos
        .filter((b) => b.id !== reemplazo?.id)
        .map((b) => ({
          id: b.id,
          nombre: `${b.nombres} ${b.apellidos}`.trim(),
          subtitulo: b.numeroDocumento,
        }));
    },
    [token, reemplazo?.id],
  );

  function abrirLista(estado: "activos" | "reemplazados") {
    setEstadoLista(estado);
    setBusquedaLista("");
    setPaginaLista(1);
    setLista(null);
    setListaAbierta(true);
  }

  async function guardarSeccion(
    tipo: "territorio" | "personal" | "asociaciones",
  ) {
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      if (tipo === "territorio") {
        if (!municipioIds.length && !veredaIds.length) {
          setError("Selecciona al menos un municipio");
          return;
        }
        await asignarTerritoriosProyecto(token, proyectoId, {
          veredaIds,
          municipioIds,
        });
      }
      if (tipo === "personal") {
        if (!usuarioIds.length) {
          setError("Selecciona al menos una persona del equipo interno");
          return;
        }
        await asignarPersonalProyecto(token, proyectoId, { usuarioIds });
      }
      if (tipo === "asociaciones") {
        await asignarAsociacionesProyecto(token, proyectoId, {
          asociaciones: asociacionIds.map((id) => ({ asociacionId: id })),
        });
      }
      setExito("Cambios guardados");
      await onActualizar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  async function importarExcel(archivo: File, veredaId: string) {
    setImportando(true);
    setError(null);
    setExito(null);
    try {
      const resultado = await importarBeneficiariosExcelProyecto(
        token,
        proyectoId,
        archivo,
        veredaId,
      );
      setResultadoCarga(resultado);
      setArchivoExcel(null);
      await mostrarResultadoCargaBeneficiarios(resultado);
      await onActualizar({ silencioso: true });
      setRecargaLista((n) => n + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al importar el Excel",
      );
    } finally {
      setImportando(false);
    }
  }

  async function confirmarReemplazo() {
    if (!reemplazo) return;
    setEnviando(true);
    setError(null);
    try {
      if (modoReemplazo === "existente") {
        if (!nuevoBeneficiarioId) {
          setError("Selecciona a la persona que entra como reemplazo");
          return;
        }
        await reemplazarBeneficiarioProyecto(token, proyectoId, reemplazo.id, {
          nuevoBeneficiarioId,
          nota: notaReemplazo.trim() || undefined,
        });
      } else {
        if (!nombresNuevo.trim() || !documentoNuevo.trim()) {
          setError("El reemplazo necesita nombre e identificador único");
          return;
        }
        await reemplazarBeneficiarioProyecto(token, proyectoId, reemplazo.id, {
          nombres: nombresNuevo.trim(),
          numeroDocumento: documentoNuevo.trim(),
          tipoDocumento: tipoDocumentoNuevo,
          nota: notaReemplazo.trim() || undefined,
        });
      }
      setReemplazo(null);
      setNuevoBeneficiarioId("");
      setNombresNuevo("");
      setDocumentoNuevo("");
      setNotaReemplazo("");
      setExito("Reemplazo registrado. El historial del cupo se conserva.");
      await onActualizar({ silencioso: true });
      setRecargaLista((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reemplazar");
    } finally {
      setEnviando(false);
    }
  }

  async function vincularUno(id: string) {
    if (!id) return;
    setEnviando(true);
    setError(null);
    try {
      await vincularBeneficiariosProyecto(token, proyectoId, {
        beneficiarios: [{ beneficiarioId: id }],
      });
      await onActualizar({ silencioso: true });
      setRecargaLista((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo vincular");
    } finally {
      setEnviando(false);
    }
  }

  async function quitarBeneficiario(persona: BeneficiarioResumen) {
    if (!confirm(`¿Quitar a ${etiquetaBeneficiario(persona)} de este proyecto?`)) {
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await desvincularBeneficiarioProyecto(token, proyectoId, persona.id);
      await onActualizar({ silencioso: true });
      setRecargaLista((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    } finally {
      setEnviando(false);
    }
  }

  async function abrirHistorial(beneficiarioId: string) {
    setHistorialId(beneficiarioId);
    setHistorial(null);
    setCargandoHistorial(true);
    try {
      const data = await historialBeneficiarioProyecto(
        token,
        proyectoId,
        beneficiarioId,
      );
      setHistorial(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el historial",
      );
      setHistorialId(null);
    } finally {
      setCargandoHistorial(false);
    }
  }

  const conteoBeneficiarios =
    proyecto.conteoBeneficiarios ?? proyecto.beneficiarios?.length ?? 0;

  function filaBeneficiario(b: BeneficiarioResumen, conAcciones: boolean) {
    return (
      <li
        key={b.id}
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800">
            {etiquetaBeneficiario(b)}
          </p>
          {b.reemplazaA ? (
            <p className="text-xs text-amber-800">
              Entra como reemplazo de {b.reemplazaA.nombres}{" "}
              {b.reemplazaA.apellidos}
              {b.reemplazaA.numeroDocumento
                ? ` (${b.reemplazaA.numeroDocumento})`
                : ""}
            </p>
          ) : null}
        </div>
        {conAcciones && estadoLista === "activos" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void abrirHistorial(b.id)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => {
                setReemplazo(b);
                setModoReemplazo("nuevo");
                setNuevoBeneficiarioId("");
                setNombresNuevo("");
                setDocumentoNuevo("");
                setNotaReemplazo("");
              }}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
            >
              Reemplazar
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={() => void quitarBeneficiario(b)}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ) : null}
      </li>
    );
  }

  const modalLista = (
    <Modal
      abierto={listaAbierta}
      onCerrar={() => setListaAbierta(false)}
      titulo={
        estadoLista === "reemplazados"
          ? "Historial de reemplazos"
          : `Beneficiarios (${conteoBeneficiarios.toLocaleString("es-CO")})`
      }
      ancho="lg"
    >
      <div className="space-y-3">
        <input
          type="search"
          value={busquedaLista}
          onChange={(e) => {
            setBusquedaLista(e.target.value);
            setPaginaLista(1);
          }}
          placeholder="Buscar por nombre o documento"
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal"
        />
        {cargandoLista && !lista ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : lista && lista.datos.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {estadoLista === "reemplazados"
              ? "No hay reemplazos."
              : "Nadie coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-100">
            {(lista?.datos ?? []).map((b) =>
              filaBeneficiario(b, puedeGestionar),
            )}
          </ul>
        )}
        {lista && lista.totalPaginas > 1 ? (
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={paginaLista <= 1}
              onClick={() => setPaginaLista((p) => Math.max(1, p - 1))}
              className="rounded-lg px-2 py-1 font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-zinc-500">
              {paginaLista} / {lista.totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaLista >= lista.totalPaginas}
              onClick={() => setPaginaLista((p) => p + 1)}
              className="rounded-lg px-2 py-1 font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );

  if (!puedeGestionar) {
    return (
      <div className="space-y-4">
        {error ? <Alerta mensaje={error} /> : null}
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <h3 className="font-semibold text-zinc-900">Equipo interno</h3>
          {proyecto.personal?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {proyecto.personal.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
                >
                  {p.nombreCompleto}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Sin personal asignado</p>
          )}
        </section>
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <h3 className="font-semibold text-zinc-900">Beneficiarios</h3>
          <p className="mt-2 text-sm text-zinc-700">
            {conteoBeneficiarios.toLocaleString("es-CO")}{" "}
            {conteoBeneficiarios === 1
              ? "beneficiario asociado"
              : "beneficiarios asociados"}
          </p>
          {conteoBeneficiarios > 0 ? (
            <button
              type="button"
              onClick={() => abrirLista("activos")}
              className="mt-2 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
            >
              Ver beneficiarios
            </button>
          ) : null}
          <h3 className="mt-5 font-semibold text-zinc-900">Asociaciones y OAM</h3>
          {proyecto.asociaciones?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-zinc-700">
              {proyecto.asociaciones.map((a) => (
                <li key={a.id}>{etiquetaOrganizacion(a)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Sin asociaciones ni OAM</p>
          )}
          <p className="mt-4 text-sm text-zinc-600">Municipios</p>
          {proyecto.municipios?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {proyecto.municipios.map((municipio) => (
                <span
                  key={municipio.id}
                  className="inline-flex rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
                >
                  {municipio.departamentoNombre
                    ? `${municipio.nombre}, ${municipio.departamentoNombre}`
                    : municipio.nombre}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Sin municipios asignados</p>
          )}
          <p className="mt-4 text-sm text-zinc-600">Veredas asignadas</p>
          {proyecto.veredas?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {proyecto.veredas.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
                >
                  {v.nombre}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Sin veredas asignadas (opcional)
            </p>
          )}
        </section>
        {modalLista}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <section
        id="equipo-interno"
        className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Equipo interno</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Personas de la organización que ejecutan el proyecto.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("personal")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorCatalogo
          multiple
          opciones={opcionesUsuarios}
          value={usuarioIds}
          onChange={setUsuarioIds}
          placeholder="Buscar persona del equipo…"
          mensajeVacio="Aún no hay personas asignadas. Haz clic para ver la lista."
        />
      </section>

      <section
        id="contraparte"
        className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3">
          <h3 className="font-semibold text-zinc-900">Beneficiarios</h3>
          <p className="mt-1 text-sm text-zinc-800">
            {conteoBeneficiarios.toLocaleString("es-CO")}{" "}
            {conteoBeneficiarios === 1
              ? "beneficiario asociado"
              : "beneficiarios asociados"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            En cada jornada se elige a quién se atiende. La lista completa se
            consulta solo al administrarlos.
          </p>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => abrirLista("activos")}
            className="rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white"
          >
            Ver beneficiarios
          </button>
          <button
            type="button"
            onClick={() => abrirLista("reemplazados")}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
          >
            Historial de reemplazos
          </button>
        </div>
        <SelectorCatalogo
          opciones={[]}
          buscar={buscarEnCatalogo}
          value=""
          onChange={(id) => void vincularUno(id)}
          placeholder="Buscar en la base para añadir uno…"
          mensajeVacio="Opcional. Si son muchos, usa el Excel."
        />
        <div className="mt-4">
          <CargaExcelBeneficiarios
            token={token}
            archivo={archivoExcel}
            onArchivo={setArchivoExcel}
            disabled={enviando || importando}
            importando={importando}
            onImportar={importarExcel}
            veredas={(proyecto.veredas ?? [])
              .filter((vereda) => !!vereda.codigo && /^[0-9]+$/.test(vereda.codigo))
              .map((vereda) => ({
                id: vereda.id,
                nombre: vereda.nombre,
                subtitulo: `DANE ${vereda.codigo}`,
              }))}
          />
        </div>
        {resultadoCarga ? (
          <div className="mt-3">
            <p className="text-xs text-zinc-500">
              Última carga: {resultadoCarga.totalFilas} filas ·{" "}
              {resultadoCarga.creados} altas nuevas ·{" "}
              {resultadoCarga.asignadosExistentes} ya existían y se vincularon
              {resultadoCarga.yaEnProyecto
                ? ` · ${resultadoCarga.yaEnProyecto} ya estaban en el proyecto`
                : ""}
            </p>
            <AvisosCargaBeneficiarios detalle={resultadoCarga.detalle} />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Asociaciones y OAM</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Una OAM se asigna igual que una asociación. El proyecto puede
              tener varias.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("asociaciones")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorCatalogo
          multiple
          opciones={opcionesAsociaciones}
          value={asociacionIds}
          onChange={setAsociacionIds}
          placeholder="Buscar asociaciones u OAM…"
          mensajeVacio="Puedes dejarlo vacío si el proyecto solo tiene beneficiarios."
        />
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Territorio</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Agrega los municipios que necesites y guarda una sola vez. La vereda es opcional.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("territorio")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorVeredasMultiple
          token={token}
          value={veredaIds}
          onChange={setVeredaIds}
          veredasIniciales={proyecto.veredas}
          veredaOpcional
          municipioIds={municipioIds}
          onMunicipiosChange={setMunicipioIds}
          municipiosIniciales={proyecto.municipios}
        />
      </section>

      {modalLista}

      <Modal
        abierto={!!reemplazo}
        onCerrar={() => setReemplazo(null)}
        titulo="Reemplazar beneficiario"
      >
        {reemplazo ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              {etiquetaBeneficiario(reemplazo)} sale del cupo. La
              persona nueva hereda las jornadas ya hechas; quedan marcadas como
              historial de reemplazo, no como un proceso nuevo.
            </p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoReemplazo === "nuevo"}
                  onChange={() => setModoReemplazo("nuevo")}
                />
                Registrar persona nueva
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoReemplazo === "existente"}
                  onChange={() => setModoReemplazo("existente")}
                />
                Ya está en la base de datos
              </label>
            </div>
            {modoReemplazo === "nuevo" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nombre completo *
                  </label>
                  <input
                    value={nombresNuevo}
                    onChange={(e) => setNombresNuevo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de documento
                    </label>
                    <select
                      value={tipoDocumentoNuevo}
                      onChange={(e) =>
                        setTipoDocumentoNuevo(e.target.value as TipoDocumento)
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="CC">Cédula</option>
                      <option value="CE">Cédula extranjería</option>
                      <option value="TI">Tarjeta de identidad</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Identificador único *
                    </label>
                    <input
                      value={documentoNuevo}
                      onChange={(e) => setDocumentoNuevo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <SelectorCatalogo
                opciones={[]}
                buscar={buscarEnCatalogo}
                value={nuevoBeneficiarioId}
                onChange={setNuevoBeneficiarioId}
                placeholder="Buscar a quien entra…"
                mensajeVacio="Elige a la persona de reemplazo."
              />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Motivo (opcional)
              </label>
              <textarea
                rows={2}
                value={notaReemplazo}
                onChange={(e) => setNotaReemplazo(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReemplazo(null)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => void confirmarReemplazo()}
                className="rounded-lg bg-ruralia-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirmar reemplazo
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        abierto={!!historialId}
        onCerrar={() => {
          setHistorialId(null);
          setHistorial(null);
        }}
        titulo="Historial del cupo"
        ancho="lg"
      >
        {cargandoHistorial ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : historial ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              Titular actual:{" "}
              <strong>{etiquetaBeneficiario(historial.beneficiario)}</strong>
            </p>
            {historial.reemplazaA ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Esta persona no inició el proceso: entra como reemplazo de{" "}
                {etiquetaBeneficiario(historial.reemplazaA)}.
                {historial.notaReemplazo
                  ? ` Motivo: ${historial.notaReemplazo}`
                  : ""}
              </p>
            ) : null}
            {historial.cadenaReemplazos.length > 1 ? (
              <ol className="space-y-1 text-sm">
                {historial.cadenaReemplazos.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{i + 1}.</span>
                    {etiquetaBeneficiario(p)}
                    {i < historial.cadenaReemplazos.length - 1 ? (
                      <span className="text-xs text-amber-700">
                        → reemplazado
                      </span>
                    ) : (
                      <span className="text-xs text-ruralia-teal-text">
                        titular
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-800">
                Jornadas del cupo
              </p>
              {historial.jornadas.length ? (
                <ul className="space-y-2">
                  {historial.jornadas.map((j) => (
                    <li
                      key={j.id}
                      className="rounded-xl border border-zinc-100 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {j.nombre?.trim() ||
                            new Date(j.fecha).toLocaleDateString("es-CO")}
                        </span>
                        <span className="text-zinc-400">{j.estado}</span>
                        {j.esHeredada ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Heredada
                            {j.beneficiarioEnRegistro
                              ? ` · ${j.beneficiarioEnRegistro.nombres} ${j.beneficiarioEnRegistro.apellidos}`
                              : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-medium text-ruralia-teal-text">
                            De esta persona
                          </span>
                        )}
                      </div>
                      {j.vereda ? (
                        <p className="text-xs text-zinc-500">{j.vereda}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">
                  Aún no hay jornadas en este cupo.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
