"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Alerta } from "@/components/ui/modal";
import { SelectorFechaJornada } from "@/components/ui/selector-fecha-jornada";
import {
  OpcionDesplegable,
  SelectorDesplegable,
} from "@/components/ui/selector-desplegable";
import { descargarExpedienteZip } from "@/lib/api";
import type { PlanProyecto, Proyecto } from "@/lib/types";

interface Props {
  token: string;
  proyecto: Proyecto;
  plan: PlanProyecto | null;
}

export function DescargaExpediente({ token, proyecto, plan }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState(0);
  const [alcance, setAlcance] = useState<"todo" | "fechas">("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [procesos, setProcesos] = useState<"todos" | "uno">("todos");
  const [procesoId, setProcesoId] = useState("");
  const [agentes, setAgentes] = useState<"todos" | "uno">("todos");
  const [agenteId, setAgenteId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const opcionesProceso = useMemo(() => procesosDelPlan(plan), [plan]);
  const opcionesAgente: OpcionDesplegable[] = (proyecto.personal ?? []).map(
    (persona) => ({
      id: persona.id,
      nombre: persona.nombreCompleto,
      subtitulo: persona.correo,
    }),
  );

  function cerrar() {
    setAbierto(false);
    setPaso(0);
    setError(null);
  }

  function siguiente() {
    setError(null);
    if (paso === 0 && alcance === "fechas") {
      if (!desde || !hasta) {
        setError("Indica la fecha inicial y la final.");
        return;
      }
      if (desde > hasta) {
        setError("La fecha inicial no puede ser posterior a la final.");
        return;
      }
    }
    if (paso === 1 && procesos === "uno" && !procesoId) {
      setError("Elige un proceso.");
      return;
    }
    setPaso((actual) => actual + 1);
  }

  async function descargar() {
    if (agentes === "uno" && !agenteId) {
      setError("Elige un agente.");
      return;
    }
    setDescargando(true);
    setError(null);
    try {
      const { blob, nombre } = await descargarExpedienteZip(token, proyecto.id, {
        desde: alcance === "fechas" ? desde : undefined,
        hasta: alcance === "fechas" ? hasta : undefined,
        procesoId: procesos === "uno" ? procesoId : undefined,
        agenteId: agentes === "uno" ? agenteId : undefined,
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el expediente");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          setPaso(0);
          setError(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
      >
        <Download className="h-4 w-4" />
        Descargar ZIP
      </button>
      {abierto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-zinc-900/40"
            onClick={() => {
              if (!descargando) cerrar();
            }}
          />
          <div className="relative max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-lg shadow-zinc-900/10">
            <h2 className="text-lg font-semibold text-zinc-900">Descargar expediente</h2>
            <p className="mt-1 text-sm text-zinc-500">Paso {paso + 1} de 3</p>
            <div className="mt-5 space-y-3">
              {paso === 0 ? (
                <>
                  <p className="text-sm font-medium text-zinc-800">
                    Que evidencias quieres incluir
                  </p>
                  <Opcion
                    activa={alcance === "todo"}
                    titulo="Todo el proyecto"
                    detalle="PDF vigente, adjuntos del formulario y archivos de cada jornada."
                    onElegir={() => setAlcance("todo")}
                  />
                  <Opcion
                    activa={alcance === "fechas"}
                    titulo="Un rango de fechas"
                    detalle="Solo las jornadas entre dos dias."
                    onElegir={() => setAlcance("fechas")}
                  />
                  {alcance === "fechas" ? (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-zinc-700">Desde</p>
                        <SelectorFechaJornada
                          value={desde}
                          onChange={setDesde}
                          fechaInicioProyecto={proyecto.fechaInicio}
                          fechaFinProyecto={proyecto.fechaFin}
                          enFlujo
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-sm font-medium text-zinc-700">Hasta</p>
                        <SelectorFechaJornada
                          value={hasta}
                          onChange={setHasta}
                          fechaInicioProyecto={proyecto.fechaInicio}
                          fechaFinProyecto={proyecto.fechaFin}
                          enFlujo
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
              {paso === 1 ? (
                <>
                  <p className="text-sm font-medium text-zinc-800">Procesos</p>
                  <Opcion
                    activa={procesos === "todos"}
                    titulo="Todos los procesos"
                    detalle="Incluye cada actividad, subactividad y meta del plan."
                    onElegir={() => setProcesos("todos")}
                  />
                  <Opcion
                    activa={procesos === "uno"}
                    titulo="Un proceso"
                    detalle="Solo las jornadas de ese proceso."
                    onElegir={() => setProcesos("uno")}
                  />
                  {procesos === "uno" ? (
                    <SelectorDesplegable
                      value={procesoId}
                      onChange={setProcesoId}
                      opciones={opcionesProceso}
                      placeholder="Elegir proceso"
                      mensajeSinOpciones="Este proyecto no tiene procesos en el plan"
                    />
                  ) : null}
                </>
              ) : null}
              {paso === 2 ? (
                <>
                  <p className="text-sm font-medium text-zinc-800">Agentes</p>
                  <Opcion
                    activa={agentes === "todos"}
                    titulo="Todos los agentes"
                    detalle="Una carpeta de jornada por cada responsable."
                    onElegir={() => setAgentes("todos")}
                  />
                  <Opcion
                    activa={agentes === "uno"}
                    titulo="Un agente"
                    detalle="Solo las jornadas de esa persona."
                    onElegir={() => setAgentes("uno")}
                  />
                  {agentes === "uno" ? (
                    <SelectorDesplegable
                      value={agenteId}
                      onChange={setAgenteId}
                      opciones={opcionesAgente}
                      placeholder="Elegir agente"
                      mensajeSinOpciones="Este proyecto no tiene agentes asignados"
                    />
                  ) : null}
                  <p className="text-xs text-zinc-500">
                    El ZIP queda ordenado en actividad, subactividad, proceso, meta y,
                    dentro de cada meta, una carpeta por jornada.
                  </p>
                </>
              ) : null}
              {error ? <Alerta mensaje={error} /> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => (paso === 0 ? cerrar() : setPaso((actual) => actual - 1))}
                disabled={descargando}
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {paso === 0 ? "Cancelar" : "Atrás"}
              </button>
              {paso < 2 ? (
                <button
                  type="button"
                  onClick={siguiente}
                  className="rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void descargar()}
                  disabled={descargando}
                  className="rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
                >
                  {descargando ? "Preparando..." : "Descargar ZIP"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Opcion({
  activa,
  titulo,
  detalle,
  onElegir,
}: {
  activa: boolean;
  titulo: string;
  detalle: string;
  onElegir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      className={`w-full rounded-xl border px-4 py-3 text-left ${
        activa
          ? "border-ruralia-teal bg-ruralia-teal-soft"
          : "border-zinc-200 bg-white hover:border-ruralia-teal-border"
      }`}
    >
      <span className="block text-sm font-semibold text-zinc-900">{titulo}</span>
      <span className="mt-0.5 block text-xs text-zinc-500">{detalle}</span>
    </button>
  );
}

function procesosDelPlan(plan: PlanProyecto | null): OpcionDesplegable[] {
  const opciones: OpcionDesplegable[] = [];
  for (const actividad of plan?.actividades ?? []) {
    for (const subactividad of actividad.subactividades ?? []) {
      for (const proceso of subactividad.procesos ?? []) {
        opciones.push({
          id: proceso.id,
          nombre: proceso.nombre,
          subtitulo: `${actividad.nombre} · ${subactividad.nombre}`,
        });
      }
    }
  }
  return opciones;
}
