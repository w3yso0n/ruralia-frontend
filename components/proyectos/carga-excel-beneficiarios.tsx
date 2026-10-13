"use client";

import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  descargarPlantillaBeneficiarios,
  descargarPlantillaBeneficiariosCatalogo,
  listarVeredas,
  previsualizarBeneficiariosExcel,
  type FilaExcelBeneficiarioPreview,
} from "@/lib/api";
import type { ResultadoFilaCargaBeneficiario } from "@/lib/types";

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

export function AvisosCargaBeneficiarios({
  detalle,
}: {
  detalle: ResultadoFilaCargaBeneficiario[];
}) {
  const errores = detalle.filter((fila) => fila.resultado === "error");
  if (!errores.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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
  ) => Promise<void>;
  importando?: boolean;
  contexto?: "proyecto" | "catalogo";
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
  veredas = [],
  variante = "panel",
}: CargaExcelBeneficiariosProps) {
  const [modalInicioAbierto, setModalInicioAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [archivoLocal, setArchivoLocal] = useState<File | null>(null);
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
    if (termino.length < 2) {
      setVeredasBuscadas([]);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(() => {
      setBuscandoVereda(true);
      void listarVeredas(token, {
        busqueda: termino,
        soloDane: true,
        limite: 30,
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
    }, 300);
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

  async function abrirRevision(file: File) {
    setModalInicioAbierto(false);
    setError(null);
    setArchivoLocal(file);
    setFilas([]);
    setVeredaId("");
    setBusquedaVereda("");
    setVeredasBuscadas([]);
    setRevisando(true);
    setLeyendo(true);
    try {
      const preview = await previsualizarBeneficiariosExcel(
        token,
        file,
        contexto,
      );
      if (!preview.length) {
        setError("El archivo no tiene personas para cargar");
        setRevisando(false);
        setArchivoLocal(null);
        return;
      }
      setFilas(preview);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo leer el Excel",
      );
      setRevisando(false);
      setArchivoLocal(null);
    } finally {
      setLeyendo(false);
    }
  }

  function cerrarRevision() {
    if (importando) return;
    setRevisando(false);
    setArchivoLocal(null);
    setFilas([]);
    setVeredaId("");
  }

  const pideVereda = filas.some((fila) => !fila.municipio?.trim());
  const omitidas = filas
    .map((fila) => motivoFilaOmitida(fila))
    .filter((motivo): motivo is string => motivo !== null);

  const personasAVincular = filas.filter(
    (fila) => motivoFilaOmitida(fila) === null,
  ).length;

  async function confirmar() {
    if (!archivoLocal || !onImportar) return;
    if (pideVereda && !veredaId) return;
    if (!personasAVincular) return;
    await onImportar(archivoLocal, veredaId, personasAVincular);
    setRevisando(false);
    setArchivoLocal(null);
    setFilas([]);
    setVeredaId("");
  }

  const ayuda = (
    <p className="text-xs text-zinc-500">
      La plantilla trae las columnas de la matriz: cédula, nombres, apellidos,
      sexo, edad, contacto, asociación, municipio, línea productiva y estado.
      Elegir el archivo no guarda nada: primero revisas la lista.
      {contexto === "proyecto"
        ? " La cédula es la clave: si la persona no existe se crea, y si ya está en la base no se duplica pero sí se vincula a este proyecto."
        : " La cédula es la clave: si ya existe, no se duplica el registro."}
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
        disabled={disabled || !onImportar}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
      >
        Elegir archivo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (file) void abrirRevision(file);
        }}
      />
    </div>
  );

  const mensajeError =
    error && !revisando ? (
      <p className="text-sm text-red-600">{error}</p>
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
                <li>Descarga la plantilla de la matriz y llénala, o usa el Excel que ya tienes con esas columnas.</li>
                <li>Elige el archivo: verás la lista antes de guardar.</li>
                <li>Confirma la carga. El municipio va en cada fila.</li>
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
                      <p className="text-sm font-medium text-zinc-900">
                        {fila.nombres || "Sin nombre"} {fila.apellidos}
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
                  : busquedaVereda.trim().length < 2
                    ? "Escribe al menos 2 letras para buscar"
                    : "Sin veredas DANE con ese nombre"}
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

          <div className="flex justify-end gap-2">
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
