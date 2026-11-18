"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  clonarPlantillaFormulario,
  listarPlantillasFormulario,
  publicarPlantillaFormulario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import {
  ETIQUETA_FASE,
  type FaseFormulario,
  type PlantillaFormulario,
} from "@/lib/types";

const PESTANAS: Array<{ id: FaseFormulario; ayuda: string }> = [
  {
    id: "EJECUCION",
    ayuda: "Se usan en las jornadas del plan y cuentan en el avance.",
  },
  {
    id: "LINEA_BASE",
    ayuda:
      "Levantamiento inicial del beneficiario. No cuentan en métricas ni generan PDF.",
  },
];

export function GestionFormularios() {
  const { token } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fase, setFase] = useState<FaseFormulario>("EJECUCION");

  const conteo = useMemo(() => {
    const porFase: Record<FaseFormulario, number> = { EJECUCION: 0, LINEA_BASE: 0 };
    for (const p of plantillas) porFase[p.fase ?? "EJECUCION"] += 1;
    return porFase;
  }, [plantillas]);
  const visibles = useMemo(
    () => plantillas.filter((p) => (p.fase ?? "EJECUCION") === fase),
    [plantillas, fase],
  );

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      setPlantillas(await listarPlantillasFormulario(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar plantillas");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function manejarPublicar(plantilla: PlantillaFormulario) {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      await publicarPlantillaFormulario(token, plantilla.id);
      setExito("El formulario ya está listo para usarse");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar plantilla");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarClonar(plantilla: PlantillaFormulario) {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      await clonarPlantillaFormulario(token, plantilla.id);
      setExito("Copia creada. Puedes editarla sin afectar el original.");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al clonar plantilla");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Formularios</h2>
          <p className="mt-1 text-zinc-600">
            Arma las preguntas que los técnicos llenan en campo. Luego las usas
            en las jornadas.
          </p>
        </div>
        <Link
          href={`/formularios/nuevo?fase=${fase}`}
          className="inline-flex items-center justify-center rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
        >
          Crear formulario
        </Link>
      </div>

      <div className="mb-5 border-b border-zinc-200">
        <nav className="-mb-px flex gap-6" aria-label="Tipo de formulario">
          {PESTANAS.map((pestana) => {
            const activa = pestana.id === fase;
            return (
              <button
                key={pestana.id}
                type="button"
                onClick={() => setFase(pestana.id)}
                className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                  activa
                    ? "border-ruralia-teal text-ruralia-teal-text"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {ETIQUETA_FASE[pestana.id]}
                <span className="ml-2 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
                  {conteo[pestana.id]}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <p className="-mt-2 mb-4 text-xs text-zinc-500">
        {PESTANAS.find((p) => p.id === fase)?.ayuda}
      </p>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      {cargando ? (
        <Spinner />
      ) : visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-800">
            {fase === "LINEA_BASE"
              ? "Todavía no hay formularios de línea base"
              : "Todavía no hay formularios"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Crea el primero: un nombre, las preguntas y cómo se responde cada
            una.
          </p>
          <Link
            href={`/formularios/nuevo?fase=${fase}`}
            className="mt-5 inline-flex rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            Crear formulario
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((plantilla) => {
            const nPreguntas = plantilla.campos?.length ?? 0;
            const nProcesos = plantilla.procesoIds?.length ?? 0;
            return (
              <article
                key={plantilla.id}
                className="flex flex-col rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plantilla.estaActivo
                        ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {plantilla.estaActivo ? "En uso" : "Borrador"}
                  </span>
                  {plantilla.fase === "LINEA_BASE" ? (
                    <span className="rounded-full border border-ruralia-teal-border bg-white px-2.5 py-0.5 text-xs font-semibold text-ruralia-teal-text">
                      Línea base
                    </span>
                  ) : null}
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                    {plantilla.tipoPlantilla === "GRUPAL"
                      ? "Varias personas"
                      : "Una persona"}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-900">
                  {plantilla.nombre}
                </h3>
                {plantilla.descripcion ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                    {plantilla.descripcion}
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-zinc-600">
                  {nPreguntas} pregunta{nPreguntas !== 1 ? "s" : ""}
                  {nProcesos > 0
                    ? ` · ${nProcesos} proceso${nProcesos !== 1 ? "s" : ""}`
                    : null}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <Link
                    href={`/formularios/${plantilla.id}`}
                    className={btnAccionPrimaria}
                  >
                    Editar
                  </Link>
                  {!plantilla.estaActivo ? (
                    <button
                      type="button"
                      onClick={() => manejarPublicar(plantilla)}
                      disabled={enviando}
                      className={btnAccionSecundaria}
                    >
                      Poner en uso
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => manejarClonar(plantilla)}
                    disabled={enviando}
                    className={btnAccionSecundaria}
                  >
                    Duplicar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

    </>
  );
}
