"use client";

import Link from "next/link";
import {
  Camera,
  ClipboardList,
  MapPinned,
  ShieldAlert,
  Target,
  Users,
  Zap,
} from "lucide-react";
import type { ProductividadPersona } from "@/lib/types";

interface ListaAgentesEficientesProps {
  personas: ProductividadPersona[];
  onSeleccionar?: (usuarioId: string) => void;
  limite?: number;
  titulo?: string;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function medalla(puesto: number): string {
  if (puesto === 1) return "1.º";
  if (puesto === 2) return "2.º";
  if (puesto === 3) return "3.º";
  return `${puesto}.º`;
}

function etiquetaEficiencia(indice: number): {
  texto: string;
  clase: string;
} {
  if (indice >= 80)
    return {
      texto: "Elite de campo",
      clase: "bg-ruralia-teal-soft text-ruralia-teal-text",
    };
  if (indice >= 60)
    return {
      texto: "Alto rendimiento",
      clase: "bg-emerald-50 text-emerald-800",
    };
  if (indice >= 40)
    return { texto: "En ritmo", clase: "bg-amber-50 text-amber-800" };
  return { texto: "Por impulsar", clase: "bg-zinc-100 text-zinc-600" };
}

export function ListaAgentesEficientes({
  personas,
  onSeleccionar,
  limite = 8,
  titulo = "Agentes de campo más eficientes",
}: ListaAgentesEficientesProps) {
  const top = personas.slice(0, limite);

  if (top.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aún no hay actividad de campo en este periodo para armar el ranking.
      </p>
    );
  }

  const lider = top[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{titulo}</h3>
          <p className="mt-0.5 text-sm text-zinc-500">
            Índice de eficiencia: cumplimiento, jornadas, beneficiarios,
            evidencias, cobertura y formularios
          </p>
        </div>
        {lider ? (
          <p className="text-sm text-zinc-600">
            Líder del periodo:{" "}
            <span className="font-semibold text-ruralia-teal-text">
              {lider.nombreCompleto}
            </span>{" "}
            ({lider.indiceEficiencia} pts)
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {top.map((p, i) => {
          const badge = etiquetaEficiencia(p.indiceEficiencia);
          const Nombre = onSeleccionar ? (
            <button
              type="button"
              onClick={() => onSeleccionar(p.usuarioId)}
              className="text-left font-semibold text-zinc-900 hover:text-ruralia-teal-text hover:underline"
            >
              {p.nombreCompleto}
            </button>
          ) : (
            <Link
              href={`/evaluaciones?usuarioId=${p.usuarioId}&tab=ficha`}
              className="font-semibold text-zinc-900 hover:text-ruralia-teal-text hover:underline"
            >
              {p.nombreCompleto}
            </Link>
          );

          return (
            <article
              key={`${p.usuarioId}-${p.proyectoId ?? i}`}
              className={`rounded-2xl border p-4 transition ${
                i === 0
                  ? "border-ruralia-teal bg-gradient-to-br from-ruralia-teal-soft/80 to-white shadow-sm"
                  : "border-ruralia-teal-border bg-white"
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0
                      ? "bg-ruralia-teal text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {iniciales(p.nombreCompleto)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-900/5 px-1.5 py-0.5 text-xs font-bold text-zinc-600">
                      {medalla(i + 1)}
                    </span>
                    {Nombre}
                  </div>
                  {p.proyectoNombre ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {p.proyectoNombre}
                    </p>
                  ) : null}
                  <span
                    className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.clase}`}
                  >
                    {badge.texto}
                  </span>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 text-2xl font-bold text-ruralia-teal-text">
                    <Zap className="h-4 w-4" />
                    {p.indiceEficiencia}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">
                    índice
                  </p>
                </div>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-ruralia-teal"
                  style={{
                    width: `${Math.min(p.indiceEficiencia, 100)}%`,
                  }}
                />
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <MetricaMini
                  icono={Target}
                  etiqueta="Cumplimiento"
                  valor={`${p.cumplimientoPorcentaje}%`}
                />
                <MetricaMini
                  icono={ClipboardList}
                  etiqueta="Jornadas"
                  valor={`${p.conteoJornadas} (${p.jornadasAprobadas} apr.)`}
                />
                <MetricaMini
                  icono={Users}
                  etiqueta="Beneficiarios"
                  valor={`${p.beneficiariosAtendidos}`}
                />
                <MetricaMini
                  icono={MapPinned}
                  etiqueta="Veredas"
                  valor={`${p.veredasCubiertas}`}
                />
                <MetricaMini
                  icono={Camera}
                  etiqueta="Con evidencia"
                  valor={`${p.jornadasConEvidencia}`}
                />
                <MetricaMini
                  icono={ShieldAlert}
                  etiqueta="Rechazos"
                  valor={`${p.rechazosRevision ?? 0}`}
                />
                <MetricaMini
                  icono={Zap}
                  etiqueta="Ritmo / jornada"
                  valor={`${p.ritmoEjecucion}`}
                />
              </dl>

              <p className="mt-3 text-[11px] text-zinc-500">
                Prom. {p.promedioBeneficiariosPorJornada} beneficiarios/jornada
                · {p.formulariosEnviados} formularios enviados
                {(p.rechazosRevision ?? 0) > 0
                  ? ` · ${p.rechazosRevision} rechazo(s) en revisión`
                  : ""}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MetricaMini({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 px-2.5 py-2">
      <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-400">
        <Icono className="h-3 w-3" />
        {etiqueta}
      </dt>
      <dd className="mt-0.5 font-semibold text-zinc-800">{valor}</dd>
    </div>
  );
}
