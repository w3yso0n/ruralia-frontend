"use client";

import { useEffect, useState } from "react";
import type { ActividadPlan, ProcesoPlan } from "@/lib/types";

interface SelectorMetaPlanProps {
  actividadesPlan: ActividadPlan[];
  metaId: string;
  onChange: (metaId: string) => void;
  disabled?: boolean;
}

function encontrarRutaMeta(actividadesPlan: ActividadPlan[], metaId: string) {
  if (!metaId) return null;

  for (const act of actividadesPlan) {
    for (const sub of act.subactividades ?? []) {
      for (const proc of sub.procesos ?? []) {
        if (proc.metas?.some((m) => m.id === metaId)) {
          return {
            actividadId: act.id,
            subactividadId: sub.id,
            procesoId: proc.id,
          };
        }
      }
    }
  }

  return null;
}

export function SelectorMetaPlan({
  actividadesPlan,
  metaId,
  onChange,
  disabled = false,
}: SelectorMetaPlanProps) {
  const [actividadId, setActividadId] = useState("");
  const [subactividadId, setSubactividadId] = useState("");
  const [procesoId, setProcesoId] = useState("");

  useEffect(() => {
    if (!metaId) {
      setActividadId("");
      setSubactividadId("");
      setProcesoId("");
      return;
    }

    const ruta = encontrarRutaMeta(actividadesPlan, metaId);
    if (ruta) {
      setActividadId(ruta.actividadId);
      setSubactividadId(ruta.subactividadId);
      setProcesoId(ruta.procesoId);
    }
  }, [metaId, actividadesPlan]);

  const actividadSel = actividadesPlan.find((a) => a.id === actividadId);
  const subactividadSel = actividadSel?.subactividades?.find(
    (s) => s.id === subactividadId,
  );
  const procesoSel: ProcesoPlan | undefined = subactividadSel?.procesos?.find(
    (p) => p.id === procesoId,
  );

  function resetCascada(nivel: "actividad" | "subactividad" | "proceso") {
    onChange("");
    if (nivel === "actividad") {
      setSubactividadId("");
      setProcesoId("");
    } else if (nivel === "subactividad") {
      setProcesoId("");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-zinc-600">Actividad</label>
        <select
          value={actividadId}
          disabled={disabled}
          onChange={(e) => {
            setActividadId(e.target.value);
            resetCascada("actividad");
          }}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
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
          <label className="mb-1 block text-xs text-zinc-600">Subactividad</label>
          <select
            value={subactividadId}
            disabled={disabled}
            onChange={(e) => {
              setSubactividadId(e.target.value);
              resetCascada("subactividad");
            }}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
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
            disabled={disabled}
            onChange={(e) => {
              setProcesoId(e.target.value);
              resetCascada("proceso");
            }}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
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
          <label className="mb-1 block text-xs text-zinc-600">Meta *</label>
          <select
            value={metaId}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
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
  );
}
