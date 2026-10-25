"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Link2, Lock, RefreshCw } from "lucide-react";
import { etiquetaOrigen } from "@/components/formularios/selector-autocompletado";
import {
  listarOrigenesAutocompletado,
  listarPlantillasPorJornada,
  obtenerAutocompletadoJornada,
} from "@/lib/api";
import type {
  AutocompletadoJornada,
  ColumnaCampoTabla,
  Jornada,
  OrigenesAutocompletado,
  PlantillaFormulario,
  ValorAutocompletado,
} from "@/lib/types";

/** Una pregunta (o columna de lista) que se llena con la ficha. */
interface PreguntaAutocompletada {
  clave: string;
  columna?: string;
  etiqueta: string;
  origen: string;
}

function preguntasDe(plantilla: PlantillaFormulario): PreguntaAutocompletada[] {
  const preguntas: PreguntaAutocompletada[] = [];
  for (const campo of (plantilla.campos ?? []).slice().sort((a, b) => a.orden - b.orden)) {
    if (campo.tipoCampo === "TABLA") {
      const columnas = (campo.opciones as { columnas?: ColumnaCampoTabla[] } | undefined)
        ?.columnas;
      for (const columna of columnas ?? []) {
        if (!columna.autocompletar?.origen) continue;
        preguntas.push({
          clave: campo.clave,
          columna: columna.clave,
          etiqueta: `${campo.etiqueta} > ${columna.etiqueta}`,
          origen: columna.autocompletar.origen,
        });
      }
      continue;
    }
    if (campo.autocompletar?.origen) {
      preguntas.push({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        origen: campo.autocompletar.origen,
      });
    }
  }
  return preguntas;
}

function mostrarValor(valor: ValorAutocompletado): string {
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  const fecha = typeof valor === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor) : null;
  if (fecha) return `${fecha[3]}/${fecha[2]}/${fecha[1]}`;
  return String(valor);
}

interface AutocompletadoJornadaVistaProps {
  token: string;
  jornada: Jornada;
}

/**
 * Vista de administración: con qué dato de la ficha llega cada pregunta del
 * formulario para cada beneficiario de la jornada, y qué datos faltan.
 */
export function AutocompletadoJornadaVista({
  token,
  jornada,
}: AutocompletadoJornadaVistaProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState<AutocompletadoJornada | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);
  const [origenes, setOrigenes] = useState<OrigenesAutocompletado | null>(null);

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      obtenerAutocompletadoJornada(token, jornada.id),
      listarPlantillasPorJornada(token, jornada.id),
      listarOrigenesAutocompletado(token).catch(() => null),
    ])
      .then(([auto, lista, catalogo]) => {
        if (cancelado) return;
        setDatos(auto);
        setPlantillas(lista);
        setOrigenes(catalogo);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setError(
          err instanceof Error ? err.message : "No se pudieron cargar los datos de la ficha",
        );
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, jornada.id, recarga]);

  const cargar = useCallback(() => {
    setCargando(true);
    setRecarga((n) => n + 1);
  }, []);

  if (cargando) {
    return <p className="text-sm text-zinc-500">Cargando datos de la ficha…</p>;
  }
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const conAutocompletado = plantillas
    .map((plantilla) => ({ plantilla, preguntas: preguntasDe(plantilla) }))
    .filter(({ preguntas }) => preguntas.length > 0);
  const personas = datos?.beneficiarios ?? [];

  if (!conAutocompletado.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-8 text-center">
        <Link2 className="mx-auto h-7 w-7 text-zinc-300" />
        <p className="mt-3 text-sm font-medium text-zinc-600">
          El formulario de esta jornada no se llena con datos de la ficha
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          En el editor del formulario, usa &quot;Llenar con dato del beneficiario&quot; en
          las preguntas que quieras precargar.
        </p>
      </div>
    );
  }

  if (!personas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-8 text-center">
        <p className="text-sm font-medium text-zinc-600">
          Esta jornada no tiene beneficiarios
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Sin beneficiarios (por ejemplo, una jornada de asociación) el formulario se
          llena normal, sin autocompletar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-xs text-zinc-500">
          Así llegará el formulario al celular de cada persona. Los datos con candado no
          los puede cambiar el técnico; los marcados como faltantes los llenará a mano.
          Para corregir un dato, edítalo en la ficha del beneficiario (Contrapartes):
          mientras la jornada esté abierta, el formulario toma el valor nuevo.
        </p>
        <button
          type="button"
          onClick={cargar}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {conAutocompletado.map(({ plantilla, preguntas }) => {
        const valores = datos?.plantillas[plantilla.id]?.valores ?? {};
        const valorDe = (personaId: string, pregunta: PreguntaAutocompletada) => {
          const dePersona = valores[personaId];
          return pregunta.columna
            ? dePersona?.columnas[pregunta.clave]?.[pregunta.columna]
            : dePersona?.campos[pregunta.clave];
        };
        const total = personas.length * preguntas.length;
        const completos = personas.reduce(
          (suma, persona) =>
            suma + preguntas.filter((p) => valorDe(persona.id, p) !== undefined).length,
          0,
        );

        return (
          <article
            key={plantilla.id}
            className="overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{plantilla.nombre}</p>
                <p className="text-xs text-zinc-500">
                  {datos?.plantillas[plantilla.id]?.porPersona
                    ? `Uno por persona · ${personas.length} ${personas.length === 1 ? "formulario" : "formularios"}`
                    : "Lista con una fila por beneficiario"}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  completos === total
                    ? "bg-white text-ruralia-teal-text ring-1 ring-ruralia-teal-border"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {completos} de {total} datos listos
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="sticky left-0 bg-zinc-50 px-4 py-2 font-semibold">
                      Beneficiario
                    </th>
                    {preguntas.map((pregunta) => (
                      <th
                        key={`${pregunta.clave}-${pregunta.columna ?? ""}`}
                        className="px-4 py-2 font-semibold"
                      >
                        <span className="block normal-case tracking-normal text-zinc-700">
                          {pregunta.etiqueta}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 font-medium normal-case tracking-normal text-ruralia-teal-text">
                          <Link2 className="h-3 w-3" />
                          {etiquetaOrigen(pregunta.origen, origenes)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {personas.map((persona) => (
                    <tr key={persona.id} className="border-t border-zinc-100">
                      <td className="sticky left-0 bg-white px-4 py-2.5">
                        <p className="font-medium text-zinc-900">{persona.nombre}</p>
                        <p className="text-xs text-zinc-500">{persona.numeroDocumento}</p>
                      </td>
                      {preguntas.map((pregunta) => {
                        const valor = valorDe(persona.id, pregunta);
                        return (
                          <td
                            key={`${pregunta.clave}-${pregunta.columna ?? ""}`}
                            className="px-4 py-2.5"
                          >
                            {valor === undefined ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                                <AlertCircle className="h-3 w-3" />
                                Falta: lo llena el técnico
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-zinc-900">
                                <Lock className="h-3 w-3 shrink-0 text-ruralia-teal" />
                                {mostrarValor(valor)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
    </div>
  );
}
