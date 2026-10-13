"use client";

import { Building2, Calendar, MapPin, UserRound, Users } from "lucide-react";
import { nombreLugarJornada } from "@/components/proyectos/gestion-proyecto/selector-lugar-jornada";
import {
  EstadoJornadaPill,
  formatearFechaJornada,
} from "@/components/proyectos/gestion-proyecto/estado-jornada";
import type { Jornada } from "@/lib/types";

interface ArbolJornadasProps {
  jornadas: Jornada[];
  jornadaSeleccionadaId: string | null;
  onSeleccionarJornada: (id: string) => void;
}

type ItemArbol =
  | { tipo: "simple"; jornada: Jornada }
  | { tipo: "grupo"; grupoId: string; jornadas: Jornada[] };

function construirItems(jornadas: Jornada[]): ItemArbol[] {
  const usados = new Set<string>();
  const items: ItemArbol[] = [];

  for (const jornada of jornadas) {
    if (usados.has(jornada.id)) continue;

    if (jornada.grupoJornadaId) {
      const delGrupo = jornadas.filter(
        (j) => j.grupoJornadaId === jornada.grupoJornadaId,
      );
      for (const j of delGrupo) usados.add(j.id);
      items.push({
        tipo: "grupo",
        grupoId: jornada.grupoJornadaId,
        jornadas: delGrupo,
      });
      continue;
    }

    usados.add(jornada.id);
    items.push({ tipo: "simple", jornada });
  }

  return items;
}

function etiquetaTitulo(jornada: Jornada) {
  return jornada.nombre?.trim()
    ? jornada.nombre
    : `Jornada del ${formatearFechaJornada(jornada.fecha)}`;
}

function elegirJornadaGrupo(grupo: Jornada[]): Jornada {
  return grupo.find((j) => j.estado !== "CANCELADA") ?? grupo[0];
}

