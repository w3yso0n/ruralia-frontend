"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  cargarJornadasPropias,
  formatearFechaJornada,
  ListaJornadasTecnico,
} from "@/components/tecnico/lista-jornadas-tecnico";
import { obtenerProyecto } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { EstadoProyecto, Jornada, Proyecto } from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  BORRADOR: "Borrador",
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  COMPLETADO: "Completado",
};

/**
 * Vista de solo consulta para el técnico: datos generales del proyecto y
 * únicamente sus propias jornadas. Sin equipo, beneficiarios, plan,
 * territorio, expediente ni acciones de edición.
 */
export function VistaProyectoTecnico({ proyectoId }: { proyectoId: string }) {
  const { token } = useAuth();
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    Promise.all([
      obtenerProyecto(token, proyectoId),
      cargarJornadasPropias(token, proyectoId),
    ])
      .then(([p, j]) => {
        if (!vivo) return;
        setProyecto(p);
        setJornadas(j);
      })
      .catch((err) => {
        if (vivo) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el proyecto",
          );
        }
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [token, proyectoId]);

  if (cargando) return <Spinner />;
  if (!proyecto) {
    return (
      <div className="space-y-4">
        <Alerta mensaje={error ?? "Proyecto no encontrado"} />
        <Link
          href="/proyectos"
          className="inline-block text-sm font-medium text-ruralia-teal-text underline-offset-2 hover:underline"
        >
          Volver a proyectos
        </Link>
      </div>
    );
  }

  return (
    <>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/proyectos" className="hover:text-ruralia-teal-text">
          Proyectos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{proyecto.nombre}</span>
      </nav>

      <div className="mb-6 rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900">
              {proyecto.nombre}
            </h2>
            {proyecto.descripcion ? (
              <p className="mt-1 text-sm text-zinc-600">
                {proyecto.descripcion}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-xs font-semibold text-ruralia-teal-text">
            {ETIQUETA_ESTADO[proyecto.estado]}
          </span>
        </div>
        {proyecto.fechaInicio || proyecto.fechaFin ? (
          <p className="mt-3 text-sm text-zinc-600">
            <span className="text-zinc-500">Vigencia: </span>
            {proyecto.fechaInicio
              ? formatearFechaJornada(proyecto.fechaInicio)
              : "Sin inicio"}
            {" - "}
            {proyecto.fechaFin
              ? formatearFechaJornada(proyecto.fechaFin)
              : "Sin cierre"}
          </p>
        ) : null}
        <p className="mt-4 flex items-start gap-2 text-xs text-zinc-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ruralia-teal-muted" />
          Ves este proyecto porque tienes jornadas asignadas en él. Solo se
          muestran tus jornadas.
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <h3 className="mb-3 font-semibold text-zinc-900">
        Mis jornadas en este proyecto
      </h3>
      <ListaJornadasTecnico
        jornadas={jornadas}
        mensajeVacio="No tienes jornadas asignadas en este proyecto."
      />
    </>
  );
}
