"use client";

interface MetricaNumericaProps {
  valor: number | string;
  etiqueta: string;
  subetiqueta?: string;
}

/** Contador absoluto (no porcentaje) — p. ej. jornadas del mes. */
export function MetricaNumerica({
  valor,
  etiqueta,
  subetiqueta,
}: MetricaNumericaProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-[120px] w-[120px] flex-col items-center justify-center rounded-full border-4 border-ruralia-teal-border bg-ruralia-teal-soft">
        <span className="text-3xl font-bold text-ruralia-teal-text">{valor}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-800">{etiqueta}</p>
        {subetiqueta ? (
          <p className="text-xs text-zinc-500">{subetiqueta}</p>
        ) : null}
      </div>
    </div>
  );
}
