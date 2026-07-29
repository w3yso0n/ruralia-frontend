"use client";

import { useState } from "react";
import { actualizarProyecto } from "@/lib/api";
import type { Proyecto, TipoProyecto } from "@/lib/types";

const TIPOS: { valor: TipoProyecto; etiqueta: string }[] = [
  { valor: "AGRICOLA", etiqueta: "Agrícola" },
  { valor: "AMBIENTAL", etiqueta: "Ambiental" },
  { valor: "TURISMO", etiqueta: "Turismo" },
  { valor: "OTRO", etiqueta: "Otro" },
];

function etiquetaTipo(tipo: TipoProyecto): string {
  return TIPOS.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
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
    <section className="mb-6 rounded-2xl border border-ruralia-teal-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-zinc-900">Información básica</h3>
        {puedeGestionar && !editando ? (
          <button
            type="button"
            onClick={iniciarEdicion}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
          >
            Editar
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Tipo de proyecto y fechas de ejecución.
      </p>

      {error ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {editando && puedeGestionar ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoProyecto)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => void manejarGuardar()}
              className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
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
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
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
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {formatearFecha(proyecto.fechaInicio)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Fecha fin
            </dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">
              {formatearFecha(proyecto.fechaFin)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
