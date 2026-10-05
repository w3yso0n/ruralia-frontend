"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FolderKanban,
  MapPin,
  Target,
} from "lucide-react";
import { listarJornadas } from "@/lib/api";
import type { EstadoFuncional, EstadoJornada, Jornada } from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoJornada, string> = {
  PLANIFICADA: "Planificada",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

const ETIQUETA_REVISION: Record<EstadoFuncional, string> = {
  BORRADOR: "Sin enviar",
  CAPTURADO: "Capturada",
  SINCRONIZADO: "Sincronizada",
  EN_REVISION: "En revisión",
  APROBADO: "Aprobada",
  RECHAZADO: "Rechazada",
  EN_CORRECCION: "En corrección",
};

function claseRevision(estado: EstadoFuncional): string {
  if (estado === "RECHAZADO") return "bg-red-50 text-red-700";
  if (estado === "EN_CORRECCION") return "bg-amber-50 text-amber-800";
  if (estado === "APROBADO") {
    return "bg-ruralia-teal-soft text-ruralia-teal-text";
  }
  return "bg-zinc-100 text-zinc-600";
}

export function formatearFechaJornada(fecha: string): string {
  const valor = fecha.length === 10 ? `${fecha}T00:00:00` : fecha;
  const date = new Date(valor);
  if (Number.isNaN(date.getTime())) return fecha;
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Todas las jornadas visibles para el usuario. Para el técnico el backend ya
 * devuelve solo aquellas donde es responsable o parte del equipo.
 */
export async function cargarJornadasPropias(
  token: string,
  proyectoId?: string,
): Promise<Jornada[]> {
  const todas: Jornada[] = [];
  let pagina = 1;
  let totalPaginas = 1;
  do {
    const respuesta = await listarJornadas(token, {
      proyectoId,
      pagina,
      limite: 100,
    });
    todas.push(...respuesta.datos);
    totalPaginas = respuesta.totalPaginas;
    pagina += 1;
  } while (pagina <= totalPaginas && pagina <= 20);
  return todas;
}

function Dato({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor?: string | null;
}) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-xs text-zinc-500">{etiqueta}</dt>
      <dd className="text-sm text-zinc-800">{valor}</dd>
    </div>
  );
}

function TarjetaJornada({
  jornada,
  mostrarProyecto,
}: {
  jornada: Jornada;
  mostrarProyecto: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const actividad =
    jornada.meta?.actividadNombre ??
    jornada.actividades?.[0]?.actividad?.nombre ??
    null;
  const lugar = jornada.vereda?.nombre ?? jornada.geocerca?.nombre ?? null;
  const revision = jornada.requiereRevision
    ? jornada.estadoFuncional
    : undefined;

  return (
    <li className="rounded-2xl border border-ruralia-teal-border bg-white">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-start justify-between gap-4 rounded-2xl p-4 text-left transition hover:bg-ruralia-teal-soft/40"
        aria-expanded={abierta}
      >
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-zinc-900">
            {jornada.nombre || actividad || "Jornada de campo"}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-ruralia-teal-muted" />
              {formatearFechaJornada(jornada.fecha)}
            </span>
            {lugar ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                {lugar}
              </span>
            ) : null}
            {mostrarProyecto && jornada.proyecto ? (
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                {jornada.proyecto.nombre}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-semibold text-ruralia-teal-text">
            {ETIQUETA_ESTADO[jornada.estado] ?? jornada.estado}
          </span>
          {revision ? (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${claseRevision(revision)}`}
            >
              {ETIQUETA_REVISION[revision] ?? revision}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-zinc-400 transition ${abierta ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {abierta ? (
        <div className="border-t border-ruralia-teal-border px-4 pb-4 pt-3">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato
              etiqueta="Tipo"
              valor={
                jornada.tipo === "GRUPAL"
                  ? "Grupal"
                  : jornada.tipo === "INDIVIDUAL"
                    ? "Individual"
                    : null
              }
            />
            <Dato etiqueta="Actividad" valor={actividad} />
            <Dato etiqueta="Meta" valor={jornada.meta?.nombre} />
            <Dato
              etiqueta="Cantidad ejecutada"
              valor={
                jornada.cantidadEjecutada !== undefined && jornada.meta
                  ? `${jornada.cantidadEjecutada} ${jornada.meta.unidadMedida}`
                  : null
              }
            />
            <Dato
              etiqueta="Formulario"
              valor={jornada.plantillaFormulario?.nombre}
            />
            <Dato
              etiqueta="Beneficiarios"
              valor={
                jornada.beneficiarios?.length
                  ? jornada.beneficiarios.map((b) => b.nombre).join(", ")
                  : null
              }
            />
            <Dato
              etiqueta="Asociaciones"
              valor={
                jornada.asociaciones?.length
                  ? jornada.asociaciones.map((a) => a.nombre).join(", ")
                  : null
              }
            />
            <Dato etiqueta="Observaciones" valor={jornada.observaciones} />
          </dl>
          {revision === "RECHAZADO" || revision === "EN_CORRECCION" ? (
            <Link
              href="/revision"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
            >
              <ClipboardList className="h-4 w-4" />
              Ver observaciones en Revisión
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function ListaJornadasTecnico({
  jornadas,
  mostrarProyecto = false,
  mensajeVacio = "No tienes jornadas asignadas.",
}: {
  jornadas: Jornada[];
  mostrarProyecto?: boolean;
  mensajeVacio?: string;
}) {
  if (!jornadas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white p-10 text-center">
        <Target className="mx-auto h-6 w-6 text-ruralia-teal-muted" />
        <p className="mt-2 text-sm text-zinc-600">{mensajeVacio}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {jornadas.map((jornada) => (
        <TarjetaJornada
          key={jornada.id}
          jornada={jornada}
          mostrarProyecto={mostrarProyecto}
        />
      ))}
    </ul>
  );
}
