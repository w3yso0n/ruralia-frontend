"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/modal";
import {
  asignarPlantillasProceso,
  listarPlantillasFormulario,
  obtenerAsignacionPlantillasProceso,
} from "@/lib/api";
import type { PlantillaFormulario } from "@/lib/types";

interface SeccionFormulariosProcesoProps {
  token: string;
  procesoId: string;
  puedeGestionar: boolean;
}

function etiquetaTipo(tipo?: PlantillaFormulario["tipoPlantilla"]) {
  return tipo === "GRUPAL" ? "Grupal · asistencia" : "Individual";
}

export function SeccionFormulariosProceso({
  token,
  procesoId,
  puedeGestionar,
}: SeccionFormulariosProcesoProps) {
  const [individual, setIndividual] = useState<PlantillaFormulario | null>(null);
  const [grupal, setGrupal] = useState<PlantillaFormulario | null>(null);
  const [catalogo, setCatalogo] = useState<PlantillaFormulario[]>([]);
  const [selIndividual, setSelIndividual] = useState("");
  const [selGrupal, setSelGrupal] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const asignacion = await obtenerAsignacionPlantillasProceso(token, procesoId);
      setIndividual(asignacion.plantillaIndividual ?? null);
      setGrupal(asignacion.plantillaGrupal ?? null);
      if (puedeGestionar) {
        setCatalogo(await listarPlantillasFormulario(token));
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

  const individuales = catalogo.filter(
    (p) => (p.tipoPlantilla ?? "INDIVIDUAL") === "INDIVIDUAL",
  );
  const grupales = catalogo.filter((p) => p.tipoPlantilla === "GRUPAL");

  async function guardarAsignacion(cambios: {
    plantillaIndividualId?: string | null;
    plantillaGrupalId?: string | null;
  }) {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await asignarPlantillasProceso(token, procesoId, cambios);
      setIndividual(resultado.plantillaIndividual ?? null);
      setGrupal(resultado.plantillaGrupal ?? null);
      setSelIndividual("");
      setSelGrupal("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar formulario");
    } finally {
      setEnviando(false);
    }
  }

  function TarjetaAsignada({
    titulo,
    descripcion,
    plantilla,
    onQuitar,
  }: {
    titulo: string;
    descripcion: string;
    plantilla: PlantillaFormulario | null;
    onQuitar: () => void;
  }) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-zinc-900">{titulo}</h4>
          <p className="mt-0.5 text-xs text-zinc-500">{descripcion}</p>
        </div>
        {plantilla ? (
          <div className="flex items-start justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5">
            <div className="min-w-0">
              <Link
                href={`/formularios/${plantilla.id}`}
                className="text-sm font-medium text-ruralia-teal hover:underline"
              >
                {plantilla.nombre}
              </Link>
              <p className="text-xs text-zinc-500">
                v{plantilla.version} · {plantilla.campos?.length ?? 0} campos ·{" "}
                {plantilla.estaActivo ? "Publicada" : "Borrador"} ·{" "}
                {etiquetaTipo(plantilla.tipoPlantilla)}
              </p>
            </div>
            {puedeGestionar ? (
              <button
                type="button"
                disabled={enviando}
                onClick={onQuitar}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Quitar
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Sin formulario asignado.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <Spinner className="py-6" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <TarjetaAsignada
            titulo="Formulario individual"
            descripcion="Principal. Se usa en jornadas de campo normales (celular)."
            plantilla={individual}
            onQuitar={() =>
              void guardarAsignacion({ plantillaIndividualId: null })
            }
          />
          <TarjetaAsignada
            titulo="Formulario grupal"
            descripcion="Lista de asistencia repetible. Campos fijos, N participantes."
            plantilla={grupal}
            onQuitar={() => void guardarAsignacion({ plantillaGrupalId: null })}
          />
        </div>
      )}

      {puedeGestionar && !cargando ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-600">
              Asignar formulario individual
            </label>
            <div className="flex gap-2">
              <select
                value={selIndividual}
                onChange={(e) => setSelIndividual(e.target.value)}
                disabled={enviando}
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Seleccionar…</option>
                {individuales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.estaActivo ? "" : " (borrador)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={enviando || !selIndividual}
                onClick={() =>
                  void guardarAsignacion({
                    plantillaIndividualId: selIndividual,
                  })
                }
                className="shrink-0 rounded-xl bg-ruralia-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-600">
              Asignar formulario grupal
            </label>
            <div className="flex gap-2">
              <select
                value={selGrupal}
                onChange={(e) => setSelGrupal(e.target.value)}
                disabled={enviando}
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Seleccionar…</option>
                {grupales.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.estaActivo ? "" : " (borrador)"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={enviando || !selGrupal}
                onClick={() =>
                  void guardarAsignacion({ plantillaGrupalId: selGrupal })
                }
                className="shrink-0 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {puedeGestionar ? (
        <p className="text-xs text-zinc-500">
          Crea plantillas en{" "}
          <Link href="/formularios/nuevo" className="text-ruralia-teal hover:underline">
            Formularios
          </Link>
          . Marca el tipo <strong>Individual</strong> (principal) o{" "}
          <strong>Grupal</strong> (lista de asistencia).
        </p>
      ) : null}
    </div>
  );
}
