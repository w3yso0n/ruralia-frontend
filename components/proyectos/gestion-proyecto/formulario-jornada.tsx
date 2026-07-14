"use client";

import { useState } from "react";
import type { ActividadPlan, ProcesoPlan, VeredaResumen } from "@/lib/types";

interface FormularioJornadaProps {
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    observaciones?: string;
    metaId?: string;
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
  const [actividadId, setActividadId] = useState("");
  const [subactividadId, setSubactividadId] = useState("");
  const [procesoId, setProcesoId] = useState("");
  const [metaId, setMetaId] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const actividadSel = actividadesPlan.find((a) => a.id === actividadId);
  const subactividadSel = actividadSel?.subactividades?.find(
    (s) => s.id === subactividadId,
  );
  const procesoSel: ProcesoPlan | undefined = subactividadSel?.procesos?.find(
    (p) => p.id === procesoId,
  );

  function resetCascada(nivel: "actividad" | "subactividad" | "proceso") {
    if (nivel === "actividad") {
      setSubactividadId("");
      setProcesoId("");
      setMetaId("");
    } else if (nivel === "subactividad") {
      setProcesoId("");
      setMetaId("");
    } else {
      setMetaId("");
    }
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha || !veredaId) {
      setErrorLocal("Fecha y vereda son obligatorias");
      return;
    }

    await onSubmit({
      fecha,
      veredaId,
      observaciones: observaciones.trim() || undefined,
      metaId: metaId || undefined,
    });

    setFecha("");
    setObservaciones("");
    setActividadId("");
    setSubactividadId("");
    setProcesoId("");
    setMetaId("");
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Registra la jornada de campo seleccionando la meta del plan a la que
        aporta esta visita (Actividad → Subactividad → Proceso → Meta).
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
        <p className="text-sm font-medium text-zinc-800">Meta del plan</p>

        <div>
          <label className="mb-1 block text-xs text-zinc-600">Actividad</label>
          <select
            value={actividadId}
            onChange={(e) => {
              setActividadId(e.target.value);
              resetCascada("actividad");
            }}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="">— Seleccionar —</option>
            {actividadesPlan.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        {actividadSel && (
          <div>
            <label className="mb-1 block text-xs text-zinc-600">
              Subactividad
            </label>
            <select
              value={subactividadId}
              onChange={(e) => {
                setSubactividadId(e.target.value);
                resetCascada("subactividad");
              }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar —</option>
              {actividadSel.subactividades?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {subactividadSel && (subactividadSel.procesos?.length ?? 0) > 0 && (
          <div>
            <label className="mb-1 block text-xs text-zinc-600">Proceso</label>
            <select
              value={procesoId}
              onChange={(e) => {
                setProcesoId(e.target.value);
                resetCascada("proceso");
              }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar —</option>
              {subactividadSel.procesos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {procesoSel && (procesoSel.metas?.length ?? 0) > 0 && (
          <div>
            <label className="mb-1 block text-xs text-zinc-600">
              Meta
            </label>
            <select
              value={metaId}
              onChange={(e) => setMetaId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="">— Seleccionar —</option>
              {procesoSel.metas?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.unidadMedida})
                </option>
              ))}
            </select>
          </div>
        )}

        {subactividadSel && (subactividadSel.procesos?.length ?? 0) === 0 && (
          <p className="text-xs text-zinc-400">
            Esta subactividad aún no tiene procesos definidos.
          </p>
        )}
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
