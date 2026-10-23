"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  construirMapeo,
  destinosIniciales,
  MapeoColumnasExcel,
  problemasDelMapeo,
  type DestinosPorColumna,
} from "@/components/proyectos/mapeo-columnas-excel";
import {
  analizarBeneficiariosExcel,
  descargarPlantillaBeneficiarios,
  descargarPlantillaBeneficiariosCatalogo,
  listarVeredas,
  previsualizarBeneficiariosExcel,
  type FilaExcelBeneficiarioPreview,
} from "@/lib/api";
import type {
  AnalisisExcelBeneficiarios,
  CambioDatoBeneficiario,
  MapeoColumnasExcel as MapeoColumnas,
  ResultadoFilaCargaBeneficiario,
} from "@/lib/types";

const MENSAJE_SOLO_XLSX =
  'El archivo debe ser Excel .xlsx. Si es .xls (Excel 97-2003), ábrelo en Excel y usa "Guardar como" > "Libro de Excel (.xlsx)".';

export interface VeredaCargaOpcion {
  id: string;
  nombre: string;
  subtitulo?: string;
}

function etiquetaGenero(genero: string): string {
  if (genero === "MASCULINO") return "M";
  if (genero === "FEMENINO") return "F";
  return genero;
}

function motivoFilaOmitida(fila: FilaExcelBeneficiarioPreview): string | null {
  const nombre = [fila.nombres, fila.apellidos].filter(Boolean).join(" ").trim();
  const quien = nombre || "Sin nombre";
  if (!fila.identificador && !fila.nombres) {
    return `Fila ${fila.fila}: faltan la cédula y el nombre`;
  }
  if (!fila.identificador) {
    return `${quien} (fila ${fila.fila}): falta la cédula`;
  }
  if (!fila.nombres) {
    return `Fila ${fila.fila}, cédula ${fila.identificador}: falta el nombre`;
  }
  return null;
}

