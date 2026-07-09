"use client";

import { useState } from "react";
import type { ActividadPlan, SubactividadPlan } from "@/lib/types";

interface ArbolPlanProps {
  actividades: ActividadPlan[];
  seleccion:
    | { tipo: "actividad"; id: string }
    | { tipo: "subactividad"; id: string; actividadId: string }
    | null;
  onSeleccionar: (
    sel:
      | { tipo: "actividad"; id: string }
      | { tipo: "subactividad"; id: string; actividadId: string },
  ) => void;
}

export function ArbolPlan({
  actividades,
  seleccion,
  onSeleccionar,
}: ArbolPlanProps) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="space-y-1 text-sm">
      {actividades.length === 0 ? (
        <p className="p-4 text-zinc-500">Sin actividades en el plan</p>
      ) : (
        actividades.map((actividad) => {
          const expandida = expandidas[actividad.id] ?? true;
          const tieneSubs = (actividad.subactividades?.length ?? 0) > 0;
          const activa =
            seleccion?.tipo === "actividad" && seleccion.id === actividad.id;

          return (
            <div key={actividad.id}>
              <div className="flex items-center gap-1">
                {tieneSubs ? (
                  <button
                    type="button"
                    onClick={() => toggle(actividad.id)}
                    className="px-1 text-zinc-400"
                  >
                    {expandida ? "▼" : "▶"}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                <button
                  type="button"
                  onClick={() =>
                    onSeleccionar({ tipo: "actividad", id: actividad.id })
                  }
                  className={`flex-1 rounded-lg px-2 py-1.5 text-left ${
                    activa
                      ? "bg-ruralia-teal-border font-medium text-ruralia-teal-text"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  {actividad.nombre}
                  <span className="ml-2 text-xs text-zinc-400">
                    {actividad.progresoPorcentaje}%
                  </span>
                </button>
              </div>

              {expandida &&
                actividad.subactividades?.map((sub: SubactividadPlan) => {
                  const subActiva =
                    seleccion?.tipo === "subactividad" &&
                    seleccion.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        onSeleccionar({
                          tipo: "subactividad",
                          id: sub.id,
                          actividadId: actividad.id,
                        })
                      }
                      className={`ml-6 block w-[calc(100%-1.5rem)] rounded-lg px-2 py-1.5 text-left ${
                        subActiva
                          ? "bg-ruralia-teal-border font-medium text-ruralia-teal-text"
                          : "text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      · {sub.nombre}
                      <span className="ml-2 text-xs text-zinc-400">
                        {sub.progresoPorcentaje}%
                      </span>
                    </button>
                  );
                })}
            </div>
          );
        })
      )}
    </div>
  );
}
