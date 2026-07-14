"use client";

import { useState } from "react";
import type { ActividadPlan, Jornada, VeredaResumen } from "@/lib/types";
import { SelectorMetaPlan } from "./selector-meta-plan";

interface FormularioEditarJornadaProps {
  jornada: Jornada;
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    metaId: string;
  }) => Promise<void>;
  onCancelar: () => void;
}

function fechaParaInput(fecha: string) {
  return fecha.slice(0, 10);
}

export function FormularioEditarJornada({
  jornada,
  veredas,
  actividadesPlan,
  enviando,
  onSubmit,
  onCancelar,
}: FormularioEditarJornadaProps) {
  const [fecha, setFecha] = useState(fechaParaInput(jornada.fecha));
  const [veredaId, setVeredaId] = useState(jornada.vereda?.id ?? veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState(jornada.observaciones ?? "");
  const [metaId, setMetaId] = useState(jornada.meta?.id ?? "");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha || !veredaId) {
      setErrorLocal("Fecha y vereda son obligatorias");
      return;
    }

    if (!metaId) {
      setErrorLocal(
        "Debes seleccionar la meta del plan (Actividad → Subactividad → Proceso → Meta)",
      );
      return;
    }

    await onSubmit({
      fecha,
      veredaId,
      observaciones: observaciones.trim() || undefined,
      metaId,
    });
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Fecha *
          </label>
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Vereda *
          </label>
          <select
            required
            value={veredaId}
            onChange={(e) => setVeredaId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          >
            {veredas.length === 0 ? (
              <option value="">Sin veredas asignadas al proyecto</option>
            ) : (
              veredas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-100 p-4">
        <p className="text-sm font-medium text-zinc-800">Meta del plan *</p>
        <SelectorMetaPlan
          actividadesPlan={actividadesPlan}
          metaId={metaId}
          onChange={setMetaId}
          disabled={enviando}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Observaciones
        </label>
        <textarea
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        />
      </div>

      {errorLocal ? (
        <p className="text-sm text-red-600">{errorLocal}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={onCancelar}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Cancelar edición
        </button>
      </div>
    </form>
  );
}
