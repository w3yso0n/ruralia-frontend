"use client";

import type { MockSerieMensual } from "@/lib/mock/dashboard-mock";

interface GraficaActividadMensualProps {
  datos: MockSerieMensual[];
}

export function GraficaActividadMensual({ datos }: GraficaActividadMensualProps) {
  const maxJornadas = Math.max(...datos.map((d) => d.jornadas), 1);
  const maxFormularios = Math.max(...datos.map((d) => d.formularios), 1);
  const altura = 160;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2" style={{ height: altura }}>
        {datos.map((punto) => {
          const hJornadas = (punto.jornadas / maxJornadas) * (altura - 24);
          const hFormularios = (punto.formularios / maxFormularios) * (altura - 24);

          return (
            <div
              key={punto.mes}
              className="flex flex-1 flex-col items-center justify-end gap-1"
            >
              <div className="flex w-full items-end justify-center gap-0.5">
                <div
                  className="w-2.5 rounded-t bg-ruralia-teal sm:w-3"
                  style={{ height: hJornadas }}
                  title={`${punto.jornadas} jornadas`}
                />
                <div
                  className="w-2.5 rounded-t bg-ruralia-teal-muted sm:w-3"
                  style={{ height: hFormularios }}
                  title={`${punto.formularios} formularios`}
                />
              </div>
              <span className="text-xs font-medium text-zinc-500">{punto.mes}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ruralia-teal" />
          Jornadas de campo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ruralia-teal-muted" />
          Formularios capturados
        </span>
      </div>
    </div>
  );
}
