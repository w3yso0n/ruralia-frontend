"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  User,
  ClipboardList,
} from "lucide-react";
import { Modal, Spinner } from "@/components/ui/modal";
import { ResultadosJornada } from "@/components/proyectos/gestion-proyecto/resultados-jornada";
import { obtenerJornada } from "@/lib/api";
import type { EstadoFuncional, Jornada } from "@/lib/types";

interface ModalDetalleJornadaRevisionProps {
  abierto: boolean;
  onCerrar: () => void;
  token: string;
  jornadaId: string;
  estadoFuncional?: EstadoFuncional;
}

function etiquetaEstado(estado: string): string {
  const mapa: Record<string, string> = {
    BORRADOR: "Borrador",
    CAPTURADO: "Capturado",
    SINCRONIZADO: "Sincronizado",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
    EN_CORRECCION: "En corrección",
    PLANIFICADA: "Pendiente",
    EN_PROGRESO: "En curso",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada",
  };
  return mapa[estado] ?? estado.replaceAll("_", " ");
}

export function ModalDetalleJornadaRevision({
  abierto,
  onCerrar,
  token,
  jornadaId,
  estadoFuncional,
}: ModalDetalleJornadaRevisionProps) {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || !token || !jornadaId) {
      setJornada(null);
      setError(null);
      return;
    }

    let cancelado = false;
    void (async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await obtenerJornada(token, jornadaId);
        if (!cancelado) setJornada(data);
      } catch (e) {
        if (!cancelado) {
          setJornada(null);
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo cargar el detalle de la jornada",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [abierto, token, jornadaId]);

  const estadoMostrar =
    estadoFuncional ?? jornada?.estadoFuncional ?? jornada?.estado;

  return (
    <Modal
      titulo="Detalle de captura"
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="xl"
    >
      {cargando ? (
        <div className="flex justify-center py-16">
          <Spinner className="py-0" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!cargando && !error && jornada ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {jornada.nombre?.trim() ||
                    jornada.meta?.nombre ||
                    "Jornada de campo"}
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {jornada.proyecto?.nombre}
                  {jornada.meta?.procesoNombre
                    ? ` · ${jornada.meta.procesoNombre}`
                    : ""}
                </p>
              </div>
              {estadoMostrar ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ruralia-teal-text ring-1 ring-ruralia-teal-border">
                  {etiquetaEstado(estadoMostrar)}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                {new Date(jornada.fecha).toLocaleDateString("es-CO", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {jornada.vereda?.nombre ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                  {jornada.vereda.nombre}
                </span>
              ) : null}
              {jornada.tecnicoResponsable?.nombre ? (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                  {jornada.tecnicoResponsable.nombre}
                </span>
              ) : null}
              {jornada.tipo === "GRUPAL" ? (
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-ruralia-teal-muted" />
                  Actividad grupal
                </span>
              ) : null}
            </div>

            {jornada.observaciones?.trim() ? (
              <p className="mt-3 rounded-xl border border-ruralia-teal-border bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="font-medium text-zinc-500">Observaciones: </span>
                {jornada.observaciones}
              </p>
            ) : null}
          </div>

          {jornada.tipo === "GRUPAL" &&
          Array.isArray(jornada.asistentes) &&
          jornada.asistentes.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-zinc-800">
                Lista de asistencia ({jornada.asistentes.length})
              </h4>
              <ul className="mt-3 divide-y divide-zinc-100">
                {jornada.asistentes
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="font-medium text-zinc-900">
                        {a.nombreCompleto}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {a.documento ? `Doc. ${a.documento}` : "Sin documento"}
                        {a.firmaDataUrl ? " · Con firma" : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          <ResultadosJornada token={token} jornada={jornada} />
        </div>
      ) : null}
    </Modal>
  );
}
