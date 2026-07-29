"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alerta, Spinner } from "@/components/ui/modal";
import { EquipoVinculos } from "@/components/proyectos/gestion-proyecto/equipo-vinculos";
import { PanelJornadas } from "@/components/proyectos/gestion-proyecto/panel-jornadas";
import { PanelPlan } from "@/components/proyectos/gestion-proyecto/panel-plan";
import { ResumenAsignaciones } from "@/components/proyectos/gestion-proyecto/resumen-asignaciones";
import {
  activarProyecto,
  actualizarProyecto,
  eliminarProyecto,
  obtenerEstadisticasProyecto,
  obtenerPlanProyecto,
  obtenerProgresoProyecto,
  obtenerProyecto,
  listarJornadas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  EstadisticasProyecto,
  Jornada,
  PlanProyecto,
  ProgresoProyecto,
  Proyecto,
} from "@/lib/types";

type Tab = "resumen" | "plan" | "jornadas" | "equipo";

const TABS_VALIDOS: Tab[] = ["resumen", "plan", "jornadas", "equipo"];

function tabDesdeParam(valor: string | null): Tab {
  if (valor && TABS_VALIDOS.includes(valor as Tab)) {
    return valor as Tab;
  }
  return "resumen";
}

interface VistaGestionProyectoProps {
  proyectoId: string;
}

