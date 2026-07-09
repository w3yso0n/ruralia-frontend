"use client";

import { useState } from "react";
import type { ActividadPlan, Proyecto, VeredaResumen } from "@/lib/types";

export interface LineaActividadJornada {
  actividadId: string;
  subactividadId?: string;
}

interface FormularioJornadaProps {
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  enviando: boolean;
  onCrearActividadPlan: (nombre: string) => Promise<string | null>;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    actividades: LineaActividadJornada[];
  }) => Promise<void>;
}

export function FormularioJornada({
  veredas,
  actividadesPlan,
  enviando,
  onCrearActividadPlan,
  onSubmit,
}: FormularioJornadaProps) {
  const [fecha, setFecha] = useState("");
  const [veredaId, setVeredaId] = useState(veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [seleccionadas, setSeleccionadas] = useState<
    Record<string, { checked: boolean; subactividadId?: string }>
  >({});
  const [nuevaActividad, setNuevaActividad] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  function toggleActividad(actividadId: string) {
    setSeleccionadas((prev) => {
      const actual = prev[actividadId];
      return {
        ...prev,
        [actividadId]: {
          checked: !actual?.checked,
          subactividadId: actual?.subactividadId,
        },
      };
    });
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha || !veredaId) {
      setErrorLocal("Fecha y vereda son obligatorias");
      return;
    }

    let actividades = Object.entries(seleccionadas)
      .filter(([, v]) => v.checked)
      .map(([actividadId, v]) => ({
        actividadId,
        subactividadId: v.subactividadId || undefined,
      }));

    if (nuevaActividad.trim()) {
      const id = await onCrearActividadPlan(nuevaActividad.trim());
      if (id) {
        actividades = [...actividades, { actividadId: id, subactividadId: undefined }];
      }
    }

    if (!actividades.length) {
      setErrorLocal("Agrega al menos una actividad a la jornada");
      return;
    }

    await onSubmit({
      fecha,
      veredaId,
      observaciones: observaciones.trim() || undefined,
      actividades,
    });

    setFecha("");
    setObservaciones("");
    setNuevaActividad("");
    setSeleccionadas({});
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Una jornada agrupa la visita de campo: elige la fecha, la vereda y las
        actividades que se ejecutarán ese día.
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

      <div>
        <p className="mb-2 text-sm font-medium text-zinc-800">
          Actividades en esta jornada *
        </p>
        {actividadesPlan.length === 0 ? (
          <p className="mb-2 text-xs text-zinc-500">
            No hay actividades en el catálogo. Crea una nueva abajo.
          </p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-zinc-100 p-3">
            {actividadesPlan.map((act) => (
              <div
                key={act.id}
                className="rounded-lg border border-zinc-50 px-2 py-2"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!seleccionadas[act.id]?.checked}
                    onChange={() => toggleActividad(act.id)}
                  />
                  <span className="text-sm font-medium">{act.nombre}</span>
                </label>
                {(act.subactividades?.length ?? 0) > 0 &&
                seleccionadas[act.id]?.checked ? (
                  <select
                    value={seleccionadas[act.id]?.subactividadId ?? ""}
                    onChange={(e) =>
                      setSeleccionadas((prev) => ({
                        ...prev,
                        [act.id]: {
                          checked: true,
                          subactividadId: e.target.value || undefined,
                        },
                      }))
                    }
                    className="ml-6 mt-1 w-full max-w-xs rounded-lg border border-zinc-200 px-2 py-1 text-xs"
                  >
                    <option value="">Toda la actividad</option>
                    {act.subactividades?.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        Sub: {sub.nombre}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={nuevaActividad}
            onChange={(e) => setNuevaActividad(e.target.value)}
            placeholder="O crear actividad nueva para esta jornada"
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm"
          />
        </div>
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
