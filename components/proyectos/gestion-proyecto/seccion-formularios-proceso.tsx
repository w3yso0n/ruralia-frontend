"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/modal";
import {
  asignarProcesosPlantilla,
  listarPlantillasFormulario,
  listarPlantillasPorProceso,
} from "@/lib/api";
import type { PlantillaFormulario } from "@/lib/types";

interface SeccionFormulariosProcesoProps {
  token: string;
  procesoId: string;
  puedeGestionar: boolean;
}

export function SeccionFormulariosProceso({
  token,
  procesoId,
  puedeGestionar,
}: SeccionFormulariosProcesoProps) {
  const [asignadas, setAsignadas] = useState<PlantillaFormulario[]>([]);
  const [todas, setTodas] = useState<PlantillaFormulario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState("");

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await listarPlantillasPorProceso(token, procesoId);
      setAsignadas(datos);
      if (puedeGestionar) {
        const catalogo = await listarPlantillasFormulario(token);
        setTodas(catalogo);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar formularios",
      );
    } finally {
      setCargando(false);
    }
  }, [token, procesoId, puedeGestionar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const idsAsignados = new Set(asignadas.map((p) => p.id));
  const disponibles = todas.filter((p) => !idsAsignados.has(p.id));

  async function asignar() {
    if (!plantillaSeleccionada) return;
    const plantilla = todas.find((p) => p.id === plantillaSeleccionada);
    if (!plantilla) return;

    setEnviando(true);
    setError(null);
    try {
      const nuevosIds = [
        ...new Set([...(plantilla.procesoIds ?? []), procesoId]),
      ];
      await asignarProcesosPlantilla(token, plantilla.id, nuevosIds);
      setPlantillaSeleccionada("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar formulario");
    } finally {
      setEnviando(false);
    }
  }

  async function desasignar(plantilla: PlantillaFormulario) {
    if (
      !confirm(
        `¿Quitar "${plantilla.nombre}" de este proceso? Seguirá disponible en otros procesos donde esté asignada.`,
      )
    ) {
      return;
    }

    setEnviando(true);
    setError(null);
    try {
      const nuevosIds = (plantilla.procesoIds ?? []).filter(
        (id) => id !== procesoId,
      );
      await asignarProcesosPlantilla(token, plantilla.id, nuevosIds);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al quitar formulario",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <Spinner className="py-6" />
      ) : asignadas.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No hay formularios vinculados a este proceso.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {asignadas.map((plantilla) => (
            <li
              key={plantilla.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/formularios/${plantilla.id}`}
                  className="text-sm font-medium text-ruralia-teal hover:underline"
                >
                  {plantilla.nombre}
                </Link>
                <p className="text-xs text-zinc-500">
                  v{plantilla.version} · {plantilla.campos?.length ?? 0} campo
                  {(plantilla.campos?.length ?? 0) !== 1 ? "s" : ""} ·{" "}
                  {plantilla.estaActivo ? "Publicada" : "Borrador"}
                </p>
              </div>
              {puedeGestionar ? (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => void desasignar(plantilla)}
                  className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Quitar
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {puedeGestionar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor={`asignar-formulario-${procesoId}`}
              className="mb-1 block text-xs font-medium text-zinc-600"
            >
              Vincular formulario existente
            </label>
            <select
              id={`asignar-formulario-${procesoId}`}
              value={plantillaSeleccionada}
              onChange={(e) => setPlantillaSeleccionada(e.target.value)}
              disabled={enviando || disponibles.length === 0}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">
                {disponibles.length === 0
                  ? "No hay más formularios disponibles"
                  : "Seleccionar formulario..."}
              </option>
              {disponibles.map((plantilla) => (
                <option key={plantilla.id} value={plantilla.id}>
                  {plantilla.nombre}
                  {plantilla.estaActivo ? "" : " (borrador)"}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={enviando || !plantillaSeleccionada}
            onClick={() => void asignar()}
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Vincular
          </button>
        </div>
      ) : null}

      {puedeGestionar ? (
        <p className="text-xs text-zinc-500">
          También puedes{" "}
          <Link href="/formularios/nuevo" className="text-ruralia-teal hover:underline">
            crear una plantilla nueva
          </Link>{" "}
          y vincularla aquí.
        </p>
      ) : null}
    </div>
  );
}
