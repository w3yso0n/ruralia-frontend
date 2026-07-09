"use client";

import type { MockJornadaReciente } from "@/lib/mock/dashboard-mock";

const ESTADO_JORNADA: Record<
  MockJornadaReciente["estado"],
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
};

interface TablaJornadasRecientesProps {
  jornadas: MockJornadaReciente[];
}

export function TablaJornadasRecientes({
  jornadas,
}: TablaJornadasRecientesProps) {
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
        <tbody className="divide-y divide-zinc-50">
          {jornadas.map((jornada) => {
            const estado = ESTADO_JORNADA[jornada.estado];
            return (
              <tr key={jornada.id} className="text-zinc-700">
                <td className="py-3 pr-4 font-medium text-zinc-900">
                  {jornada.proyectoNombre}
                </td>
                <td className="py-3 pr-4">{jornada.veredaNombre}</td>
                <td className="py-3 pr-4">{jornada.tecnico}</td>
                <td className="py-3 pr-4 tabular-nums">{jornada.fecha}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}
                  >
                    {estado.etiqueta}
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
