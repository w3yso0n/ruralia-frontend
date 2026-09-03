"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import { PadFirma } from "@/components/proyectos/gestion-proyecto/pad-firma";
import {
  descargarPdfAsistenciaJornada,
  eliminarEnvioFormulario,
  enviarFormulario,
  listarEnviosPorJornada,
  listarPlantillasPorJornada,
  obtenerRespuestasEnvio,
} from "@/lib/api";
import type {
  CampoFormulario,
  ColumnaCampoTabla,
  Jornada,
  PlantillaFormulario,
  RespuestaFormularioDetalle,
  TipoCampoColumnaTabla,
  TipoCampoFormulario,
} from "@/lib/types";

interface FilaAsistencia {
  indiceFila: number;
  envioId?: string;
  valores: Record<string, unknown>;
  firmandoClave?: string | null;
}

interface ControlAsistenciaJornadaProps {
  token: string;
  jornada: Jornada;
  puedeEditar: boolean;
  onCambio?: () => void;
}

function valorDesdeRespuesta(r: RespuestaFormularioDetalle): unknown {
  if (r.tipoCampo === "TABLA") {
    const json = r.valorJson as { filas?: Record<string, unknown>[] } | null;
    if (json && Array.isArray(json.filas)) return json;
    return { filas: [] };
  }
  if (r.valorTexto != null) return r.valorTexto;
  if (r.valorNumero != null) return r.valorNumero;
  if (r.valorFecha != null) return r.valorFecha;
  if (r.valorBooleano != null) return r.valorBooleano;
  if (r.urlArchivo != null) return r.urlArchivo;
  if (r.valorJson != null) return r.valorJson;
  return "";
}

function valoresIniciales(campos: CampoFormulario[]): Record<string, unknown> {
  const mapa: Record<string, unknown> = {};
  for (const c of campos) {
    mapa[c.clave] = c.tipoCampo === "SI_NO" ? false : "";
  }
  return mapa;
}

function columnasDeTabla(campo: CampoFormulario): ColumnaCampoTabla[] {
  const columnas = (campo.opciones as { columnas?: ColumnaCampoTabla[] } | undefined)
    ?.columnas;
  if (!Array.isArray(columnas)) return [];

  const usadas = new Set<string>();
  return columnas.map((col, indice) => {
    const base =
      (col.clave && col.clave.trim()) ||
      col.etiqueta
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") ||
      `col_${indice + 1}`;

    // Si la clave quedó en 1 letra (bug al escribir etiqueta) o hay colisión,
    // regenerar desde la etiqueta completa.
    const desdeEtiqueta =
      col.etiqueta
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || `col_${indice + 1}`;

    let clave =
      base.length <= 1 && desdeEtiqueta.length > 1 ? desdeEtiqueta : base;

    let unica = clave;
    let n = 2;
    while (usadas.has(unica)) {
      unica = `${desdeEtiqueta}_${n}`;
      n += 1;
    }
    usadas.add(unica);
    return { ...col, clave: unica };
  });
}

/** Reescribe filas guardadas con claves viejas/colisionadas hacia las columnas normalizadas. */
function remapearFilasTabla(
  filas: Record<string, unknown>[],
  columnasOriginales: ColumnaCampoTabla[],
  columnasNorm: ColumnaCampoTabla[],
): Record<string, unknown>[] {
  return filas.map((fila) => {
    const nueva: Record<string, unknown> = {};
    columnasNorm.forEach((col, i) => {
      const orig = columnasOriginales[i];
      const candidatos = [col.clave, orig?.clave].filter(Boolean) as string[];
      let valor: unknown = "";
      for (const c of candidatos) {
        if (fila[c] !== undefined && fila[c] !== "") {
          valor = fila[c];
          break;
        }
      }
      // Si varias columnas compartían la misma clave vieja, solo la de FIRMA
      // debe quedarse con data URLs de imagen.
      if (
        typeof valor === "string" &&
        valor.startsWith("data:image") &&
        col.tipoCampo !== "FIRMA"
      ) {
        valor = "";
      }
      nueva[col.clave] =
        valor === "" && col.tipoCampo === "SI_NO" ? false : valor;
    });
    return nueva;
  });
}

