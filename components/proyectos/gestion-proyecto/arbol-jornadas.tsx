"use client";

import type { Jornada } from "@/lib/types";

interface ArbolJornadasProps {
  jornadas: Jornada[];
  jornadaSeleccionadaId: string | null;
  onSeleccionarJornada: (id: string) => void;
}

export function ArbolJornadas({
  jornadas,
  jornadaSeleccionadaId,
  onSeleccionarJornada,
}: ArbolJornadasProps) {
  if (!jornadas.length) {
    return (
      <p className="p-4 text-sm text-zinc-500">
        Aún no hay jornadas. Crea la primera visita de campo.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {jornadas.map((jornada) => {
        const activa = jornadaSeleccionadaId === jornada.id;
        const cancelada = jornada.estado === "CANCELADA";

        return (
          <div key={jornada.id}>
            <button
              type="button"
              onClick={() => onSeleccionarJornada(jornada.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                activa
                  ? "bg-ruralia-teal text-white"
                  : "hover:bg-ruralia-teal-soft text-zinc-800"
              }`}
            >
              <span>
                <span className="font-medium">
                  {new Date(jornada.fecha).toLocaleDateString("es-CO")}
                </span>
                <span
                  className={`ml-2 text-xs ${activa ? "text-white/85" : "text-zinc-400"}`}
                >
                  {jornada.vereda?.nombre ?? "Sin vereda"}
                </span>
                {jornada.tipo === "GRUPAL" ? (
                  <span
                    className={`ml-1.5 text-[10px] uppercase tracking-wide ${
                      activa ? "text-white/70" : "text-zinc-400"
                    }`}
                  >
                    · grupal
                  </span>
                ) : null}
              </span>
              <span
                className={`text-xs ${activa ? "text-white/85" : cancelada ? "text-red-500" : "text-zinc-500"}`}
              >
                {jornada.estado.replace(/_/g, " ")}
              </span>
            </button>

            {activa && jornada.meta ? (
              <div className="ml-3 mt-1 border-l-2 border-ruralia-teal-border pl-3 text-xs text-zinc-600">
                <p className="font-medium">{jornada.meta.nombre}</p>
                <p className="text-zinc-400">
                  {[
                    jornada.meta.actividadNombre,
                    jornada.meta.subactividadNombre,
                    jornada.meta.procesoNombre,
                  ]
                    .filter(Boolean)
                    .join(" → ")}
                  {jornada.meta.unidadMedida
                    ? ` · ${jornada.meta.unidadMedida}`
                    : ""}
                </p>
              </div>
            ) : null}

            {activa && !jornada.meta && jornada.actividades?.length ? (
              <ul className="ml-3 mt-1 space-y-1 border-l-2 border-ruralia-teal-border pl-3">
                {jornada.actividades.map((ja) => (
                  <li key={ja.id} className="text-xs text-zinc-600">
                    · {ja.actividad.nombre}
                    {ja.subactividad ? ` → ${ja.subactividad.nombre}` : ""}
                    <span className="ml-1 text-zinc-400">
                      ({ja.estadoEjecucion})
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
