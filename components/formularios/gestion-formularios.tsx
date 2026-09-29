"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { PlantillaFormulario } from "@/lib/types";

export function GestionFormularios() {
  const { token } = useAuth();
  const [plantillas, setPlantillas] = useState<PlantillaFormulario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
          href="/formularios/nuevo"
          className="inline-flex items-center justify-center rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
        >
          Crear formulario
        </Link>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      {cargando ? (
        <Spinner />
      ) : plantillas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-semibold text-zinc-800">
            Todavía no hay formularios
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Crea el primero: un nombre, las preguntas y cómo se responde cada
            una.
          </p>
          <Link
            href="/formularios/nuevo"
            className="mt-5 inline-flex rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
          >
            Crear formulario
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plantillas.map((plantilla) => {
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
