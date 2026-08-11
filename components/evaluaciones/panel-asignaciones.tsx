"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alerta, Spinner } from "@/components/ui/modal";
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
        <h3 className="text-lg font-semibold text-zinc-900">
          Metas por persona
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          La cuota personal es independiente de la meta del proyecto. El
          ejecutado se calcula desde jornadas aprobadas del técnico sobre esa
          meta.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Meta del proceso</span>
            <select
              value={metaId}
              onChange={(e) => {
                setMetaId(e.target.value);
                setPeriodoId("");
              }}
              className="rounded-xl border border-zinc-200 px-3 py-2"
            >
              {metas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} ({m.unidadMedida})
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Periodo (opcional)</span>
            <select
              value={periodoId}
              onChange={(e) => setPeriodoId(e.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2"
            >
              <option value="">Meta total</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {MESES[p.mes - 1]} {p.anio} — plan {p.cantidadPlaneada}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {ok ? (
        <div className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3 text-sm text-ruralia-teal-text">
          {ok}
        </div>
      ) : null}

      {cargando ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ruralia-teal-border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Persona</th>
                <th className="px-4 py-3 font-semibold">Cuota asignada</th>
                <th className="px-4 py-3 font-semibold">Ejecutado</th>
                <th className="px-4 py-3 font-semibold">Cumplimiento</th>
                <th className="px-4 py-3 font-semibold">Jornadas</th>
                <th className="px-4 py-3 font-semibold">Beneficiarios</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const real = asignaciones.find(
                  (a) => a.usuario.id === fila.usuarioId,
                );
                return (
                  <tr key={fila.usuarioId} className="border-b border-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-800">
                      {fila.nombreCompleto}
                      {fila.conteoJornadas != null ? (
                        <span className="ml-2 text-xs text-zinc-400">
                          ({fila.conteoJornadas} jornadas previas)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {puedeGestionar ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={fila.cantidadAsignada}
                          onChange={(e) =>
                            setFilas((prev) =>
                              prev.map((f) =>
                                f.usuarioId === fila.usuarioId
                                  ? {
                                      ...f,
                                      cantidadAsignada: e.target.value,
                                    }
                                  : f,
                              ),
                            )
                          }
                          className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5"
                        />
                      ) : (
                        real?.cantidadAsignada ?? "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {real?.ejecutado ?? 0}
                      {metaSeleccionada ? (
                        <span className="text-xs text-zinc-400">
                          {" "}
                          {metaSeleccionada.unidadMedida}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          (real?.cumplimientoPorcentaje ?? 0) >= 100
                            ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                            : (real?.cumplimientoPorcentaje ?? 0) >= 50
                              ? "bg-amber-50 text-amber-800"
                              : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {real?.cumplimientoPorcentaje ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {real?.conteoJornadas ?? 0}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {real?.beneficiariosAtendidos ?? 0}
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
            className="rounded-xl border border-ruralia-teal-border px-4 py-2 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft/50"
          >
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