export function VistaGestionProyecto({ proyectoId }: VistaGestionProyectoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { puede } = usePermisos();
  const [tab, setTab] = useState<Tab>(() =>
    tabDesdeParam(searchParams.get("tab")),
  );
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [plan, setPlan] = useState<PlanProyecto | null>(null);
  const [progreso, setProgreso] = useState<ProgresoProyecto | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasProyecto | null>(
    null,
  );
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activando, setActivando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [descripcionEdicion, setDescripcionEdicion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [planActualizadoEn, setPlanActualizadoEn] = useState<Date | null>(null);

  const puedeGestionar = puede("proyectos.editar");
  const puedeEliminar = puede("proyectos.eliminar");


  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [p, pl, pr, est] = await Promise.all([
        obtenerProyecto(token, proyectoId),
        obtenerPlanProyecto(token, proyectoId),
        obtenerProgresoProyecto(token, proyectoId),
        obtenerEstadisticasProyecto(token, proyectoId),
      ]);
      setProyecto(p);
      setPlan(pl);
      setProgreso(pr);
      setEstadisticas(est);
      setPlanActualizadoEn(new Date());

      try {
        const jor = await listarJornadas(token, { proyectoId, limite: 50 });
        setJornadas(jor.datos);
      } catch {
        setJornadas([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyecto");
    } finally {
      setCargando(false);
    }
  }, [token, proyectoId]);

  const recargarAvancePlan = useCallback(async () => {
    if (!token) return;
    try {
      const [pl, pr] = await Promise.all([
        obtenerPlanProyecto(token, proyectoId),
        obtenerProgresoProyecto(token, proyectoId),
      ]);
      setPlan(pl);
      setProgreso(pr);
      setPlanActualizadoEn(new Date());
    } catch {
      // Ignorar errores puntuales del polling en segundo plano
    }
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setTab(tabDesdeParam(searchParams.get("tab")));
  }, [searchParams]);

  function cambiarTab(nueva: Tab) {
    setTab(nueva);
    const params = new URLSearchParams(searchParams.toString());
    if (nueva === "resumen") {
      params.delete("tab");
    } else {
      params.set("tab", nueva);
    }
    if (nueva !== "jornadas") {
      params.delete("jornadaId");
    }
    const qs = params.toString();
    router.replace(
      qs ? `/proyectos/${proyectoId}?${qs}` : `/proyectos/${proyectoId}`,
      { scroll: false },
    );
  }

  useEffect(() => {
    if (tab !== "plan") return;
    void recargarAvancePlan();
    const intervalo = setInterval(() => {
      void recargarAvancePlan();
    }, 30_000);
    return () => clearInterval(intervalo);
  }, [tab, recargarAvancePlan]);

  const tabs: { id: Tab; etiqueta: string }[] = [
    { id: "resumen", etiqueta: "Resumen" },
    { id: "plan", etiqueta: "Plan del proyecto" },
    { id: "jornadas", etiqueta: "Jornadas" },
    { id: "equipo", etiqueta: "Equipo y contraparte" },
  ];

  if (cargando) return <Spinner />;
  if (error && !proyecto) {
    return (
      <div className="space-y-4">
        <Alerta mensaje={error} />
        <Link
          href="/proyectos"
          className="inline-block text-sm font-medium text-ruralia-teal-text underline-offset-2 hover:underline"
        >
          Volver a proyectos
        </Link>
      </div>
    );
  }
  if (!proyecto || !token) return <Alerta mensaje="Proyecto no encontrado" />;

  const tieneContraparte = !!(
    proyecto.beneficiarioPrincipal ??
    proyecto.beneficiarios?.[0] ??
    proyecto.asociacionPrincipal ??
    proyecto.asociaciones?.[0]
  );

  const configuracionIncompleta =
    !proyecto.veredas?.length ||
    !proyecto.personal?.length ||
    !tieneContraparte;

  const enBorrador = proyecto.estado === "BORRADOR";

  async function manejarActivar() {
    if (!token) return;
    setActivando(true);
    setError(null);
    try {
      await activarProyecto(token, proyectoId);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar proyecto");
    } finally {
      setActivando(false);
    }
  }

  function iniciarEdicion() {
    if (!proyecto) return;
    setNombreEdicion(proyecto.nombre);
    setDescripcionEdicion(proyecto.descripcion ?? "");
    setEditando(true);
  }

  async function manejarGuardarEdicion() {
    if (!token || !nombreEdicion.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarProyecto(token, proyectoId, {
        nombre: nombreEdicion.trim(),
        descripcion: descripcionEdicion.trim() || undefined,
      });
      setEditando(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar proyecto");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    if (!token) return;
    if (
      !confirm(
        "¿Eliminar permanentemente este proyecto? Se borrará el plan y la configuración. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await eliminarProyecto(token, proyectoId);
      router.push("/proyectos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar proyecto");
    }
  }

  return (
    <>
      <nav className="mb-4 text-sm text-zinc-500">
        <Link href="/proyectos" className="hover:text-ruralia-teal-text">
          Proyectos
        </Link>
        <span className="mx-2">›</span>
        <span className="text-zinc-900">{proyecto.nombre}</span>
      </nav>

      {configuracionIncompleta && puedeGestionar ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Este proyecto aún no está completo. Ve a{" "}
          <button
            type="button"
            onClick={() => setTab("equipo")}
            className="font-semibold underline"
          >
            Equipo y contraparte
          </button>{" "}
          para asignar veredas, equipo interno y beneficiario o asociación antes
          de crear jornadas.
        </div>
      ) : null}

      {enBorrador && !configuracionIncompleta && puedeGestionar ? (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          El proyecto está en <strong>borrador</strong>. Actívalo para poder
          registrar jornadas de campo.{" "}
          <button
            type="button"
            disabled={activando}
            onClick={() => void manejarActivar()}
            className="font-semibold underline disabled:opacity-50"
          >
            {activando ? "Activando..." : "Activar proyecto"}
          </button>
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          {editando && puedeGestionar ? (
            <div className="space-y-3">
              <input
                value={nombreEdicion}
                onChange={(e) => setNombreEdicion(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-2xl font-semibold"
                placeholder="Nombre del proyecto"
              />
              <textarea
                value={descripcionEdicion}
                onChange={(e) => setDescripcionEdicion(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Descripción (opcional)"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={guardando || !nombreEdicion.trim()}
                  onClick={() => void manejarGuardarEdicion()}
                  className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => setEditando(false)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                <h2 className="text-2xl font-semibold text-zinc-900">
                  {proyecto.nombre}
                </h2>
                {puedeGestionar ? (
                  <button
                    type="button"
                    onClick={iniciarEdicion}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Editar
                  </button>
                ) : null}
                {puedeEliminar ? (
                  <button
                    type="button"
                    onClick={() => void manejarEliminar()}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                ) : null}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-zinc-600">
                <span>{proyecto.descripcion || "—"}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    proyecto.estado === "ACTIVO"
                      ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                      : proyecto.estado === "BORRADOR"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {proyecto.estado === "BORRADOR"
                    ? "Borrador"
                    : proyecto.estado === "ACTIVO"
                      ? "Activo"
                      : proyecto.estado === "COMPLETADO"
                        ? "Completado"
                        : "Suspendido"}
                </span>
              </p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-ruralia-teal-text">
            {progreso?.progresoPorcentaje ?? 0}%
          </p>
          <p className="text-xs text-zinc-500">Progreso del plan</p>
        </div>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => cambiarTab(t.id)}
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

      {tab === "resumen" ? (
        <>
          <ResumenAsignaciones
            proyecto={proyecto}
            puedeGestionar={puedeGestionar}
            onIrAEquipo={() => cambiarTab("equipo")}
          />
          {estadisticas ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
                <p className="text-sm text-zinc-500">Beneficiarios</p>
                <p className="text-2xl font-bold">
                  {estadisticas.conteoBeneficiarios}
                </p>
              </div>
              <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
                <p className="text-sm text-zinc-500">Jornadas</p>
                <p className="text-2xl font-bold">
                  {estadisticas.conteoJornadas}
                </p>
              </div>
              <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
                <p className="text-sm text-zinc-500">Formularios</p>
                <p className="text-2xl font-bold">
                  {estadisticas.conteoFormulariosEnviados}
                </p>
              </div>
              <div className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
                <p className="text-sm text-zinc-500">Actividades completadas</p>
                <p className="text-2xl font-bold">
                  {progreso?.actividadesCompletadas ?? 0} /{" "}
                  {progreso?.actividadesTotal ?? 0}
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "plan" ? (
        <PanelPlan
          token={token}
          proyectoId={proyectoId}
          plan={plan}
          puedeGestionar={puedeGestionar}
          onActualizar={cargar}
          onRecargarAvance={recargarAvancePlan}
          planActualizadoEn={planActualizadoEn}
        />
      ) : null}

      {tab === "jornadas" ? (
        <PanelJornadas
          token={token}
          proyectoId={proyectoId}
          proyecto={proyecto}
          plan={plan}
          jornadas={jornadas}
          puedeGestionar={puedeGestionar && proyecto.estado === "ACTIVO"}
          onActualizar={cargar}
        />
      ) : null}

      {tab === "equipo" ? (
        <EquipoVinculos
          token={token}
          proyectoId={proyectoId}
          proyecto={proyecto}
          puedeGestionar={puedeGestionar}
          onActualizar={cargar}
        />
      ) : null}
    </>
  );
}
