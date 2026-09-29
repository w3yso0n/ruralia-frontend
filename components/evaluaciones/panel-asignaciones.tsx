"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Sparkles, Target } from "lucide-react";
import {
  BarraAvance,
  formatearNumero,
} from "@/components/evaluaciones/indicadores-evaluacion";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  guardarAsignacionesMeta,
  listarAsignacionesMeta,
  sugerirRepartoMeta,
} from "@/lib/api";
import type {
  AsignacionMeta,
  MetaPlan,
  PlanProyecto,
  Proyecto,
} from "@/lib/types";

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

interface FilaEdicion {
  usuarioId: string;
  nombreCompleto: string;
  cantidadAsignada: string;
  conteoJornadas?: number;
}

interface PanelAsignacionesProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  plan: PlanProyecto | null;
  puedeGestionar: boolean;
}

function metasDelPlan(plan: PlanProyecto | null): MetaPlan[] {
  if (!plan) return [];
  return (plan.actividades ?? []).flatMap((a) =>
    (a.subactividades ?? []).flatMap((s) =>
      (s.procesos ?? []).flatMap((p) => p.metas ?? []),
    ),
  );
}

export function PanelAsignaciones({
  token,
  proyectoId,
  proyecto,
  plan,
  puedeGestionar,
}: PanelAsignacionesProps) {
  const metas = useMemo(() => metasDelPlan(plan), [plan]);
  const [metaId, setMetaId] = useState("");
  const [periodoId, setPeriodoId] = useState("");
  const [asignaciones, setAsignaciones] = useState<AsignacionMeta[]>([]);
  const [filas, setFilas] = useState<FilaEdicion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const metaSeleccionada = metas.find((m) => m.id === metaId);
  const periodos = metaSeleccionada?.periodos ?? [];

  useEffect(() => {
    if (metas.length > 0 && !metaId) {
      setMetaId(metas[0].id);
    }
  }, [metas, metaId]);

  const cargar = useCallback(async () => {
    if (!token || !metaId) return;
    setCargando(true);
    setError(null);
    try {
      const periodo = periodos.find((p) => p.id === periodoId);
      const datos = await listarAsignacionesMeta(token, proyectoId, {
        metaId,
        anio: periodo?.anio,
        mes: periodo?.mes,
      });
      setAsignaciones(datos);

      const personal = proyecto.personal ?? [];
      const mapa = new Map(datos.map((a) => [a.usuario.id, a]));
      setFilas(
        personal.map((u) => {
          const a = mapa.get(u.id);
          return {
            usuarioId: u.id,
            nombreCompleto: u.nombreCompleto,
            cantidadAsignada:
              a != null ? String(a.cantidadAsignada) : "",
          };
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar asignaciones",
      );
    } finally {
      setCargando(false);
    }
  }, [token, metaId, periodoId, periodos, proyectoId, proyecto.personal]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function manejarSugerir() {
    if (!token || !metaId) return;
    setError(null);
    try {
      const sugerencias = await sugerirRepartoMeta(
        token,
        proyectoId,
        metaId,
        periodoId || undefined,
      );
      setFilas((prev) => {
        const mapa = new Map(
          sugerencias.map((s) => [s.usuario.id, s]),
        );
        if (prev.length === 0) {
          return sugerencias.map((s) => ({
            usuarioId: s.usuario.id,
            nombreCompleto: s.usuario.nombreCompleto,
            cantidadAsignada: String(s.cantidadSugerida),
            conteoJornadas: s.conteoJornadas,
          }));
        }
        return prev.map((f) => {
          const s = mapa.get(f.usuarioId);
          return s
            ? {
                ...f,
                cantidadAsignada: String(s.cantidadSugerida),
                conteoJornadas: s.conteoJornadas,
              }
            : f;
        });
      });
      setOk("Reparto sugerido — revisa y guarda para aplicar");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al sugerir reparto",
      );
    }
  }

  async function manejarGuardar() {
    if (!token || !metaId) return;
    const payload = filas
      .filter((f) => f.cantidadAsignada.trim() !== "")
      .map((f) => ({
        usuarioId: f.usuarioId,
        cantidadAsignada: Number(f.cantidadAsignada),
      }))
      .filter((f) => Number.isFinite(f.cantidadAsignada) && f.cantidadAsignada >= 0);

    if (payload.length === 0) {
      setError("Indica al menos una cuota numérica");
      return;
    }

    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      await guardarAsignacionesMeta(token, proyectoId, {
        metaId,
        metaPeriodoId: periodoId || undefined,
        asignaciones: payload,
      });
      setOk("Asignaciones guardadas");
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar asignaciones",
      );
    } finally {
      setGuardando(false);
    }
  }

  if ((proyecto.personal ?? []).length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Primero asigna personal al proyecto en la pestaña Equipo.
      </div>
    );
  }

  if (metas.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
        No hay metas en el plan. Crea metas en la pestaña Plan para poder
        repartir cuotas personales.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <h3 className="font-semibold text-zinc-900">Reparto de cuotas</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Elige una meta y cuánto le toca a cada persona. El avance cuenta sus
          jornadas aprobadas de esa meta.
        </p>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Meta del proceso
            </span>
            <SelectorDesplegable
              value={metaId}
              onChange={(id) => {
                setMetaId(id);
                setPeriodoId("");
              }}
              opciones={metas.map((m) => ({
                id: m.id,
                nombre: m.nombre,
                subtitulo: m.unidadMedida,
              }))}
              mensajeSinOpciones="Sin metas en el plan"
              icono={Target}
            />
          </div>

          <div className="min-w-[220px] flex-1">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">
              Periodo
            </span>
            <SelectorDesplegable
              value={periodoId}
              onChange={setPeriodoId}
              opciones={periodos.map((p) => ({
                id: p.id,
                nombre: `${MESES[p.mes - 1]} ${p.anio}`,
                subtitulo: `Plan ${p.cantidadPlaneada}`,
              }))}
              permitirVacio
              etiquetaVacio="Cuota total del proyecto"
              placeholder="Cuota total del proyecto"
              mensajeSinOpciones="Sin periodos definidos"
              icono={CalendarRange}
            />
          </div>
        </div>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {ok ? <Alerta mensaje={ok} tipo="exito" /> : null}

      {cargando ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ruralia-teal-border bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-zinc-100 bg-ruralia-teal-soft/50 text-xs uppercase tracking-wide text-ruralia-teal-text">
              <tr>
                <th className="px-5 py-3 font-semibold">Persona</th>
                <th className="px-5 py-3 font-semibold">
                  Cuota{metaSeleccionada ? ` (${metaSeleccionada.unidadMedida})` : ""}
                </th>
                <th className="w-2/5 px-5 py-3 font-semibold">Avance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filas.map((fila) => {
                const real = asignaciones.find(
                  (a) => a.usuario.id === fila.usuarioId,
                );
                return (
                  <tr key={fila.usuarioId}>
                    <td className="px-5 py-3">
                      <span className="font-medium text-zinc-900">
                        {fila.nombreCompleto}
                      </span>
                      {fila.conteoJornadas != null ? (
                        <span className="block text-xs text-zinc-500">
                          {fila.conteoJornadas} jornadas previas en esta meta
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      {puedeGestionar ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={fila.cantidadAsignada}
                          placeholder="Sin cuota"
                          onChange={(e) =>
                            setFilas((prev) =>
                              prev.map((f) =>
                                f.usuarioId === fila.usuarioId
                                  ? { ...f, cantidadAsignada: e.target.value }
                                  : f,
                              ),
                            )
                          }
                          className="w-32 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                        />
                      ) : (
                        <span className="text-zinc-900">
                          {real ? formatearNumero(real.cantidadAsignada) : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {real && real.cantidadAsignada > 0 ? (
                        <>
                          <BarraAvance porcentaje={real.cumplimientoPorcentaje} />
                          <span className="mt-1 block text-xs text-zinc-500">
                            <span className="font-semibold text-zinc-900">
                              {formatearNumero(real.ejecutado)}
                            </span>{" "}
                            de {formatearNumero(real.cantidadAsignada)} (
                            {formatearNumero(real.cumplimientoPorcentaje)}%)
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          Sin cuota guardada
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {puedeGestionar ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void manejarSugerir()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <Sparkles className="h-4 w-4 text-ruralia-teal" />
            Sugerir reparto equitativo
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => void manejarGuardar()}
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar cuotas"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
