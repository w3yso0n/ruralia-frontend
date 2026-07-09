"use client";

interface MedidorCircularProps {
  valor: number;
  etiqueta: string;
  subetiqueta?: string;
  color?: string;
  tamano?: number;
}

export function MedidorCircular({
  valor,
  etiqueta,
  subetiqueta,
  color = "#059669",
  tamano = 120,
}: MedidorCircularProps) {
  const porcentaje = Math.min(100, Math.max(0, valor));
  const radio = (tamano - 12) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;
  const centro = tamano / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: tamano, height: tamano }}>
        <svg width={tamano} height={tamano} className="-rotate-90">
          <circle
            cx={centro}
            cy={centro}
            r={radio}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth="8"
          />
          <circle
            cx={centro}
            cy={centro}
            r={radio}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-zinc-900">{porcentaje}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-800">{etiqueta}</p>
        {subetiqueta ? (
          <p className="text-xs text-zinc-500">{subetiqueta}</p>
        ) : null}
      </div>
    </div>
  );
}