function filaTablaVacia(columnas: ColumnaCampoTabla[]): Record<string, unknown> {
  const mapa: Record<string, unknown> = {};
  for (const col of columnas) {
    mapa[col.clave] = col.tipoCampo === "SI_NO" ? false : "";
  }
  return mapa;
}

function ControlAsistenciaLegacy({
  token,
  jornada,
  puedeEditar,
  onCambio,
  plantilla,
}: ControlAsistenciaJornadaProps & { plantilla: PlantillaFormulario }) {
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoFila, setGuardandoFila] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campos = useMemo(
    () =>
      (plantilla.campos ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden),
    [plantilla],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const envios = await listarEnviosPorJornada(token, jornada.id);
      const delGrupo = envios.filter(
        (e) =>
          !e.plantillaFormularioId ||
          e.plantillaFormularioId === plantilla.id,
      );

      const filasCargadas: FilaAsistencia[] = [];
      for (const envio of delGrupo.sort(
        (a, b) => a.indiceFila - b.indiceFila,
      )) {
        const respuestas = await obtenerRespuestasEnvio(token, envio.id);
        const valores = valoresIniciales(plantilla.campos ?? []);
        for (const r of respuestas) {
          valores[r.claveCampo] = valorDesdeRespuesta(r);
        }
        filasCargadas.push({
          indiceFila: envio.indiceFila,
          envioId: envio.id,
          valores,
        });
      }
      setFilas(filasCargadas);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asistencia",
      );
    } finally {
      setCargando(false);
    }
  }, [token, jornada.id, plantilla]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function agregarFila() {
    const siguiente =
      filas.length > 0
        ? Math.max(...filas.map((f) => f.indiceFila)) + 1
        : 0;
    setFilas((prev) => [
      ...prev,
      { indiceFila: siguiente, valores: valoresIniciales(campos) },
    ]);
  }

  function actualizarValor(
    indiceFila: number,
    clave: string,
    valor: unknown,
  ) {
    setFilas((prev) =>
      prev.map((f) =>
        f.indiceFila === indiceFila
          ? { ...f, valores: { ...f.valores, [clave]: valor } }
          : f,
      ),
    );
  }

  async function guardarFila(fila: FilaAsistencia) {
    setGuardandoFila(fila.indiceFila);
    setError(null);
    try {
      const respuestas = campos.map((c) => ({
        claveCampo: c.clave,
        valor: fila.valores[c.clave] ?? null,
      }));
      const envio = await enviarFormulario(token, {
        jornadaId: jornada.id,
        plantillaFormularioId: plantilla.id,
        indiceFila: fila.indiceFila,
        respuestas,
      });
      setFilas((prev) =>
        prev.map((f) =>
          f.indiceFila === fila.indiceFila
            ? { ...f, envioId: envio.id }
            : f,
        ),
      );
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar fila");
    } finally {
      setGuardandoFila(null);
    }
  }

  async function quitarFila(fila: FilaAsistencia) {
    if (!confirm("¿Quitar este asistente de la lista?")) return;
    setError(null);
    try {
      if (fila.envioId) {
        await eliminarEnvioFormulario(token, fila.envioId);
      }
      setFilas((prev) => prev.filter((f) => f.indiceFila !== fila.indiceFila));
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al quitar fila");
    }
  }

  async function descargarPdf() {
    setDescargando(true);
    setError(null);
    try {
      const blob = await descargarPdfAsistenciaJornada(token, jornada.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencia-${jornada.fecha.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el PDF",
      );
    } finally {
      setDescargando(false);
    }
  }

  function renderCampo(campo: CampoFormulario, fila: FilaAsistencia) {
    const valor = fila.valores[campo.clave];
    const id = `${fila.indiceFila}-${campo.clave}`;

    if (campo.tipoCampo === "FIRMA") {
      const dataUrl = typeof valor === "string" ? valor : "";
      if (fila.firmandoClave === campo.clave) {
        return (
          <PadFirma
            valorInicial={dataUrl || null}
            onCancelar={() =>
              setFilas((prev) =>
                prev.map((f) =>
                  f.indiceFila === fila.indiceFila
                    ? { ...f, firmandoClave: null }
                    : f,
                ),
              )
            }
            onGuardar={(firma) => {
              actualizarValor(fila.indiceFila, campo.clave, firma);
              setFilas((prev) =>
                prev.map((f) =>
                  f.indiceFila === fila.indiceFila
                    ? { ...f, firmandoClave: null }
                    : f,
                ),
              );
            }}
          />
        );
      }
      return (
        <div className="flex flex-wrap items-center gap-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`Firma ${campo.etiqueta}`}
              className="h-10 w-24 rounded border border-zinc-100 bg-white object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-400">Sin firma</span>
          )}
          {puedeEditar ? (
            <button
              type="button"
              onClick={() =>
                setFilas((prev) =>
                  prev.map((f) =>
                    f.indiceFila === fila.indiceFila
                      ? { ...f, firmandoClave: campo.clave }
                      : f,
                  ),
                )
              }
              className="text-xs font-semibold text-ruralia-teal-text hover:underline"
            >
              {dataUrl ? "Refirmar" : "Firmar"}
            </button>
          ) : null}
        </div>
      );
    }

    switch (campo.tipoCampo) {
      case "SI_NO":
        return (
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(valor)}
              disabled={!puedeEditar}
              onChange={(e) =>
                actualizarValor(fila.indiceFila, campo.clave, e.target.checked)
              }
            />
            Sí
          </label>
        );
      case "NUMERO":
        return (
          <input
            id={id}
            type="number"
            disabled={!puedeEditar}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
            value={valor === "" || valor == null ? "" : String(valor)}
            onChange={(e) =>
              actualizarValor(
                fila.indiceFila,
                campo.clave,
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
          />
        );
      case "FECHA":
        return (
          <input
            id={id}
            type="date"
            disabled={!puedeEditar}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
            value={typeof valor === "string" ? valor.slice(0, 10) : ""}
            onChange={(e) =>
              actualizarValor(fila.indiceFila, campo.clave, e.target.value)
            }
          />
        );
      default:
        return (
          <input
            id={id}
            type="text"
            disabled={!puedeEditar}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
            value={typeof valor === "string" ? valor : String(valor ?? "")}
            onChange={(e) =>
              actualizarValor(fila.indiceFila, campo.clave, e.target.value)
            }
          />
        );
    }
  }

  if (cargando) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando asistencia…</p>;
  }

  return (
    <div className="mt-4 space-y-4">
      <CabeceraAsistencia
        plantilla={plantilla}
        modo="legacy"
        descargando={descargando}
        puedeDescargar={filas.length > 0}
        onDescargar={() => void descargarPdf()}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filas.length === 0 ? (
        <p className="rounded-xl border border-zinc-100 px-4 py-6 text-center text-sm text-zinc-500">
          Aún no hay asistentes registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((fila, index) => (
            <li
              key={fila.indiceFila}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-zinc-800">
                  Asistente {index + 1}
                </span>
                {puedeEditar ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={guardandoFila === fila.indiceFila}
                      onClick={() => void guardarFila(fila)}
                      className="inline-flex items-center gap-1 rounded-lg bg-ruralia-teal-soft px-2 py-1 text-xs font-semibold text-ruralia-teal-text"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {guardandoFila === fila.indiceFila
                        ? "Guardando…"
                        : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void quitarFila(fila)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Quitar asistente"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {campos.map((campo) => (
                  <div
                    key={campo.clave}
                    className={
                      campo.tipoCampo === "FIRMA" ? "sm:col-span-2" : ""
                    }
                  >
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      {campo.etiqueta}
                      {campo.esObligatorio ? " *" : ""}
                    </label>
                    {renderCampo(campo, fila)}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {puedeEditar ? (
        <button
          type="button"
          onClick={agregarFila}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:border-ruralia-teal hover:text-ruralia-teal-text"
        >
          <Plus className="h-4 w-4" />
          Agregar asistente
        </button>
      ) : null}
    </div>
  );
}

function CeldaColumna({
  columna,
  valor,
  disabled,
  firmando,
  onCambiar,
  onIniciarFirma,
  onCancelarFirma,
}: {
  columna: ColumnaCampoTabla;
  valor: unknown;
  disabled: boolean;
  firmando: boolean;
  onCambiar: (valor: unknown) => void;
  onIniciarFirma: () => void;
  onCancelarFirma: () => void;
}) {
  const tipo = columna.tipoCampo as TipoCampoColumnaTabla;

  if (tipo === "FIRMA") {
    const dataUrl = typeof valor === "string" ? valor : "";
    if (firmando) {
      return (
        <PadFirma
          valorInicial={dataUrl || null}
          onCancelar={onCancelarFirma}
          onGuardar={(firma) => {
            onCambiar(firma);
            onCancelarFirma();
          }}
        />
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`Firma ${columna.etiqueta}`}
            className="h-10 w-24 rounded border border-zinc-100 bg-white object-contain"
          />
        ) : (
          <span className="text-xs text-zinc-400">Sin firma</span>
        )}
        {!disabled ? (
          <button
            type="button"
            onClick={onIniciarFirma}
            className="text-xs font-semibold text-ruralia-teal-text hover:underline"
          >
            {dataUrl ? "Refirmar" : "Firmar"}
          </button>
        ) : null}
      </div>
    );
  }

  if (tipo === "SI_NO") {
    return (
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(valor)}
          disabled={disabled}
          onChange={(e) => onCambiar(e.target.checked)}
        />
        Sí
      </label>
    );
  }

  if (tipo === "SELECCION_UNICA") {
    const opciones = columna.opciones?.valores ?? [];
    return (
      <select
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm disabled:bg-zinc-50"
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => onCambiar(e.target.value)}
      >
        <option value="">—</option>
        {opciones.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    );
  }

  if (tipo === "NUMERO") {
    return (
      <input
        type="number"
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm disabled:bg-zinc-50"
        value={valor === "" || valor == null ? "" : String(valor)}
        onChange={(e) =>
          onCambiar(e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    );
  }

  if (tipo === "FECHA") {
    return (
      <input
        type="date"
        disabled={disabled}
        className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm disabled:bg-zinc-50"
        value={typeof valor === "string" ? valor.slice(0, 10) : ""}
        onChange={(e) => onCambiar(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      disabled={disabled}
      className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm disabled:bg-zinc-50"
      value={typeof valor === "string" ? valor : String(valor ?? "")}
      onChange={(e) => onCambiar(e.target.value)}
    />
  );
}

function ControlAsistenciaMatriz({
  token,
  jornada,
  puedeEditar,
  onCambio,
  plantilla,
}: ControlAsistenciaJornadaProps & { plantilla: PlantillaFormulario }) {
  const camposOrdenados = useMemo(
    () =>
      (plantilla.campos ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden),
    [plantilla],
  );

  const camposCabecera = useMemo(
    () => camposOrdenados.filter((c) => c.tipoCampo !== "TABLA"),
    [camposOrdenados],
  );

  const camposTabla = useMemo(
    () => camposOrdenados.filter((c) => c.tipoCampo === "TABLA"),
    [camposOrdenados],
  );

  const [cabecera, setCabecera] = useState<Record<string, unknown>>({});
  const [tablas, setTablas] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [envioId, setEnvioId] = useState<string | undefined>();
  const [firmando, setFirmando] = useState<{
    claveTabla: string;
    indiceFila: number;
    claveCol: string;
  } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const cabeceraIni = valoresIniciales(camposCabecera);
      const tablasIni: Record<string, Record<string, unknown>[]> = {};
      for (const campo of camposTabla) {
        tablasIni[campo.clave] = [];
      }

      const envios = await listarEnviosPorJornada(token, jornada.id);
      const delGrupo = envios
        .filter(
          (e) =>
            !e.plantillaFormularioId ||
            e.plantillaFormularioId === plantilla.id,
        )
        .sort((a, b) => a.indiceFila - b.indiceFila);
      const envio = delGrupo[0];

      if (envio) {
        const respuestas = await obtenerRespuestasEnvio(token, envio.id);
        for (const r of respuestas) {
          const campo =
            camposOrdenados.find((c) => c.clave === r.claveCampo) ??
            (r.tipoCampo
              ? ({
                  clave: r.claveCampo,
                  tipoCampo: r.tipoCampo,
                } as CampoFormulario)
              : undefined);
          if (!campo) continue;
          if (campo.tipoCampo === "TABLA" || r.tipoCampo === "TABLA") {
            const valor = valorDesdeRespuesta({
              ...r,
              tipoCampo: "TABLA",
            }) as { filas?: Record<string, unknown>[] };
            const filasBrutas = Array.isArray(valor?.filas) ? valor.filas : [];
            const originales =
              (campo.opciones as { columnas?: ColumnaCampoTabla[] } | undefined)
                ?.columnas ?? [];
            const normalizadas = columnasDeTabla(
              campo.tipoCampo
                ? campo
                : ({
                    ...campo,
                    opciones: { columnas: originales },
                  } as CampoFormulario),
            );
            tablasIni[campo.clave] = remapearFilasTabla(
              filasBrutas,
              Array.isArray(originales) ? originales : [],
              normalizadas,
            );
          } else {
            let valorCab = valorDesdeRespuesta(r);
            if (
              campo.tipoCampo !== "FIRMA" &&
              typeof valorCab === "string" &&
              valorCab.startsWith("data:image")
            ) {
              valorCab = "";
            }
            cabeceraIni[campo.clave] = valorCab;
          }
        }
        setEnvioId(envio.id);
      } else {
        setEnvioId(undefined);
      }

      setCabecera(cabeceraIni);
      setTablas(tablasIni);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asistencia",
      );
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [token, jornada.id, plantilla.id, camposCabecera, camposTabla, camposOrdenados]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function actualizarCabecera(clave: string, valor: unknown) {
    setCabecera((prev) => ({ ...prev, [clave]: valor }));
  }

  function agregarFilaTabla(claveTabla: string) {
    const campo = camposTabla.find((c) => c.clave === claveTabla);
    if (!campo) return;
    const columnas = columnasDeTabla(campo);
    setTablas((prev) => ({
      ...prev,
      [claveTabla]: [...(prev[claveTabla] ?? []), filaTablaVacia(columnas)],
    }));
  }

  function quitarFilaTabla(claveTabla: string, indice: number) {
    setTablas((prev) => ({
      ...prev,
      [claveTabla]: (prev[claveTabla] ?? []).filter((_, i) => i !== indice),
    }));
  }

  function actualizarCelda(
    claveTabla: string,
    indiceFila: number,
    claveCol: string,
    valor: unknown,
  ) {
    setTablas((prev) => ({
      ...prev,
      [claveTabla]: (prev[claveTabla] ?? []).map((fila, i) =>
        i === indiceFila ? { ...fila, [claveCol]: valor } : fila,
      ),
    }));
  }

  async function guardarTodo() {
    setGuardando(true);
    setError(null);
    try {
      const respuestas = [
        ...camposCabecera.map((c) => ({
          claveCampo: c.clave,
          valor: cabecera[c.clave] ?? null,
        })),
        ...camposTabla.map((c) => ({
          claveCampo: c.clave,
          valor: { filas: tablas[c.clave] ?? [] },
        })),
      ];

      const envio = await enviarFormulario(token, {
        jornadaId: jornada.id,
        plantillaFormularioId: plantilla.id,
        indiceFila: 0,
        respuestas,
      });
      setEnvioId(envio.id);
      await cargar(true);
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function descargarPdf() {
    setDescargando(true);
    setError(null);
    try {
      const blob = await descargarPdfAsistenciaJornada(token, jornada.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencia-${jornada.fecha.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el PDF",
      );
    } finally {
      setDescargando(false);
    }
  }

  function renderCampoCabecera(campo: CampoFormulario) {
    const valor = cabecera[campo.clave];
    const id = `cab-${campo.clave}`;

    if (campo.tipoCampo === "FIRMA") {
      const dataUrl = typeof valor === "string" ? valor : "";
      const firmandoCab =
        firmando?.claveTabla === "__cabecera" &&
        firmando.claveCol === campo.clave;
      if (firmandoCab) {
        return (
          <PadFirma
            valorInicial={dataUrl || null}
            onCancelar={() => setFirmando(null)}
            onGuardar={(firma) => {
              actualizarCabecera(campo.clave, firma);
              setFirmando(null);
            }}
          />
        );
      }
      return (
        <div className="flex flex-wrap items-center gap-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={campo.etiqueta}
              className="h-10 w-24 rounded border border-zinc-100 bg-white object-contain"
            />
          ) : (
            <span className="text-xs text-zinc-400">Sin firma</span>
          )}
          {puedeEditar ? (
            <button
              type="button"
              onClick={() =>
                setFirmando({
                  claveTabla: "__cabecera",
                  indiceFila: 0,
                  claveCol: campo.clave,
                })
              }
              className="text-xs font-semibold text-ruralia-teal-text hover:underline"
            >
              {dataUrl ? "Refirmar" : "Firmar"}
            </button>
          ) : null}
        </div>
      );
    }

    const tipo = campo.tipoCampo as TipoCampoFormulario;
    if (tipo === "SI_NO") {
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(valor)}
            disabled={!puedeEditar}
            onChange={(e) => actualizarCabecera(campo.clave, e.target.checked)}
          />
          Sí
        </label>
      );
    }
    if (tipo === "NUMERO") {
      return (
        <input
          id={id}
          type="number"
          disabled={!puedeEditar}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
          value={valor === "" || valor == null ? "" : String(valor)}
          onChange={(e) =>
            actualizarCabecera(
              campo.clave,
              e.target.value === "" ? "" : Number(e.target.value),
            )
          }
        />
      );
    }
    if (tipo === "FECHA") {
      return (
        <input
          id={id}
          type="date"
          disabled={!puedeEditar}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
          value={typeof valor === "string" ? valor.slice(0, 10) : ""}
          onChange={(e) => actualizarCabecera(campo.clave, e.target.value)}
        />
      );
    }
    if (tipo === "SELECCION_UNICA") {
      const opciones =
        (campo.opciones as { valores?: string[] } | undefined)?.valores ?? [];
      return (
        <select
          id={id}
          disabled={!puedeEditar}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => actualizarCabecera(campo.clave, e.target.value)}
        >
          <option value="">—</option>
          {opciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        id={id}
        type="text"
        disabled={!puedeEditar}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
        value={typeof valor === "string" ? valor : String(valor ?? "")}
        onChange={(e) => actualizarCabecera(campo.clave, e.target.value)}
      />
    );
  }

  if (cargando) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando asistencia…</p>;
  }

  const totalFilas = Object.values(tablas).reduce(
    (acc, filas) => acc + filas.length,
    0,
  );

  return (
    <div className="mt-4 space-y-5">
      <CabeceraAsistencia
        plantilla={plantilla}
        modo="matriz"
        descargando={descargando}
        puedeDescargar={Boolean(envioId) || totalFilas > 0}
        hayRespuestas={Boolean(envioId)}
        onDescargar={() => void descargarPdf()}
      />
      {envioId ? (
        <p className="rounded-lg border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-3 py-2 text-xs text-ruralia-teal-text">
          Respuestas cargadas del último envío
          {totalFilas > 0
            ? ` · ${totalFilas} registro${totalFilas === 1 ? "" : "s"} en la lista`
            : ""}
          . Puedes editarlas y volver a guardar.
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {camposCabecera.length > 0 ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h5 className="mb-3 text-sm font-semibold text-zinc-800">
            Datos del evento
          </h5>
          <div className="grid gap-3 sm:grid-cols-2">
            {camposCabecera.map((campo) => (
              <div
                key={campo.clave}
                className={campo.tipoCampo === "FIRMA" ? "sm:col-span-2" : ""}
              >
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  {campo.etiqueta}
                  {campo.esObligatorio ? " *" : ""}
                </label>
                {renderCampoCabecera(campo)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {camposTabla.map((campoTabla) => {
        const columnas = columnasDeTabla(campoTabla);
        const filas = tablas[campoTabla.clave] ?? [];
        return (
          <section
            key={campoTabla.clave}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <h5 className="text-sm font-semibold text-zinc-800">
                {campoTabla.etiqueta}
                {campoTabla.esObligatorio ? " *" : ""}
              </h5>
              {puedeEditar ? (
                <button
                  type="button"
                  onClick={() => agregarFilaTabla(campoTabla.clave)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:border-ruralia-teal hover:text-ruralia-teal-text"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar fila
                </button>
              ) : null}
            </div>

            {columnas.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">
                Esta tabla no tiene columnas configuradas.
              </p>
            ) : filas.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">
                Sin registros. Agrega la primera fila.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">#</th>
                      {columnas.map((col, iCol) => (
                        <th
                          key={`${iCol}-${col.clave}`}
                          className="px-3 py-2 font-semibold"
                        >
                          {col.etiqueta}
                          {col.esObligatorio ? " *" : ""}
                        </th>
                      ))}
                      {puedeEditar ? (
                        <th className="px-3 py-2 font-semibold"> </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filas.map((fila, indiceFila) => (
                      <tr key={indiceFila} className="align-top">
                        <td className="px-3 py-2 text-zinc-400">
                          {indiceFila + 1}
                        </td>
                        {columnas.map((col, iCol) => {
                          const valorCelda = fila[col.clave];
                          const valorMostrar =
                            typeof valorCelda === "string" &&
                            valorCelda.startsWith("data:image") &&
                            col.tipoCampo !== "FIRMA"
                              ? ""
                              : valorCelda;
                          return (
                          <td key={`${iCol}-${col.clave}`} className="px-3 py-2">
                            <CeldaColumna
                              columna={col}
                              valor={valorMostrar}
                              disabled={!puedeEditar}
                              firmando={
                                firmando?.claveTabla === campoTabla.clave &&
                                firmando.indiceFila === indiceFila &&
                                firmando.claveCol === col.clave
                              }
                              onCambiar={(valor) =>
                                actualizarCelda(
                                  campoTabla.clave,
                                  indiceFila,
                                  col.clave,
                                  valor,
                                )
                              }
                              onIniciarFirma={() =>
                                setFirmando({
                                  claveTabla: campoTabla.clave,
                                  indiceFila,
                                  claveCol: col.clave,
                                })
                              }
                              onCancelarFirma={() => setFirmando(null)}
                            />
                          </td>
                          );
                        })}
                        {puedeEditar ? (
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() =>
                                quitarFilaTabla(campoTabla.clave, indiceFila)
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Quitar fila"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {puedeEditar ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={guardando}
            onClick={() => void guardarTodo()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar formulario"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CabeceraAsistencia({
  plantilla,
  modo,
  descargando,
  puedeDescargar,
  hayRespuestas = false,
  onDescargar,
}: {
  plantilla: PlantillaFormulario;
  modo: "legacy" | "matriz";
  descargando: boolean;
  puedeDescargar: boolean;
  hayRespuestas?: boolean;
  onDescargar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h4 className="text-sm font-semibold text-zinc-800">
          Lista de asistencia
        </h4>
        <p className="mt-1 text-xs text-zinc-500">
          Formulario: <strong>{plantilla.nombre}</strong>.{" "}
          {modo === "matriz"
            ? hayRespuestas
              ? "Se muestran las respuestas registradas; edítalas si hace falta."
              : "Completa los datos del evento y las filas de cada tabla."
            : "Los campos se repiten por asistente (formato anterior)."}
        </p>
      </div>
      <button
        type="button"
        disabled={descargando || !puedeDescargar}
        onClick={onDescargar}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <Download className="h-3.5 w-3.5" />
        {descargando ? "Generando…" : "Descargar PDF"}
      </button>
    </div>
  );
}

export function ControlAsistenciaJornada({
  token,
  jornada,
  puedeEditar,
  onCambio,
}: ControlAsistenciaJornadaProps) {
  const [plantilla, setPlantilla] = useState<PlantillaFormulario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargarPlantilla() {
      setCargando(true);
      setError(null);
      try {
        const plantillas = await listarPlantillasPorJornada(token, jornada.id);
        if (!cancelado) {
          setPlantilla(plantillas[0] ?? null);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar plantilla",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargarPlantilla();
    return () => {
      cancelado = true;
    };
  }, [token, jornada.id]);

  if (cargando) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando asistencia…</p>;
  }

  if (error) {
    return <p className="mt-4 text-sm text-red-600">{error}</p>;
  }

  if (!plantilla) {
    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Sin formulario grupal asignado
        </p>
        <p className="mt-1 text-xs text-amber-800">
          Asigna un formulario de tipo <strong>Grupal</strong> al proceso de esta
          meta en la pestaña Plan del proyecto.
        </p>
      </div>
    );
  }

  const tieneTabla = (plantilla.campos ?? []).some(
    (c) => c.tipoCampo === "TABLA",
  );

  if (tieneTabla) {
    return (
      <ControlAsistenciaMatriz
        token={token}
        jornada={jornada}
        puedeEditar={puedeEditar}
        onCambio={onCambio}
        plantilla={plantilla}
      />
    );
  }

  return (
    <ControlAsistenciaLegacy
      token={token}
      jornada={jornada}
      puedeEditar={puedeEditar}
      onCambio={onCambio}
      plantilla={plantilla}
    />
  );
}
