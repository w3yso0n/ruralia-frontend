"use client";

import { useState } from "react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { SelectorFechaJornada } from "@/components/ui/selector-fecha-jornada";
import { actualizarProyecto } from "@/lib/api";
import type { Proyecto, TipoProyecto } from "@/lib/types";

const TIPOS: { id: TipoProyecto; nombre: string }[] = [
  { id: "AGRICOLA", nombre: "Agrícola" },
  { id: "AMBIENTAL", nombre: "Ambiental" },
  { id: "TURISMO", nombre: "Turismo" },
  { id: "OTRO", nombre: "Otro" },
];

function etiquetaTipo(tipo: TipoProyecto): string {
  return TIPOS.find((t) => t.id === tipo)?.nombre ?? tipo;
}

function fechaParaInput(fecha?: string): string {
  return fecha ? fecha.slice(0, 10) : "";
}

function formatearFecha(fecha?: string): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

interface ResumenInformacionBasicaProps {
  token: string;
  proyecto: Proyecto;
  puedeGestionar?: boolean;
  onActualizar: () => Promise<void>;
}

export function ResumenInformacionBasica({
  token,
  proyecto,
  puedeGestionar,
  onActualizar,
}: ResumenInformacionBasicaProps) {
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState<TipoProyecto>(proyecto.tipo);
  const [fechaInicio, setFechaInicio] = useState(
    fechaParaInput(proyecto.fechaInicio),
  );
  const [fechaFin, setFechaFin] = useState(fechaParaInput(proyecto.fechaFin));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function iniciarEdicion() {
    setTipo(proyecto.tipo);
    setFechaInicio(fechaParaInput(proyecto.fechaInicio));
    setFechaFin(fechaParaInput(proyecto.fechaFin));
    setError(null);
    setEditando(true);
  }

  async function manejarGuardar() {
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      setError("La fecha fin no puede ser anterior a la fecha inicio");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await actualizarProyecto(token, proyecto.id, {
        tipo,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
      });
      setEditando(false);
      await onActualizar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la información",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section
      aria-labelledby="resumen-info-basica-titulo"
      className="rounded-2xl border border-ruralia-teal-border bg-white p-5"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2
          id="resumen-info-basica-titulo"
          className="text-[17px] font-semibold text-zinc-900"
        >
          Información básica
        </h2>
        {puedeGestionar && !editando ? (
          <button
            type="button"
            onClick={iniciarEdicion}
            className="-mr-2 inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
          >
            Editar
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-[13px] text-zinc-500">
        Tipo de proyecto y fechas de ejecución.
      </p>

      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {editando && puedeGestionar ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Tipo
              </label>
              <SelectorDesplegable
                value={tipo}
                onChange={(id) => setTipo(id as TipoProyecto)}
                opciones={TIPOS}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha inicio
              </label>
              <SelectorFechaJornada
                value={fechaInicio}
                onChange={setFechaInicio}
                fechaFinProyecto={fechaFin || undefined}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha fin
              </label>
              <SelectorFechaJornada
                value={fechaFin}
                onChange={setFechaFin}
                fechaInicioProyecto={fechaInicio || undefined}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => void manejarGuardar()}
              className="inline-flex h-10 items-center rounded-xl bg-ruralia-teal px-4 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setEditando(false);
                setError(null);
              }}
              className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Tipo
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {etiquetaTipo(proyecto.tipo)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha inicio
            </dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-900">
              {formatearFecha(proyecto.fechaInicio)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha fin
            </dt>
            <dd className="mt-1 text-sm font-medium tabular-nums text-zinc-900">
              {formatearFecha(proyecto.fechaFin)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
