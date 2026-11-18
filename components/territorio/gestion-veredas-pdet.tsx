"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, Map as IconoMapa, Search, Upload } from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  actualizarVeredaPdet,
  analizarArchivoVeredasPdet,
  importarVeredasPdet,
  listarVeredasPdet,
  previsualizarVeredasPdet,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { confirmarEliminacionSimple } from "@/lib/swal";
import { usePermisos } from "@/lib/use-permisos";
import type {
  AnalisisVeredasPdet,
  CampoMapeoPdet,
  FilaPreviewPdet,
  MapeoVeredasPdet,
  TotalesImportacionPdet,
  VeredaPdet,
} from "@/lib/types";

const LIMITE = 50;

const claseInput =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20";

const ETIQUETA_ACCION: Record<FilaPreviewPdet["accion"], string> = {
  CREAR: "Nueva",
  ACTUALIZAR: "Se actualiza",
  SIN_CAMBIOS: "Sin cambios",
  ERROR: "Con error",
};

const CLASE_ACCION: Record<FilaPreviewPdet["accion"], string> = {
  CREAR: "bg-ruralia-teal text-white",
  ACTUALIZAR: "bg-ruralia-teal-soft text-ruralia-teal-text",
  SIN_CAMBIOS: "bg-zinc-100 text-zinc-600",
  ERROR: "bg-red-50 text-red-700",
};

/**
 * Catálogo de veredas PDET (zonas de posconflicto). Es distinto de la división
 * DANE: una vereda DANE puede estar dividida en varias PDET.
 */
