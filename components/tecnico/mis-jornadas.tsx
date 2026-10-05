"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderKanban, ListFilter } from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  cargarJornadasPropias,
  ListaJornadasTecnico,
} from "@/components/tecnico/lista-jornadas-tecnico";
import { useAuth } from "@/lib/auth-context";
import type { EstadoJornada, Jornada } from "@/lib/types";

const OPCIONES_ESTADO: { id: EstadoJornada; nombre: string }[] = [
  { id: "PLANIFICADA", nombre: "Planificada" },
  { id: "EN_PROGRESO", nombre: "En progreso" },
  { id: "COMPLETADA", nombre: "Completada" },
  { id: "CANCELADA", nombre: "Cancelada" },
];

/** Inicio del técnico: sus jornadas asignadas, de cualquier proyecto. */
export function MisJornadas() {
  const { token } = useAuth();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proyectoId, setProyectoId] = useState("");
  const [estado, setEstado] = useState("");

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    cargarJornadasPropias(token)
      .then((datos) => {
        if (vivo) setJornadas(datos);
      })
      .catch((err) => {
        if (vivo) {
          setError(
            err instanceof Error ? err.message : "Error al cargar tus jornadas",
          );
        }
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  const proyectos = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const j of jornadas) {
      if (j.proyecto) mapa.set(j.proyecto.id, j.proyecto.nombre);
    }
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [jornadas]);

  const filtradas = jornadas.filter(
    (j) =>
      (!proyectoId || j.proyecto?.id === proyectoId) &&
      (!estado || j.estado === estado),
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">Mis jornadas</h2>
        <p className="mt-1 text-zinc-600">
          Jornadas donde eres responsable o parte del equipo. La captura se hace
          desde la app de campo.
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectorDesplegable
          value={proyectoId}
          onChange={setProyectoId}
          opciones={proyectos}
          permitirVacio
          etiquetaVacio="Todos mis proyectos"
          icono={FolderKanban}
        />
        <SelectorDesplegable
          value={estado}
          onChange={setEstado}
          opciones={OPCIONES_ESTADO}
          permitirVacio
          etiquetaVacio="Todos los estados"
          icono={ListFilter}
        />
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <ListaJornadasTecnico
          jornadas={filtradas}
          mostrarProyecto
          mensajeVacio={
            jornadas.length
              ? "Ninguna jornada coincide con los filtros."
              : "Aún no tienes jornadas asignadas."
          }
        />
      )}
    </>
  );
}
