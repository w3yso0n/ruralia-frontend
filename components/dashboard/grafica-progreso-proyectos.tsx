"use client";

import type { MockProgresoProyecto } from "@/lib/mock/dashboard-mock";

const COLOR_TIPO: Record<string, string> = {
  AGRICOLA: "bg-emerald-500",
  AMBIENTAL: "bg-teal-600",
  TURISMO: "bg-lime-500",
  OTRO: "bg-zinc-400",
};

interface GraficaProgresoProyectosProps {
  datos: MockProgresoProyecto[];
}

export function GraficaProgresoProyectos({
  datos,
}: GraficaProgresoProyectosProps) {
  return (
    <div className="space-y-4">
      {datos.map((proyecto) => (
        <div key={proyecto.proyectoId}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {proyecto.nombre}
              </p>
              <p className="text-xs text-zinc-500">
                {proyecto.conteoBeneficiarios} beneficiarios vinculados
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-emerald-700">
              {proyecto.progresoPorcentaje}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all ${COLOR_TIPO[proyecto.tipo] ?? COLOR_TIPO.OTRO}`}
              style={{ width: `${proyecto.progresoPorcentaje}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
