"use client";

import type { JornadaRecienteDashboard, EstadoJornada } from "@/lib/types";

const ESTADO_JORNADA: Record<
  EstadoJornada,
  { etiqueta: string; clase: string }
> = {
  COMPLETADA: {
    etiqueta: "Completada",
    clase: "bg-ruralia-teal-soft text-ruralia-teal-text",
  },
  EN_PROGRESO: {
    etiqueta: "En progreso",
    clase: "bg-sky-50 text-sky-700",
  },
  PLANIFICADA: {
    etiqueta: "Planificada",
    clase: "bg-zinc-100 text-zinc-600",
  },
  CANCELADA: {
    etiqueta: "Cancelada",
    clase: "bg-red-50 text-red-700",
  },
};

interface TablaJornadasRecientesProps {
  jornadas: JornadaRecienteDashboard[];
}

export function TablaJornadasRecientes({
  jornadas,
}: TablaJornadasRecientesProps) {
  if (jornadas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay jornadas registradas aún.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
            <th className="pb-3 pr-4 font-semibold">Proyecto</th>
            <th className="pb-3 pr-4 font-semibold">Vereda</th>
            <th className="pb-3 pr-4 font-semibold">Técnico</th>
            <th className="pb-3 pr-4 font-semibold">Fecha</th>
            <th className="pb-3 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {jornadas.map((j) => {
            const est = ESTADO_JORNADA[j.estado] ?? ESTADO_JORNADA.PLANIFICADA;
            return (
              <tr key={j.id} className="border-b border-zinc-50">
                <td className="py-3 pr-4 font-medium text-zinc-800">
                  {j.proyectoNombre}
                </td>
                <td className="py-3 pr-4 text-zinc-600">{j.veredaNombre}</td>
                <td className="py-3 pr-4 text-zinc-600">{j.tecnico}</td>
                <td className="py-3 pr-4 text-zinc-600">{j.fecha}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${est.clase}`}
                  >
                    {est.etiqueta}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
