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

export interface VeredaCargaOpcion {
  id: string;
  nombre: string;
  subtitulo?: string;
}

interface CargaExcelBeneficiariosProps {
  token: string;
  archivo: File | null;
  onArchivo: (archivo: File | null) => void;
  disabled?: boolean;
  onImportar?: (archivo: File, veredaId: string) => Promise<void>;
  importando?: boolean;
  contexto?: "proyecto" | "catalogo";
  /** Veredas DANE ya vinculadas. En el catálogo se buscan al confirmar. */
  veredas?: VeredaCargaOpcion[];
  /** "boton": solo un botón compacto; plantilla y selección de archivo van en un modal. */
  variante?: "panel" | "boton";
}

export function CargaExcelBeneficiarios({
  token,
  onArchivo,
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
    onArchivo(null);
  }

  async function confirmar() {
    if (!archivoLocal || !onImportar || !veredaId) return;
    await onImportar(archivoLocal, veredaId);
    setRevisando(false);
    setArchivoLocal(null);
    setFilas([]);
    setVeredaId("");
    onArchivo(null);
  }

  const ayuda = (
    <p className="text-xs text-zinc-500">
      Obligatorios: <strong>nombres</strong> e <strong>identificador</strong>.
      Elegir el archivo no guarda nada: en el mismo paso revisas las personas y
      eliges la vereda DANE.
      {contexto === "proyecto"
        ? " Solo aparecen las veredas DANE ya vinculadas a este proyecto."
        : " Si el documento ya existe y está activo, no se duplica."}
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
                <li>Descarga la plantilla y llénala con las personas.</li>
                <li>Elige el archivo: verás la lista antes de guardar.</li>
                <li>Selecciona la vereda DANE y confirma la carga.</li>
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
            {filas.length === 1 ? "persona" : "personas"}. Elige la vereda y
            confirma para darlas de alta.
          </p>
          {leyendo ? (
            <p className="text-sm text-zinc-500">Leyendo el archivo…</p>
          ) : (
            <ul className="max-h-52 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
              {filas.map((fila) => (
                <li key={`${fila.fila}-${fila.identificador}`} className="px-3 py-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {fila.nombres} {fila.apellidos}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {fila.tipoDocumento} {fila.identificador}
                    {fila.telefono ? ` · ${fila.telefono}` : ""}
                    {fila.correo ? ` · ${fila.correo}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {contexto === "catalogo" ? (
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
              disabled={!veredaId || importando || leyendo}
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
