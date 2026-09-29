"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AsignacionMeta } from "@/lib/types";

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface Nivel {
  texto: string;
  clase: string;
  icono: LucideIcon;
}

/** Nivel del índice de eficiencia (0-100); siempre se muestra con icono y texto. */
export function nivelIndice(indice: number): Nivel {
  if (indice >= 80)
    return {
      texto: "Destacado",
      clase: "bg-ruralia-teal text-white",
      icono: TrendingUp,
    };
  if (indice >= 60)
    return {
      texto: "Alto rendimiento",
      clase: "bg-ruralia-teal-soft text-ruralia-teal-text",
      icono: TrendingUp,
    };
  if (indice >= 40)
    return { texto: "En ritmo", clase: "bg-zinc-100 text-zinc-700", icono: Minus };
  return {
    texto: "Por impulsar",
    clase: "bg-amber-50 text-amber-800",
    icono: TrendingDown,
  };
}

export function BadgeNivel({ indice }: { indice: number }) {
  const nivel = nivelIndice(indice);
  const Icono = nivel.icono;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${nivel.clase}`}
    >
      <Icono className="h-3 w-3" />
      {nivel.texto}
    </span>
  );
}

/** Anillo con el índice 0-100 al centro. */
export function AnilloIndice({
  valor,
  tamano = 44,
}: {
  valor: number;
  tamano?: number;
}) {
  const grosor = tamano >= 60 ? 6 : 4;
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const progreso = Math.max(0, Math.min(valor, 100)) / 100;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: tamano, height: tamano }}
      title={`Índice de eficiencia: ${valor} de 100`}
    >
      <svg width={tamano} height={tamano} className="-rotate-90">
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          className="stroke-ruralia-teal-soft"
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - progreso)}
          className="stroke-ruralia-teal"
        />
      </svg>
      <span
        className={`absolute font-semibold text-zinc-900 ${
          tamano >= 60 ? "text-lg" : "text-xs"
        }`}
      >
        {valor}
      </span>
    </span>
  );
}

/** Barra de avance: relleno teal sobre pista suave, tope visual en 100%. */
export function BarraAvance({
  porcentaje,
  grosor = "h-2",
}: {
  porcentaje: number;
  grosor?: string;
}) {
  const ancho = Math.max(0, Math.min(porcentaje, 100));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-ruralia-teal-soft ${grosor}`}
      role="progressbar"
      aria-valuenow={Math.round(porcentaje)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-ruralia-teal transition-[width]"
        style={{ width: `${ancho}%` }}
      />
    </div>
  );
}

export function esCuotaTotal(a: Pick<AsignacionMeta, "anio" | "mes">) {
  return a.anio == null || a.mes == null;
}

/**
 * Estado de una cuota. Las cuotas totales del proyecto siguen "en curso"
 * hasta alcanzarse; las mensuales se juzgan contra su mes.
 */
export function estadoCuota(a: AsignacionMeta): Nivel {
  if (a.cumplimientoPorcentaje >= 100)
    return {
      texto: "Cumplida",
      clase: "bg-ruralia-teal-soft text-ruralia-teal-text",
      icono: CheckCircle2,
    };
  if (esCuotaTotal(a))
    return { texto: "En curso", clase: "bg-zinc-100 text-zinc-700", icono: Clock };
  if (a.ejecutado <= 0)
    return { texto: "Sin avance", clase: "bg-red-50 text-red-700", icono: XCircle };
  return {
    texto: "Por debajo",
    clase: "bg-amber-50 text-amber-800",
    icono: AlertTriangle,
  };
}

export function formatearNumero(valor: number): string {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(
    valor,
  );
}