function ListaCambios({ cambios }: { cambios: CambioDatoBeneficiario[] }) {
  return (
    <ul className="mt-1 space-y-0.5 text-xs text-amber-900">
      {cambios.map((cambio) => (
        <li key={cambio.campo} className="flex flex-wrap items-center gap-1">
          <span className="font-medium">{cambio.etiqueta}:</span>
          <span className="text-amber-800/80">{cambio.antes ?? "(vacío)"}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span>{cambio.despues ?? "(vacío)"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Personas que ya existían: no se duplican, se sobrescriben sus datos. */
function AvisoActualizaciones({
  personas,
  titulo,
}: {
  personas: Array<{
    clave: string;
    nombre: string;
    identificador: string;
    cambios: CambioDatoBeneficiario[];
  }>;
  titulo: string;
}) {
  if (!personas.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <RefreshCw className="h-4 w-4 shrink-0" />
        {titulo}
      </p>
      <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto">
        {personas.map((persona) => (
          <li key={persona.clave} className="text-sm text-amber-950">
            <p className="font-medium">
              {persona.nombre} · {persona.identificador}
            </p>
            <ListaCambios cambios={persona.cambios} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AvisosCargaBeneficiarios({
  detalle,
}: {
  detalle: ResultadoFilaCargaBeneficiario[];
}) {
  const errores = detalle.filter((fila) => fila.resultado === "error");
  const actualizadas = detalle.filter((fila) => fila.cambios?.length);
  if (!errores.length && !actualizadas.length) return null;
  return (
    <div className="mt-3 space-y-3">
      <AvisoActualizaciones
        titulo={
          actualizadas.length === 1
            ? "Esta persona ya existía y se actualizaron sus datos"
            : `Estas ${actualizadas.length} personas ya existían y se actualizaron sus datos`
        }
        personas={actualizadas.map((fila) => ({
          clave: `${fila.fila}-${fila.identificador}`,
          nombre: `${fila.nombres} ${fila.apellidos}`.trim(),
          identificador: fila.identificador,
          cambios: fila.cambios ?? [],
        }))}
      />
      {errores.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-800">
            No se {errores.length === 1 ? "pudo agregar este registro" : `pudieron agregar estos ${errores.length} registros`}
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm text-red-900">
            {errores.map((fila) => (
              <li key={`${fila.fila}-${fila.identificador}-${fila.nombres}`}>
                {fila.mensaje ?? `Fila ${fila.fila}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

interface CargaExcelBeneficiariosProps {
  token: string;
  archivo: File | null;
  onArchivo: (archivo: File | null) => void;
  disabled?: boolean;
  onImportar?: (
    archivo: File,
    veredaId: string,
    totalPersonas: number,
    mapeo: MapeoColumnas,
  ) => Promise<void>;
  importando?: boolean;
  contexto?: "proyecto" | "catalogo";
  /** Si ya existe, se reutilizan los datos adicionales que el proyecto tiene de cargas anteriores. */
  proyectoId?: string;
  /** Veredas DANE ya vinculadas. En el catálogo se buscan al confirmar. */
  veredas?: VeredaCargaOpcion[];
  /** "boton": solo un botón compacto; plantilla y selección de archivo van en un modal. */
  variante?: "panel" | "boton";
}

export function CargaExcelBeneficiarios({
  token,
  disabled,
  onImportar,
  importando,
  contexto = "proyecto",
  proyectoId,
  veredas = [],
  variante = "panel",
}: CargaExcelBeneficiariosProps) {
  const [modalInicioAbierto, setModalInicioAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivoLocal, setArchivoLocal] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisExcelBeneficiarios | null>(
    null,
  );
  const [destinos, setDestinos] = useState<DestinosPorColumna>({});
  const [mapeo, setMapeo] = useState<MapeoColumnas | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [filas, setFilas] = useState<FilaExcelBeneficiarioPreview[]>([]);
  const [veredaId, setVeredaId] = useState("");
  const [busquedaVereda, setBusquedaVereda] = useState("");
  const [veredasBuscadas, setVeredasBuscadas] = useState<VeredaCargaOpcion[]>(
    [],
  );
  const [buscandoVereda, setBuscandoVereda] = useState(false);

  const opcionesVereda = contexto === "proyecto" ? veredas : veredasBuscadas;

  useEffect(() => {
    if (!revisando || contexto === "proyecto") return;
    const termino = busquedaVereda.trim();
    let cancelado = false;
    setBuscandoVereda(true);
    const timer = setTimeout(() => {
      void listarVeredas(token, {
        busqueda: termino || undefined,
        soloDane: true,
        limite: 5,
      })
        .then((respuesta) => {
          if (cancelado) return;
          setVeredasBuscadas(
            respuesta.datos.map((vereda) => ({
              id: vereda.id,
              nombre: vereda.nombre,
              subtitulo: [vereda.municipioNombre, vereda.departamentoNombre]
                .filter(Boolean)
                .join(", "),
            })),
          );
        })
        .catch(() => {
          if (!cancelado) setVeredasBuscadas([]);
        })
        .finally(() => {
          if (!cancelado) setBuscandoVereda(false);
        });
    }, termino ? 300 : 0);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [busquedaVereda, contexto, revisando, token]);

  async function descargarPlantilla() {
    setError(null);
    setDescargando(true);
    try {
      await (contexto === "catalogo"
        ? descargarPlantillaBeneficiariosCatalogo(token)
        : descargarPlantillaBeneficiarios(token));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar la plantilla",
      );
    } finally {
      setDescargando(false);
    }
  }

  function reiniciar() {
    setArchivoLocal(null);
    setAnalisis(null);
    setDestinos({});
    setMapeo(null);
    setFilas([]);
    setVeredaId("");
    setBusquedaVereda("");
    setVeredasBuscadas([]);
  }

  async function abrirArchivo(file: File) {
    setModalInicioAbierto(false);
    setError(null);
    reiniciar();
    setArchivoLocal(file);
    setAnalizando(true);
    try {
      const resultado = await analizarBeneficiariosExcel(
        token,
        file,
        contexto,
        proyectoId,
      );
      if (!resultado.totalFilas) {
        setError("El archivo no tiene personas para cargar");
        setArchivoLocal(null);
        return;
      }
      setAnalisis(resultado);
      setDestinos(destinosIniciales(resultado));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el Excel",
      );
      setArchivoLocal(null);
    } finally {
      setAnalizando(false);
    }
  }

  async function abrirRevision() {
    if (!archivoLocal || !analisis) return;
    const mapeoElegido = construirMapeo(analisis, destinos);
    setMapeo(mapeoElegido);
    setError(null);
    setFilas([]);
    setRevisando(true);
    setLeyendo(true);
    try {
      const preview = await previsualizarBeneficiariosExcel(
        token,
        archivoLocal,
        contexto,
        mapeoElegido,
        proyectoId,
      );
      if (!preview.length) {
        setError("El archivo no tiene personas para cargar");
        setRevisando(false);
        return;
      }
      setFilas(preview);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el Excel",
      );
      setRevisando(false);
    } finally {
      setLeyendo(false);
    }
  }

  function cerrarMapeo() {
    if (revisando) return;
    reiniciar();
  }

  /** Vuelve a la asignación de columnas sin perder lo elegido. */
  function volverAColumnas() {
    if (importando) return;
    setRevisando(false);
    setFilas([]);
  }

  function cerrarRevision() {
    if (importando) return;
    setRevisando(false);
    reiniciar();
  }

  const pideVereda = filas.some((fila) => !fila.municipio?.trim());
  const omitidas = filas
    .map((fila) => motivoFilaOmitida(fila))
    .filter((motivo): motivo is string => motivo !== null);

  const personasAVincular = filas.filter(
    (fila) => motivoFilaOmitida(fila) === null,
  ).length;
  const existentes = filas.filter(
    (fila) => fila.yaExiste && motivoFilaOmitida(fila) === null,
  );
  const conCambios = existentes.filter((fila) => fila.cambios?.length);
  const extrasDelMapeo = (mapeo?.columnas ?? []).flatMap((columna) =>
    columna.destino === "extra" ? [columna.etiqueta] : [],
  );
  const problemasMapeo = problemasDelMapeo(destinos);

  async function confirmar() {
    if (!archivoLocal || !onImportar || !mapeo) return;
    if (pideVereda && !veredaId) return;
    if (!personasAVincular) return;
    await onImportar(archivoLocal, veredaId, personasAVincular, mapeo);
    setRevisando(false);
    reiniciar();
  }

  const ayuda = (
    <p className="text-xs text-zinc-500">
      Sirve la plantilla de la matriz o cualquier Excel: después de elegirlo
      indicas qué es cada columna, y las que no existan en la ficha se guardan
      como datos adicionales. Elegir el archivo no guarda nada: primero revisas
      la lista.
      {contexto === "proyecto"
        ? " La cédula es la clave: si la persona no existe se crea, y si ya está en la base no se duplica, se actualizan sus datos y se vincula a este proyecto."
        : " La cédula es la clave: si ya existe, no se duplica el registro y se actualizan sus datos."}
    </p>
  );

  const acciones = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled || descargando}
        onClick={() => void descargarPlantilla()}
        className="rounded-lg border border-ruralia-teal-border bg-white px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft disabled:opacity-50"
      >
        {descargando ? "Descargando…" : "Descargar plantilla"}
      </button>
      <button
        type="button"
        disabled={disabled || !onImportar || analizando}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
      >
        {analizando ? "Leyendo…" : "Elegir archivo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!file) return;
          if (!/\.xlsx$/i.test(file.name)) {
            setError(MENSAJE_SOLO_XLSX);
            return;
          }
          void abrirArchivo(file);
        }}
      />
    </div>
  );

  const mensajeError =
    error && !revisando && !analisis ? (
      <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </p>
    ) : null;

  return (
    <>
      {variante === "boton" ? (
        <>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setError(null);
              setModalInicioAbierto(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-ruralia-teal" />
            Carga masiva
          </button>
          <Modal
            abierto={modalInicioAbierto}
            onCerrar={() => setModalInicioAbierto(false)}
            titulo="Carga masiva por Excel"
          >
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                <li>Usa la plantilla de la matriz o el Excel que ya tienes, con cualquier formato.</li>
                <li>Indica qué es cada columna: las que no están en la ficha quedan como datos adicionales.</li>
                <li>Revisa la lista y confirma la carga.</li>
              </ol>
              {ayuda}
              {acciones}
              {mensajeError}
            </div>
          </Modal>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-ruralia-teal-border bg-ruralia-teal-soft/20 p-4">
          <p className="text-sm font-medium text-zinc-800">Carga masiva (Excel)</p>
          <div className="mt-1">{ayuda}</div>
          <div className="mt-3">{acciones}</div>
          {mensajeError ? <div className="mt-2">{mensajeError}</div> : null}
        </div>
      )}

      <Modal
        abierto={!!analisis && !revisando}
        onCerrar={cerrarMapeo}
        titulo="¿Qué trae cada columna?"
        ancho="xl"
      >
        {analisis ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              {archivoLocal?.name ?? "Archivo"} · hoja {analisis.hoja} ·{" "}
              {analisis.totalFilas.toLocaleString("es-CO")}{" "}
              {analisis.totalFilas === 1 ? "fila" : "filas"} con datos. Los
              títulos se tomaron de la fila {analisis.filaEncabezado}. Revisa
              la propuesta y corrige lo que no corresponda.
            </p>
            <MapeoColumnasExcel
              analisis={analisis}
              destinos={destinos}
              onChange={setDestinos}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cerrarMapeo}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={problemasMapeo.length > 0}
                onClick={() => void abrirRevision()}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                Ver personas
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        abierto={revisando}
        onCerrar={cerrarRevision}
        titulo="La carga todavía no se guarda"
        ancho="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            {archivoLocal ? archivoLocal.name : "Archivo"} tiene{" "}
            {leyendo ? "…" : filas.length}{" "}
            {filas.length === 1 ? "persona" : "personas"}.
            {leyendo
              ? ""
              : pideVereda
                ? " Elige la vereda y confirma para darlas de alta."
                : " El municipio viene en el archivo. Confirma para darlas de alta."}
          </p>
          {leyendo ? (
            <p className="text-sm text-zinc-500">Leyendo el archivo…</p>
          ) : (
            <>
              {extrasDelMapeo.length ? (
                <p className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3 text-sm text-ruralia-teal-text">
                  Además se guardarán {extrasDelMapeo.length}{" "}
                  {extrasDelMapeo.length === 1
                    ? "dato adicional"
                    : "datos adicionales"}
                  : {extrasDelMapeo.join(", ")}.
                </p>
              ) : null}
              {existentes.length ? (
                <p className="text-sm text-zinc-600">
                  {existentes.length === 1
                    ? "1 persona ya está en la plataforma"
                    : `${existentes.length.toLocaleString("es-CO")} personas ya están en la plataforma`}
                  : no se duplican.
                  {conCambios.length
                    ? ` A ${conCambios.length.toLocaleString("es-CO")} se les van a modificar datos.`
                    : " Sus datos no cambian."}
                </p>
              ) : null}
              <AvisoActualizaciones
                titulo={
                  conCambios.length === 1
                    ? "Esta persona ya existe y se van a modificar sus datos"
                    : `Estas ${conCambios.length} personas ya existen y se van a modificar sus datos`
                }
                personas={conCambios.map((fila) => ({
                  clave: `${fila.fila}-${fila.identificador}`,
                  nombre: `${fila.nombres} ${fila.apellidos}`.trim(),
                  identificador: fila.identificador,
                  cambios: fila.cambios ?? [],
                }))}
              />
              {omitidas.length ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-800">
                    {omitidas.length === 1
                      ? "Este registro no se va a agregar"
                      : `Estos ${omitidas.length} registros no se van a agregar`}
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-red-900">
                    {omitidas.map((motivo) => (
                      <li key={motivo}>{motivo}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <ul className="max-h-52 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
                {filas.map((fila) => {
                  const omitida = motivoFilaOmitida(fila);
                  return (
                    <li
                      key={`${fila.fila}-${fila.identificador}`}
                      className={`px-3 py-2 ${omitida ? "bg-red-50" : ""}`}
                    >
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900">
                        {fila.nombres || "Sin nombre"} {fila.apellidos}
                        {!omitida && fila.yaExiste ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {fila.cambios?.length ? "Ya existe · se actualiza" : "Ya existe"}
                          </span>
                        ) : null}
                      </p>
                      <p className={`text-xs ${omitida ? "text-red-700" : "text-zinc-500"}`}>
                        {omitida ?? (
                          <>
                            {fila.tipoDocumento} {fila.identificador}
                            {fila.genero ? ` · ${etiquetaGenero(fila.genero)}` : ""}
                            {fila.edad != null ? ` · ${fila.edad} años` : ""}
                            {fila.telefono ? ` · ${fila.telefono}` : ""}
                            {fila.municipio ? ` · ${fila.municipio}` : ""}
                            {fila.nombreAsociacion ? ` · ${fila.nombreAsociacion}` : ""}
                            {fila.lineaProductiva ? ` · ${fila.lineaProductiva}` : ""}
                            {fila.extras && Object.keys(fila.extras).length
                              ? ` · +${Object.keys(fila.extras).length} adicionales`
                              : ""}
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {contexto === "catalogo" && pideVereda ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                Buscar vereda DANE
              </label>
              <input
                type="search"
                value={busquedaVereda}
                onChange={(e) => setBusquedaVereda(e.target.value)}
                placeholder="Nombre, municipio o código"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
              />
              {buscandoVereda ? (
                <p className="mt-1 text-xs text-zinc-500">Buscando…</p>
              ) : null}
            </div>
          ) : null}

          {pideVereda ? (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Vereda DANE *
            </span>
            {opcionesVereda.length === 0 ? (
              <p className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-400">
                {contexto === "proyecto"
                  ? "Este proyecto no tiene veredas DANE vinculadas"
                  : busquedaVereda.trim()
                    ? "Sin veredas DANE con ese nombre"
                    : "No hay veredas DANE"}
              </p>
            ) : (
              <ul className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
                {opcionesVereda.map((opcion) => {
                  const activa = opcion.id === veredaId;
                  return (
                    <li key={opcion.id}>
                      <button
                        type="button"
                        onClick={() => setVeredaId(opcion.id)}
                        className={`flex w-full flex-col px-4 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft ${
                          activa ? "bg-ruralia-teal-soft/70" : ""
                        }`}
                      >
                        <span
                          className={`font-medium ${
                            activa ? "text-ruralia-teal-text" : "text-zinc-900"
                          }`}
                        >
                          {opcion.nombre}
                        </span>
                        {opcion.subtitulo ? (
                          <span className="text-xs text-zinc-500">
                            {opcion.subtitulo}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={volverAColumnas}
              disabled={importando || leyendo}
              className="mr-auto rounded-xl px-3 py-2 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
            >
              Volver a columnas
            </button>
            <button
              type="button"
              onClick={cerrarRevision}
              disabled={importando}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                (pideVereda && !veredaId) ||
                importando ||
                leyendo ||
                personasAVincular === 0
              }
              onClick={() => void confirmar()}
              className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              {importando ? "Cargando…" : "Confirmar carga"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
