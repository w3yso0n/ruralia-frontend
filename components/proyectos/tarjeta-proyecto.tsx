"use client";

import Link from "next/link";
import type { Proyecto } from "@/lib/types";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function etiquetaEstado(estado: Proyecto["estado"]): string {
  const mapa: Record<Proyecto["estado"], string> = {
    BORRADOR: "Borrador",
    ACTIVO: "Activo",
    SUSPENDIDO: "Suspendido",
    COMPLETADO: "Completado",
  };
  return mapa[estado];
}

export function TarjetaProyecto({ proyecto }: { proyecto: Proyecto }) {
  const progreso = proyecto.progresoPorcentaje ?? 0;

  return (
    <article className="flex flex-col rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-sm transition hover:border-ruralia-teal-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900">{proyecto.nombre}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {proyecto.tipo.replace(/_/g, " ")}
          </p>
        </div>
        <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-xs font-medium text-ruralia-teal-text">
          {etiquetaEstado(proyecto.estado)}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-zinc-500">
          <span>Progreso del plan</span>
          <span>{progreso}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-ruralia-teal transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-zinc-600">
        {proyecto.beneficiarioPrincipal ? (
          <p>
            <span className="text-zinc-400">Contraparte: </span>
            Beneficiario — {proyecto.beneficiarioPrincipal.nombres}{" "}
            {proyecto.beneficiarioPrincipal.apellidos}
          </p>
        ) : proyecto.asociacionPrincipal ? (
          <p>
            <span className="text-zinc-400">Contraparte: </span>
            Asociación — {proyecto.asociacionPrincipal.nombre}
          </p>
        ) : (
          <p className="text-amber-700">Sin contraparte asignada</p>
        )}
        {!proyecto.personal?.length ? (
          <p className="text-amber-700">Sin equipo interno</p>
        ) : null}
      </div>

      {proyecto.personal && proyecto.personal.length > 0 ? (
        <div className="mt-4 flex -space-x-2">
          {proyecto.personal.slice(0, 4).map((miembro) => (
            <span
              key={miembro.id}
              title={miembro.nombreCompleto}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ruralia-teal-border text-xs font-semibold text-ruralia-teal-text"
            >
              {iniciales(miembro.nombreCompleto)}
            </span>
          ))}
          {proyecto.personal.length > 4 ? (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-xs text-zinc-600">
              +{proyecto.personal.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex gap-2 pt-2">
        <Link
          href={`/proyectos/${proyecto.id}`}
          className="flex-1 rounded-xl bg-ruralia-teal px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
        >
          Gestionar
        </Link>
      </div>
    </article>
  );
}
