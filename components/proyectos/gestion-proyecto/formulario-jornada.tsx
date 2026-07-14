"use client";

import { useState } from "react";
import type { ActividadPlan, VeredaResumen } from "@/lib/types";
import { SelectorMetaPlan } from "./selector-meta-plan";

interface FormularioJornadaProps {
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    metaId: string;
  }) => Promise<void>;
}

export function FormularioJornada({
  veredas,
  actividadesPlan,
  enviando,
  onSubmit,
}: FormularioJornadaProps) {
  const [fecha, setFecha] = useState("");
  const [veredaId, setVeredaId] = useState(veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [metaId, setMetaId] = useState("");
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

    setFecha("");
    setObservaciones("");
    setMetaId("");
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Registra la jornada de campo seleccionando la meta del plan a la que
        aporta esta visita (Actividad → Subactividad → Proceso → Meta). La meta
        define qué formularios estarán disponibles en el celular.
      </p>

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

      <button
        type="submit"
        disabled={enviando || !veredas.length}
        className="w-full rounded-xl bg-ruralia-teal py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {enviando ? "Guardando..." : "Crear jornada"}
      </button>
    </form>
  );
}
