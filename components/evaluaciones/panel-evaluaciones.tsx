"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PanelAsignaciones } from "@/components/evaluaciones/panel-asignaciones";
import { ListaAgentesEficientes } from "@/components/evaluaciones/lista-agentes-eficientes";
import { RankingProductividad } from "@/components/evaluaciones/ranking-productividad";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  listarProyectos,
  obtenerCumplimientoEquipoDashboard,
  obtenerDesviacionesUsuario,
  obtenerPlanProyecto,
  obtenerProductividadProyecto,
  obtenerProductividadUsuario,
  obtenerProyecto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  PlanProyecto,
  ProductividadPersona,
  ProductividadUsuarioDetalle,
  Proyecto,
  ResumenDesviaciones,
} from "@/lib/types";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type TabEval = "ranking" | "asignaciones" | "ficha";

export function PanelEvaluaciones() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const searchParams = useSearchParams();
  const usuarioInicial = searchParams.get("usuarioId");
  const tabInicial = (searchParams.get("tab") as TabEval) || "ranking";
  const proyectoInicial = searchParams.get("proyectoId") ?? "";

  const ahora = new Date();
  const [tab, setTab] = useState<TabEval>(
    usuarioInicial ? "ficha" : tabInicial,
  );
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [proyectoId, setProyectoId] = useState(proyectoInicial);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [ranking, setRanking] = useState<ProductividadPersona[]>([]);
  const [detalle, setDetalle] = useState<ProductividadUsuarioDetalle | null>(
    null,
  );
  const [desviaciones, setDesviaciones] =
    useState<ResumenDesviaciones | null>(null);
  const [usuarioId, setUsuarioId] = useState(usuarioInicial ?? "");
  const [proyectoAsignacion, setProyectoAsignacion] = useState<Proyecto | null>(
    null,
  );
  const [planAsignacion, setPlanAsignacion] = useState<PlanProyecto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const puedeGestionar = puede("evaluaciones.gestionar");

  useEffect(() => {
    if (!token) return;
    void listarProyectos(token, { estado: "ACTIVO", limite: 50 })
      .then((r) => setProyectos(r.datos))
      .catch(() => setProyectos([]));
  }, [token]);

  useEffect(() => {
    if (!token || (tab !== "ranking" && tab !== "ficha")) return;
    let cancelado = false;

    async function cargar() {
      if (!token) return;
      setCargando(true);
      setError(null);
      try {
        const datos = proyectoId
          ? await obtenerProductividadProyecto(token, proyectoId, { anio, mes })
          : await obtenerCumplimientoEquipoDashboard(token, { anio, mes });
        if (!cancelado) setRanking(datos);
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar el ranking",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [token, anio, mes, proyectoId, tab]);

  useEffect(() => {
    if (!token || tab !== "ficha") return;
    if (!usuarioId) {
      setDetalle(null);
      setDesviaciones(null);
      return;
    }

    let cancelado = false;

    async function cargarFicha() {
      if (!token || !usuarioId) return;
      setError(null);
      try {
        const [ficha, desv] = await Promise.all([
          obtenerProductividadUsuario(token, usuarioId, {
            proyectoId: proyectoId || undefined,
            anio,
            mes,
          }),
          obtenerDesviacionesUsuario(token, usuarioId, {
            proyectoId: proyectoId || undefined,
            anio,
            mes,
          }),
        ]);
        if (!cancelado) {
          setDetalle(ficha);
          setDesviaciones(desv);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la ficha de evaluación",
          );
        }
      }
    }

    void cargarFicha();
    return () => {
      cancelado = true;
    };
  }, [token, tab, usuarioId, anio, mes, proyectoId]);

  useEffect(() => {
    if (!token || tab !== "asignaciones" || !proyectoId) {
      setProyectoAsignacion(null);
      setPlanAsignacion(null);
      return;
    }
    let cancelado = false;

    async function cargarProyecto() {
      if (!token) return;
      setCargando(true);
      setError(null);
      try {
        const [p, plan] = await Promise.all([
          obtenerProyecto(token, proyectoId),
          obtenerPlanProyecto(token, proyectoId),
        ]);
        if (!cancelado) {
          setProyectoAsignacion(p);
          setPlanAsignacion(plan);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar el proyecto",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarProyecto();
    return () => {
      cancelado = true;
    };
  }, [token, tab, proyectoId]);

  function abrirFicha(id: string) {
    setUsuarioId(id);
    setTab("ficha");
  }

  const tabs: { id: TabEval; etiqueta: string }[] = [
    { id: "ranking", etiqueta: "Ranking" },
    { id: "asignaciones", etiqueta: "Asignar metas" },
    { id: "ficha", etiqueta: "Ficha individual" },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900">Evaluaciones</h2>
        <p className="mt-1 text-zinc-600">
          Gestión interna del equipo: cuotas personales, cumplimiento,
          desviaciones frente a la planeación y evaluación individual
        </p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-ruralia-teal text-ruralia-teal-text"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-ruralia-teal-border bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Año</span>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-24 rounded-xl border border-zinc-200 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Mes</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 px-3 py-2"
          >
            {MESES.map((nombre, i) => (
              <option key={nombre} value={i + 1}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Proyecto</span>
          <select
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="min-w-[220px] rounded-xl border border-zinc-200 px-3 py-2"
          >
            {tab === "asignaciones" ? (
              <option value="">Selecciona un proyecto</option>
            ) : (
              <option value="">Todos los activos</option>
            )}
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {tab === "ranking" ? (
        cargando ? (
          <Spinner />
        ) : (
          <section className="space-y-6">
            <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
              <ListaAgentesEficientes
                personas={ranking}
                onSeleccionar={abrirFicha}
                limite={9}
              />
            </div>
            <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900">
                Tabla detallada — {MESES[mes - 1]} {anio}
              </h3>
              <RankingProductividad
                personas={ranking}
                mostrarProyecto={!proyectoId}
                onSeleccionar={abrirFicha}
              />
            </div>
          </section>
        )
      ) : null}

      {tab === "asignaciones" ? (
        !proyectoId ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
            Selecciona un proyecto para repartir cuotas personales de sus metas.
          </div>
        ) : cargando || !proyectoAsignacion ? (
          <Spinner />
        ) : (
          <PanelAsignaciones
            token={token!}
            proyectoId={proyectoId}
            proyecto={proyectoAsignacion}
            plan={planAsignacion}
            puedeGestionar={puedeGestionar}
          />
        )
      ) : null}

      {tab === "ficha" ? (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-ruralia-teal-border bg-white p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-zinc-900">
              Agentes de campo
            </h3>
            <p className="mb-3 text-xs text-zinc-500">
              Elige a alguien para ver su evaluación del periodo
            </p>
            {cargando && ranking.length === 0 ? (
              <Spinner />
            ) : ranking.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No hay agentes con actividad o cuotas en este periodo
                {proyectoId ? " / proyecto" : ""}. Prueba otro mes o asigna
                metas en la pestaña Asignar metas.
              </p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {ranking.map((p) => {
                  const activo = p.usuarioId === usuarioId;
                  return (
                    <li key={p.usuarioId}>
                      <button
                        type="button"
                        onClick={() => setUsuarioId(p.usuarioId)}
                        className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          activo
                            ? "bg-ruralia-teal text-white"
                            : "hover:bg-ruralia-teal-soft/60 text-zinc-800"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {p.nombreCompleto}
                          </span>
                          {p.proyectoNombre && !proyectoId ? (
                            <span
                              className={`block truncate text-xs ${
                                activo ? "text-white/80" : "text-zinc-500"
                              }`}
                            >
                              {p.proyectoNombre}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-bold ${
                            activo ? "text-white" : "text-ruralia-teal-text"
                          }`}
                        >
                          {p.indiceEficiencia ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <div className="min-w-0">
            {!usuarioId ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
                Selecciona un agente de la lista para ver su ficha: cumplimiento,
                metas asignadas y desviaciones vs planeación.
              </div>
            ) : !detalle ? (
              <Spinner />
            ) : (
              <div className="space-y-6">
                <section className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {detalle.usuario.nombreCompleto}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {detalle.usuario.correo}
                    </p>
                  </div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Metrica
                      etiqueta="Cumplimiento promedio"
                      valor={`${detalle.cumplimientoPromedio}%`}
                    />
                    <Metrica
                      etiqueta="Asignado / Ejecutado"
                      valor={`${detalle.totalAsignado} / ${detalle.totalEjecutado}`}
                    />
                    <Metrica
                      etiqueta="Jornadas"
                      valor={String(detalle.conteoJornadas)}
                    />
                    <Metrica
                      etiqueta="Beneficiarios / Veredas"
                      valor={`${detalle.beneficiariosAtendidos} / ${detalle.veredasCubiertas}`}
                    />
                    <Metrica
                      etiqueta="Rechazos en revisión"
                      valor={String(detalle.rechazosRevision ?? 0)}
                    />
                  </div>

                  {detalle.asignaciones.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
                            <th className="pb-2 pr-3 font-semibold">Meta</th>
                            <th className="pb-2 pr-3 font-semibold">Periodo</th>
                            <th className="pb-2 pr-3 font-semibold">Asignado</th>
                            <th className="pb-2 pr-3 font-semibold">Ejecutado</th>
                            <th className="pb-2 font-semibold">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.asignaciones.map((a) => (
                            <tr key={a.id} className="border-b border-zinc-50">
                              <td className="py-2 pr-3">
                                <span className="font-medium text-zinc-800">
                                  {a.metaNombre}
                                </span>
                                <span className="ml-1 text-xs text-zinc-400">
                                  ({a.unidadMedida})
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-zinc-600">
                                {a.anio && a.mes
                                  ? `${MESES[a.mes - 1]} ${a.anio}`
                                  : "Total"}
                              </td>
                              <td className="py-2 pr-3">{a.cantidadAsignada}</td>
                              <td className="py-2 pr-3">{a.ejecutado}</td>
                              <td className="py-2 font-semibold">
                                {a.cumplimientoPorcentaje}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Esta persona no tiene cuotas asignadas en el filtro
                      actual. Sus jornadas y cobertura sí se muestran arriba.
                    </p>
                  )}
                </section>

                {desviaciones ? (
                  <section className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
                    <h3 className="mb-1 text-lg font-semibold text-zinc-900">
                      Desviaciones vs planeación
                    </h3>
                    <p className="mb-4 text-sm text-zinc-500">
                      {MESES[desviaciones.mes - 1]} {desviaciones.anio} — cuántas
                      metas personales no se cumplieron
                    </p>
                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                      <Metrica
                        etiqueta="Metas con cuota"
                        valor={String(desviaciones.metasConCuota)}
                      />
                      <Metrica
                        etiqueta="Fallos sin ejecución"
                        valor={String(desviaciones.fallosSinEjecucion)}
                      />
                      <Metrica
                        etiqueta="Incumplimientos (<100%)"
                        valor={String(desviaciones.incumplimientos)}
                      />
                    </div>
                    {desviaciones.detalle.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {desviaciones.detalle.map((d) => (
                          <li
                            key={d.metaId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2"
                          >
                            <span className="font-medium text-zinc-800">
                              {d.metaNombre}
                            </span>
                            <span className="text-zinc-600">
                              {d.ejecutado}/{d.cantidadAsignada} {d.unidadMedida}{" "}
                              ({d.cumplimientoPorcentaje}%)
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                d.sinEjecucion
                                  ? "bg-red-50 text-red-700"
                                  : d.incumplida
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-ruralia-teal-soft text-ruralia-teal-text"
                              }`}
                            >
                              {d.sinEjecucion
                                ? "Sin ejecución"
                                : d.incumplida
                                  ? "Incumplida"
                                  : "Cumplida"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Sin cuotas en este periodo para calcular desviaciones.
                      </p>
                    )}
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <p className="text-xs text-zinc-500">{etiqueta}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{valor}</p>
    </div>
  );
}