export function GestionVeredasPdet() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const puedeImportar = puede("territorios.crear");
  const puedeEditar = puede("territorios.editar");

  const [veredas, setVeredas] = useState<VeredaPdet[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarVeredasPdet(token, {
        busqueda: busquedaAplicada || undefined,
        incluirInactivas,
        pagina,
        limite: LIMITE,
      });
      setVeredas(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar veredas PDET");
    } finally {
      setCargando(false);
    }
  }, [token, busquedaAplicada, incluirInactivas, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiarActivo(vereda: VeredaPdet) {
    if (!token) return;
    if (vereda.estaActivo) {
      const ok = await confirmarEliminacionSimple({
        titulo: "Desactivar vereda PDET",
        texto: `"${vereda.nombre}" dejará de aparecer en los formularios. Los beneficiarios que ya la tienen la conservan.`,
        textoConfirmar: "Sí, desactivar",
      });
      if (!ok) return;
    }
    try {
      await actualizarVeredaPdet(token, vereda.id, { estaActivo: !vereda.estaActivo });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <div className="space-y-4">
      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-ruralia-teal-border bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 font-semibold text-zinc-900">
            <IconoMapa className="h-4 w-4 text-ruralia-teal" />
            Veredas PDET
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            División de veredas en zonas PDET. No reemplaza la vereda DANE del
            beneficiario: se guardan las dos.
          </p>
        </div>
        {puedeImportar ? (
          <button
            type="button"
            onClick={() => setImportando(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            <Upload className="h-4 w-4" />
            Importar archivo
          </button>
        ) : null}
      </div>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setPagina(1);
              setBusquedaAplicada(busqueda.trim());
            }}
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ruralia-teal-muted" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código y presionar Enter"
              className={`${claseInput} pl-10`}
            />
          </form>
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={incluirInactivas}
              onChange={(e) => {
                setIncluirInactivas(e.target.checked);
                setPagina(1);
              }}
              className="h-4 w-4 accent-ruralia-teal"
            />
            Incluir inactivas
          </label>
        </div>

        {cargando ? (
          <Spinner />
        ) : veredas.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            No hay veredas PDET. Importa el archivo del cliente para cargarlas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-500">
                  <th className="py-2 pr-3">Vereda PDET</th>
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Municipio</th>
                  <th className="py-2 pr-3">Departamento</th>
                  <th className="py-2 pr-3">Vereda DANE equivalente</th>
                  <th className="py-2 pr-3">Subregión</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {veredas.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b border-zinc-100 hover:bg-ruralia-teal-soft/40 ${
                      v.estaActivo ? "" : "text-zinc-400"
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-medium">{v.nombre}</td>
                    <td className="py-2.5 pr-3 text-xs">{v.codigo}</td>
                    <td className="py-2.5 pr-3">{v.municipio?.nombre}</td>
                    <td className="py-2.5 pr-3">{v.municipio?.departamento?.nombre}</td>
                    <td className="py-2.5 pr-3">
                      {v.veredaDane ? (
                        <>
                          {v.veredaDane.nombre}
                          <span className="block text-xs text-zinc-400">{v.veredaDane.codigo}</span>
                        </>
                      ) : (
                        <span className="text-zinc-400">Sin equivalente</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">{v.subregion ?? "—"}</td>
                    <td className="py-2.5 text-right">
                      {puedeEditar ? (
                        <button
                          type="button"
                          onClick={() => void cambiarActivo(v)}
                          className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                        >
                          {v.estaActivo ? "Desactivar" : "Activar"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
            <span>
              Página {pagina} de {totalPaginas} · {total} veredas
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

      <ModalImportacion
        abierto={importando}
        onCerrar={() => setImportando(false)}
        onImportado={async (totales) => {
          setImportando(false);
          setExito(
            `Importación lista: ${totales.crear} nuevas, ${totales.actualizar} actualizadas, ${totales.errores} con error (omitidas).`,
          );
          setPagina(1);
          await cargar();
        }}
      />
    </div>
  );
}

function ModalImportacion({
  abierto,
  onCerrar,
  onImportado,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onImportado: (totales: TotalesImportacionPdet) => void;
}) {
  const { token } = useAuth();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analisis, setAnalisis] = useState<AnalisisVeredasPdet | null>(null);
  const [mapeo, setMapeo] = useState<MapeoVeredasPdet | null>(null);
  const [preview, setPreview] = useState<{
    filas: FilaPreviewPdet[];
    totales: TotalesImportacionPdet;
  } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) return;
    setArchivo(null);
    setAnalisis(null);
    setMapeo(null);
    setPreview(null);
    setError(null);
  }, [abierto]);

  async function ejecutar<T>(accion: () => Promise<T>): Promise<T | undefined> {
    setTrabajando(true);
    setError(null);
    try {
      return await accion();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo");
      return undefined;
    } finally {
      setTrabajando(false);
    }
  }

  async function elegirArchivo(nuevo: File | null) {
    setArchivo(nuevo);
    setAnalisis(null);
    setPreview(null);
    if (!nuevo || !token) return;
    const resultado = await ejecutar(() => analizarArchivoVeredasPdet(token, nuevo));
    if (resultado) {
      setAnalisis(resultado);
      setMapeo(resultado.mapeoSugerido);
    }
  }

  function cambiarColumna(campo: CampoMapeoPdet, columna: string) {
    setPreview(null);
    setMapeo((prev) => {
      if (!prev) return prev;
      const columnas = { ...prev.columnas };
      if (columna) columnas[campo] = Number(columna);
      else delete columnas[campo];
      return { ...prev, columnas };
    });
  }

  async function previsualizar() {
    if (!token || !archivo || !mapeo) return;
    const resultado = await ejecutar(() => previsualizarVeredasPdet(token, archivo, mapeo));
    if (resultado) setPreview(resultado);
  }

  async function importar() {
    if (!token || !archivo || !mapeo) return;
    const resultado = await ejecutar(() => importarVeredasPdet(token, archivo, mapeo));
    if (resultado) onImportado(resultado.totales);
  }

  const opcionesColumna = (analisis?.columnas ?? []).map((c) => ({
    id: String(c.columna),
    nombre: c.encabezado,
    subtitulo: c.muestras.length ? `Ej: ${c.muestras.join(", ")}` : undefined,
  }));

  return (
    <Modal titulo="Importar veredas PDET" abierto={abierto} onCerrar={onCerrar} ancho="xl">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm text-zinc-600">
            Excel (.xlsx) o CSV. No importa el orden ni el nombre de las
            columnas: después indicas qué columna es cada dato. Se actualiza por
            municipio y código, así que puedes volver a cargar el archivo.
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-4 py-4 text-sm text-zinc-700 hover:bg-ruralia-teal-soft/40">
            <FileUp className="h-5 w-5 text-ruralia-teal" />
            <span className="flex-1">{archivo ? archivo.name : "Elegir archivo"}</span>
            <input
              type="file"
              accept=".xlsx,.csv,text/csv"
              className="hidden"
              onChange={(e) => void elegirArchivo(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {trabajando && !analisis ? <Spinner /> : null}

        {analisis && mapeo ? (
          <div className="rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
            <p className="mb-3 text-sm font-semibold text-zinc-900">
              Columnas del archivo · {analisis.totalFilas} filas
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {analisis.campos.map((campo) => (
                <div key={campo.campo}>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    {campo.etiqueta}
                    {campo.obligatorio ? " *" : ""}
                  </label>
                  <SelectorDesplegable
                    value={mapeo.columnas[campo.campo] ? String(mapeo.columnas[campo.campo]) : ""}
                    onChange={(id) => cambiarColumna(campo.campo, id)}
                    opciones={opcionesColumna}
                    permitirVacio
                    etiquetaVacio="No está en el archivo"
                    placeholder="No está en el archivo"
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              El municipio se reconoce por su código DANE o por su nombre (con el
              departamento si hay nombres repetidos). Sin código PDET, se genera
              uno a partir del nombre.
            </p>
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-ruralia-teal px-2.5 py-1 text-white">
                {preview.totales.crear} nuevas
              </span>
              <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-ruralia-teal-text">
                {preview.totales.actualizar} se actualizan
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
                {preview.totales.sinCambios} sin cambios
              </span>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
                {preview.totales.errores} con error
              </span>
            </div>
            <div className="max-h-80 overflow-auto rounded-2xl border border-zinc-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="px-3 py-2">Fila</th>
                    <th className="px-3 py-2">Vereda PDET</th>
                    <th className="px-3 py-2">Municipio</th>
                    <th className="px-3 py-2">Vereda DANE</th>
                    <th className="px-3 py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.filas.map((f) => (
                    <tr key={f.fila} className="border-b border-zinc-100 align-top">
                      <td className="px-3 py-2 text-zinc-500">{f.fila}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-zinc-900">{f.nombre || "—"}</span>
                        <span className="block text-zinc-400">{f.codigo}</span>
                      </td>
                      <td className="px-3 py-2">
                        {f.municipio ? `${f.municipio.nombre} (${f.municipio.departamento})` : "—"}
                      </td>
                      <td className="px-3 py-2">{f.veredaDane?.nombre ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${CLASE_ACCION[f.accion]}`}>
                          {ETIQUETA_ACCION[f.accion]}
                        </span>
                        {f.errores.map((e) => (
                          <span key={e} className="mt-1 block text-red-600">
                            {e}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          {!preview ? (
            <button
              type="button"
              onClick={() => void previsualizar()}
              disabled={!analisis || trabajando}
              className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              {trabajando ? "Revisando…" : "Revisar antes de importar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void importar()}
              disabled={trabajando || preview.totales.crear + preview.totales.actualizar === 0}
              className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              {trabajando
                ? "Importando…"
                : `Importar ${preview.totales.crear + preview.totales.actualizar} veredas`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
