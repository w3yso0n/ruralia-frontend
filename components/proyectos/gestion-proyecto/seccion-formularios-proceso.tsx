"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
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

  const opcionesIndividuales = individuales.map((p) => ({
    id: p.id,
    nombre: p.estaActivo ? p.nombre : `${p.nombre} (borrador)`,
  }));
  const opcionesGrupales = grupales.map((p) => ({
    id: p.id,
    nombre: p.estaActivo ? p.nombre : `${p.nombre} (borrador)`,
  }));

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
      <div className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-zinc-900">{titulo}</h4>
          <p className="mt-0.5 text-xs text-zinc-500">{descripcion}</p>
        </div>
        {plantilla ? (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-ruralia-teal-soft/30 px-3 py-2.5">
            <div className="min-w-0">
              <Link
                href={`/formularios/${plantilla.id}`}
                className="text-sm font-medium text-ruralia-teal-text hover:underline"
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
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
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
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
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
            <label className="text-sm font-medium text-zinc-700">
              Asignar formulario individual
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SelectorDesplegable
                  value={selIndividual}
                  onChange={setSelIndividual}
                  opciones={opcionesIndividuales}
                  placeholder="Seleccionar…"
                  permitirVacio
                  etiquetaVacio="Seleccionar…"
                  mensajeSinOpciones="Sin plantillas individuales"
                  icono={FileText}
                  disabled={enviando}
                />
              </div>
              <button
                type="button"
                disabled={enviando || !selIndividual}
                onClick={() =>
                  void guardarAsignacion({
                    plantillaIndividualId: selIndividual,
                  })
                }
                className="shrink-0 rounded-xl bg-ruralia-teal px-3 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                Asignar
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700">
              Asignar formulario grupal
            </label>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SelectorDesplegable
                  value={selGrupal}
                  onChange={setSelGrupal}
                  opciones={opcionesGrupales}
                  placeholder="Seleccionar…"
                  permitirVacio
                  etiquetaVacio="Seleccionar…"
                  mensajeSinOpciones="Sin plantillas grupales"
                  icono={FileText}
                  disabled={enviando}
                />
              </div>
              <button
                type="button"
                disabled={enviando || !selGrupal}
                onClick={() =>
                  void guardarAsignacion({ plantillaGrupalId: selGrupal })
                }
                className="shrink-0 rounded-xl bg-ruralia-teal px-3 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
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
          <Link
            href="/formularios/nuevo"
            className="font-medium text-ruralia-teal-text hover:underline"
          >
            Formularios
          </Link>
          . Marca el tipo <strong>Individual</strong> (principal) o{" "}
          <strong>Grupal</strong> (lista de asistencia).
        </p>
      ) : null}
    </div>
  );
}
