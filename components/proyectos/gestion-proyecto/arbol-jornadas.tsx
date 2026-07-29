"use client";

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
    : new Date(jornada.fecha).toLocaleDateString("es-CO");
}

function elegirJornadaGrupo(grupo: Jornada[]): Jornada {
  return (
    grupo.find((j) => j.estado !== "CANCELADA") ?? grupo[0]
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
  const cancelada = jornada.estado === "CANCELADA";

  return (
    <button
      type="button"
      onClick={onSeleccionar}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
        activa
          ? "bg-ruralia-teal text-white"
          : "hover:bg-ruralia-teal-soft text-zinc-800"
      }`}
    >
      <span>
        <span className="font-medium">{etiquetaTitulo(jornada)}</span>
        {jornada.nombre?.trim() ? (
          <span
            className={`ml-2 text-xs ${activa ? "text-white/85" : "text-zinc-400"}`}
          >
            {new Date(jornada.fecha).toLocaleDateString("es-CO")}
          </span>
        ) : null}
        <span
          className={`ml-2 text-xs ${activa ? "text-white/85" : "text-zinc-400"}`}
        >
          {jornada.vereda?.nombre ?? "Sin vereda"}
        </span>
        {jornada.tipo === "GRUPAL" ? (
          <span
            className={`ml-1.5 text-[10px] uppercase tracking-wide ${
              activa ? "text-white/70" : "text-zinc-400"
            }`}
          >
            · grupal
          </span>
        ) : null}
      </span>
      <span
        className={`text-xs ${activa ? "text-white/85" : cancelada ? "text-red-500" : "text-zinc-500"}`}
      >
        {jornada.estado.replace(/_/g, " ")}
      </span>
    </button>
  );
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
        const grupoActivo = item.jornadas.some(
          (j) => j.id === jornadaSeleccionadaId,
        );

        return (
          <div
            key={item.grupoId}
            className="rounded-xl border border-zinc-100 p-1"
          >
            <button
              type="button"
              onClick={() =>
                onSeleccionarJornada(elegirJornadaGrupo(item.jornadas).id)
              }
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                grupoActivo
                  ? "bg-ruralia-teal-soft text-zinc-900"
                  : "hover:bg-zinc-50 text-zinc-800"
              }`}
            >
              <span>
                <span className="font-medium">
                  {etiquetaTitulo(representativa)}
                </span>
                {representativa.nombre?.trim() ? (
                  <span className="ml-2 text-xs text-zinc-400">
                    {new Date(representativa.fecha).toLocaleDateString("es-CO")}
                  </span>
                ) : null}
                <span className="ml-2 text-xs text-zinc-400">
                  {representativa.vereda?.nombre ?? "Sin vereda"}
                </span>
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                {item.jornadas.length} agentes
              </span>
            </button>

            <div className="mt-1 space-y-1 pl-2">
              {item.jornadas.map((jornada) => {
                const activa = jornadaSeleccionadaId === jornada.id;
                const cancelada = jornada.estado === "CANCELADA";
                return (
                  <button
                    key={jornada.id}
                    type="button"
                    onClick={() => onSeleccionarJornada(jornada.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      activa
                        ? "bg-ruralia-teal text-white"
                        : "hover:bg-ruralia-teal-soft text-zinc-800"
                    }`}
                  >
                    <span className="font-medium">
                      {jornada.tecnicoResponsable?.nombre ?? "Sin agente"}
                    </span>
                    <span
                      className={`text-xs ${
                        activa
                          ? "text-white/85"
                          : cancelada
                            ? "text-red-500"
                            : "text-zinc-500"
                      }`}
                    >
                      {jornada.estado.replace(/_/g, " ")}
                    </span>
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
