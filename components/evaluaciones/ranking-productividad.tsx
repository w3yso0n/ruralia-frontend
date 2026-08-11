"use client";

import Link from "next/link";
import type { ProductividadPersona } from "@/lib/types";

interface RankingProductividadProps {
  personas: ProductividadPersona[];
  compacto?: boolean;
  mostrarProyecto?: boolean;
  onSeleccionar?: (usuarioId: string) => void;
}

export function RankingProductividad({
  personas,
  compacto = false,
  mostrarProyecto = false,
  onSeleccionar,
}: RankingProductividadProps) {
  if (personas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aún no hay actividad o cuotas en este periodo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
            <th className="pb-3 pr-3 font-semibold">#</th>
            <th className="pb-3 pr-3 font-semibold">Agente</th>
            {mostrarProyecto ? (
              <th className="pb-3 pr-3 font-semibold">Proyecto</th>
            ) : null}
            <th className="pb-3 pr-3 font-semibold">Índice</th>
            <th className="pb-3 pr-3 font-semibold">Cumplim.</th>
            {!compacto ? (
              <>
                <th className="pb-3 pr-3 font-semibold">Jornadas</th>
                <th className="pb-3 pr-3 font-semibold">Benef.</th>
                <th className="pb-3 pr-3 font-semibold">Veredas</th>
                <th className="pb-3 pr-3 font-semibold">Evidencia</th>
                <th className="pb-3 pr-3 font-semibold">Rechazos</th>
                <th className="pb-3 font-semibold">Ritmo</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {personas.map((p, i) => (
            <tr
              key={`${p.usuarioId}-${p.proyectoId ?? ""}`}
              className="border-b border-zinc-50"
            >
              <td className="py-3 pr-3 text-zinc-400">{i + 1}</td>
              <td className="py-3 pr-3 font-medium text-zinc-800">
                {onSeleccionar ? (
                  <button
                    type="button"
                    onClick={() => onSeleccionar(p.usuarioId)}
                    className="text-left hover:text-ruralia-teal-text hover:underline"
                  >
                    {p.nombreCompleto}
                  </button>
                ) : (
                  <Link
                    href={`/evaluaciones?usuarioId=${p.usuarioId}&tab=ficha`}
                    className="hover:text-ruralia-teal-text hover:underline"
                  >
                    {p.nombreCompleto}
                  </Link>
                )}
              </td>
              {mostrarProyecto ? (
                <td className="py-3 pr-3 text-zinc-600">
                  {p.proyectoNombre ?? "—"}
                </td>
              ) : null}
              <td className="py-3 pr-3">
                <span className="font-bold text-ruralia-teal-text">
                  {p.indiceEficiencia ?? 0}
                </span>
              </td>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-ruralia-teal"
                      style={{
                        width: `${Math.min(p.cumplimientoPorcentaje, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-zinc-700">
                    {p.cumplimientoPorcentaje}%
                  </span>
                </div>
              </td>
              {!compacto ? (
                <>
                  <td className="py-3 pr-3 text-zinc-600">
                    {p.conteoJornadas}
                    <span className="text-xs text-zinc-400">
                      {" "}
                      / {p.jornadasAprobadas ?? 0} apr.
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">
                    {p.beneficiariosAtendidos}
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">
                    {p.veredasCubiertas}
                  </td>
                  <td className="py-3 pr-3 text-zinc-600">
                    {p.jornadasConEvidencia ?? 0}
                  </td>
                  <td
                    className={`py-3 pr-3 font-semibold ${
                      (p.rechazosRevision ?? 0) > 0
                        ? "text-red-700"
                        : "text-zinc-600"
                    }`}
                  >
                    {p.rechazosRevision ?? 0}
                  </td>
                  <td className="py-3 text-zinc-600">
                    {p.ritmoEjecucion ?? 0}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
