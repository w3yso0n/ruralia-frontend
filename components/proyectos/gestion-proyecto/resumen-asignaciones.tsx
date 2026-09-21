"use client";

import type { Proyecto } from "@/lib/types";

function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface ResumenAsignacionesProps {
  proyecto: Proyecto;
  puedeGestionar?: boolean;
  onIrAEquipo?: () => void;
}

export function ResumenAsignaciones({
  proyecto,
  puedeGestionar,
  onIrAEquipo,
}: ResumenAsignacionesProps) {
  const personal = proyecto.personal ?? [];

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">Equipo interno</h3>
          {puedeGestionar && onIrAEquipo ? (
            <button
              type="button"
              onClick={onIrAEquipo}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
            >
              Editar
            </button>
          ) : null}
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          Personas de la organización asignadas a ejecutar este proyecto.
        </p>
        {personal.length ? (
          <ul className="space-y-2">
            {personal.map((miembro) => (
              <li
                key={miembro.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ruralia-teal-border text-xs font-semibold text-ruralia-teal-text">
                  {iniciales(miembro.nombreCompleto)}
                </span>
                <span className="text-sm font-medium text-zinc-800">
                  {miembro.nombreCompleto}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Sin personal asignado.
            {puedeGestionar && onIrAEquipo ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onIrAEquipo}
                  className="font-semibold underline"
                >
                  Asignar equipo
                </button>
              </>
            ) : null}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">Contraparte</h3>
          {puedeGestionar && onIrAEquipo ? (
            <button
              type="button"
              onClick={onIrAEquipo}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
            >
              Editar
            </button>
          ) : null}
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          El proyecto puede tener varios beneficiarios y varias asociaciones.
          En cada jornada se elige a quién se atiende.
        </p>
        {proyecto.beneficiarios?.length ? (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
              Beneficiarios ({proyecto.beneficiarios.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {proyecto.beneficiarios.slice(0, 6).map((b) => (
                <li key={b.id} className="text-sm text-zinc-800">
                  {b.nombres} {b.apellidos}
                  {b.reemplazaA ? (
                    <span className="ml-1 text-xs text-amber-700">
                      (reemplazo de {b.reemplazaA.nombres}{" "}
                      {b.reemplazaA.apellidos})
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {proyecto.beneficiarios.length > 6 ? (
              <p className="mt-1 text-xs text-zinc-500">
                +{proyecto.beneficiarios.length - 6} más
              </p>
            ) : null}
          </div>
        ) : null}
        {proyecto.asociaciones?.length ? (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
              Asociaciones ({proyecto.asociaciones.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {proyecto.asociaciones.map((a) => (
                <li key={a.id} className="text-sm text-zinc-800">
                  {a.nombre}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!proyecto.beneficiarios?.length && !proyecto.asociaciones?.length ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Sin beneficiarios ni asociaciones asignados.
            {puedeGestionar && onIrAEquipo ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onIrAEquipo}
                  className="font-semibold underline"
                >
                  Definir contraparte
                </button>
              </>
            ) : null}
          </p>
        ) : null}
        {proyecto.veredas?.length ? (
          <p className="mt-4 text-sm text-zinc-600">
            <span className="text-zinc-400">Territorio: </span>
            {proyecto.veredas.map((v) => v.nombre).join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