function DetallesJornada({
  jornada,
  activa = false,
}: {
  jornada: Jornada;
  activa?: boolean;
}) {
  const tono = activa ? "text-white/85" : "text-zinc-500";
  const icono = activa ? "text-white/70" : "text-ruralia-teal-muted";

  return (
    <span
      className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${tono}`}
    >
      <span className="inline-flex items-center gap-1">
        <Calendar className={`h-3.5 w-3.5 shrink-0 ${icono}`} />
        {formatearFechaJornada(jornada.fecha)}
      </span>
      <span className="inline-flex min-w-0 items-center gap-1">
        <MapPin className={`h-3.5 w-3.5 shrink-0 ${icono}`} />
        <span className="truncate">{nombreLugarJornada(jornada)}</span>
      </span>
    </span>
  );
}

function FilaJornada({
  jornada,
  activa,
  onSeleccionar,
}: {
  jornada: Jornada;
  activa: boolean;
  onSeleccionar: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
        activa
          ? "border-ruralia-teal bg-ruralia-teal text-white"
          : "border-transparent text-zinc-900 hover:border-ruralia-teal-border hover:bg-ruralia-teal-soft/50"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-sm font-semibold leading-snug">
          {etiquetaTitulo(jornada)}
        </span>
        <EstadoJornadaPill estado={jornada.estado} sobreTeal={activa} />
      </span>
      <DetallesJornada jornada={jornada} activa={activa} />
      {jornada.tipo === "GRUPAL" ? (
        <span
          className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium ${
            activa ? "text-white/85" : "text-ruralia-teal-text"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Actividad grupal
        </span>
      ) : null}
    </button>
  );
}

/** Nombre que distingue a una jornada dentro de su grupo. */
export function etiquetaJornadaDeGrupo(
  jornada: Pick<
    Jornada,
    "beneficiarios" | "asociaciones" | "tecnicoResponsable"
  >,
  sinAgente: string,
): string {
  const participantes = jornada.beneficiarios?.length
    ? jornada.beneficiarios
    : jornada.asociaciones;
  if (participantes?.length) {
    return participantes.map((p) => p.nombre).join(", ");
  }
  return jornada.tecnicoResponsable?.nombre ?? sinAgente;
}

export function ArbolJornadas({
  jornadas,
  jornadaSeleccionadaId,
  onSeleccionarJornada,
}: ArbolJornadasProps) {
  if (!jornadas.length) {
    return (
      <p className="p-4 text-sm text-zinc-500">
        Aún no hay jornadas. Crea la primera visita de campo.
      </p>
    );
  }

  const items = construirItems(jornadas);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        if (item.tipo === "simple") {
          const jornada = item.jornada;
          const activa = jornadaSeleccionadaId === jornada.id;

          return (
            <div key={jornada.id}>
              <FilaJornada
                jornada={jornada}
                activa={activa}
                onSeleccionar={() => onSeleccionarJornada(jornada.id)}
              />
              {activa && jornada.meta ? (
                <div className="ml-3 mt-1 border-l-2 border-ruralia-teal-border pl-3 text-xs text-zinc-600">
                  <p className="font-medium">{jornada.meta.nombre}</p>
                  <p className="text-zinc-400">
                    {[
                      jornada.meta.actividadNombre,
                      jornada.meta.subactividadNombre,
                      jornada.meta.procesoNombre,
                    ]
                      .filter(Boolean)
                      .join(" → ")}
                    {jornada.meta.unidadMedida
                      ? ` · ${jornada.meta.unidadMedida}`
                      : ""}
                  </p>
                </div>
              ) : null}
              {activa && !jornada.meta && jornada.actividades?.length ? (
                <ul className="ml-3 mt-1 space-y-1 border-l-2 border-ruralia-teal-border pl-3">
                  {jornada.actividades.map((ja) => (
                    <li key={ja.id} className="text-xs text-zinc-600">
                      · {ja.actividad.nombre}
                      {ja.subactividad ? ` → ${ja.subactividad.nombre}` : ""}
                      <span className="ml-1 text-zinc-400">
                        ({ja.estadoEjecucion})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }

        const representativa = item.jornadas[0];
        const porBeneficiario = item.jornadas.some(
          (j) => (j.beneficiarios?.length ?? 0) > 0,
        );
        const porAsociacion = item.jornadas.some(
          (j) => (j.asociaciones?.length ?? 0) > 0,
        );
        const grupoActivo = item.jornadas.some(
          (j) => j.id === jornadaSeleccionadaId,
        );

        return (
          <div
            key={item.grupoId}
            className="rounded-xl border border-ruralia-teal-border/70 p-1"
          >
            <button
              type="button"
              onClick={() =>
                onSeleccionarJornada(elegirJornadaGrupo(item.jornadas).id)
              }
              className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                grupoActivo ? "bg-ruralia-teal-soft" : "hover:bg-zinc-50"
              }`}
            >
              <span className="block text-sm font-semibold leading-snug text-zinc-900">
                {etiquetaTitulo(representativa)}
              </span>
              <DetallesJornada jornada={representativa} />
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text ring-1 ring-ruralia-teal-border">
                {porBeneficiario ? (
                  <UserRound className="h-3.5 w-3.5" />
                ) : porAsociacion ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
                {item.jornadas.length}{" "}
                {porBeneficiario
                  ? "beneficiarios"
                  : porAsociacion
                    ? "asociaciones"
                    : "agentes"}
              </span>
            </button>

            <div className="mt-1 space-y-0.5 border-l-2 border-ruralia-teal-border ml-3 pl-2">
              {item.jornadas.map((jornada) => {
                const activa = jornadaSeleccionadaId === jornada.id;
                return (
                  <button
                    key={jornada.id}
                    type="button"
                    onClick={() => onSeleccionarJornada(jornada.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                      activa
                        ? "bg-ruralia-teal text-white"
                        : "text-zinc-800 hover:bg-ruralia-teal-soft"
                    }`}
                  >
                    <span className="min-w-0 truncate font-medium">
                      {etiquetaJornadaDeGrupo(jornada, "Sin agente")}
                    </span>
                    <EstadoJornadaPill
                      estado={jornada.estado}
                      sobreTeal={activa}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
