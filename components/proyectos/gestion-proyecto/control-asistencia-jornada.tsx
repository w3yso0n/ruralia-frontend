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
  Jornada,
  PlantillaFormulario,
  RespuestaFormularioDetalle,
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

export function ControlAsistenciaJornada({
  token,
  jornada,
  puedeEditar,
  onCambio,
}: ControlAsistenciaJornadaProps) {
  const [plantilla, setPlantilla] = useState<PlantillaFormulario | null>(null);
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoFila, setGuardandoFila] = useState<number | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const campos = useMemo(
    () =>
      (plantilla?.campos ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden),
    [plantilla],
  );

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const plantillas = await listarPlantillasPorJornada(token, jornada.id);
      const grupal = plantillas[0] ?? null;
      setPlantilla(grupal);

      if (!grupal) {
        setFilas([]);
        return;
      }

      const envios = await listarEnviosPorJornada(token, jornada.id);
      const delGrupo = envios.filter(
        (e) => e.plantillaFormularioId === grupal.id,
      );

      const filasCargadas: FilaAsistencia[] = [];
      for (const envio of delGrupo.sort(
        (a, b) => a.indiceFila - b.indiceFila,
      )) {
        const respuestas = await obtenerRespuestasEnvio(token, envio.id);
        const valores = valoresIniciales(grupal.campos ?? []);
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
  }, [token, jornada.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function agregarFila() {
    if (!plantilla) return;
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
    if (!plantilla) return;
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

  function renderCampo(
    campo: CampoFormulario,
    fila: FilaAsistencia,
  ) {
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

    const inputComun = (
      tipo: TipoCampoFormulario,
      props: React.InputHTMLAttributes<HTMLInputElement>,
    ) => (
      <input
        id={id}
        disabled={!puedeEditar}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-50"
        {...props}
      />
    );

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
        return inputComun("NUMERO", {
          type: "number",
          value: valor === "" || valor == null ? "" : String(valor),
          onChange: (e) =>
            actualizarValor(
              fila.indiceFila,
              campo.clave,
              e.target.value === "" ? "" : Number(e.target.value),
            ),
        });
      case "FECHA":
        return inputComun("FECHA", {
          type: "date",
          value: typeof valor === "string" ? valor.slice(0, 10) : "",
          onChange: (e) =>
            actualizarValor(fila.indiceFila, campo.clave, e.target.value),
        });
      default:
        return inputComun("TEXTO", {
          type: "text",
          value: typeof valor === "string" ? valor : String(valor ?? ""),
          onChange: (e) =>
            actualizarValor(fila.indiceFila, campo.clave, e.target.value),
        });
    }
  }

  if (cargando) {
    return <p className="mt-4 text-sm text-zinc-500">Cargando asistencia…</p>;
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

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800">
            Lista de asistencia
          </h4>
          <p className="mt-1 text-xs text-zinc-500">
            Formulario: <strong>{plantilla.nombre}</strong>. Los campos son
            fijos; agrega tantas filas (asistentes) como necesites.
          </p>
        </div>
        <button
          type="button"
          disabled={descargando || filas.length === 0}
          onClick={() => void descargarPdf()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {descargando ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

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
                      {guardandoFila === fila.indiceFila ? "Guardando…" : "Guardar"}
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
