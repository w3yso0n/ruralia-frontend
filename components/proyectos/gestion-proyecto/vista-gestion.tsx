"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alerta, Spinner } from "@/components/ui/modal";
import { EquipoVinculos } from "@/components/proyectos/gestion-proyecto/equipo-vinculos";
import { PanelJornadas } from "@/components/proyectos/gestion-proyecto/panel-jornadas";
import { ResumenAsignaciones } from "@/components/proyectos/gestion-proyecto/resumen-asignaciones";
import {
  activarProyecto,
  obtenerEstadisticasProyecto,
  obtenerPlanProyecto,
  obtenerProgresoProyecto,
  obtenerProyecto,
  listarJornadas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  EstadisticasProyecto,
  Jornada,
  PlanProyecto,
  ProgresoProyecto,
  Proyecto,
} from "@/lib/types";

type Tab = "resumen" | "jornadas" | "equipo";

interface VistaGestionProyectoProps {
  proyectoId: string;
}

export function VistaGestionProyecto({ proyectoId }: VistaGestionProyectoProps) {
  const searchParams = useSearchParams();
  const tabInicial = searchParams.get("tab");
  const { token, usuario } = useAuth();
  const [tab, setTab] = useState<Tab>(
    tabInicial === "jornadas" || tabInicial === "equipo"
      ? tabInicial
      : "resumen",
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

  const puedeGestionar = !!usuario?.roles.some((rol) =>
    ["ADMINISTRADOR", "COORDINADOR"].includes(rol.nombre),
  );

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const [p, pl, pr, est, jor] = await Promise.all([
        obtenerProyecto(token, proyectoId),
        obtenerPlanProyecto(token, proyectoId),
        obtenerProgresoProyecto(token, proyectoId),
        obtenerEstadisticasProyecto(token, proyectoId),
        listarJornadas(token, { proyectoId, limite: 50 }),
      ]);
      setProyecto(p);
      setPlan(pl);
      setProgreso(pr);
      setEstadisticas(est);
      setJornadas(jor.datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyecto");
    } finally {
      setCargando(false);
    }
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const tabs: { id: Tab; etiqueta: string }[] = [
    { id: "resumen", etiqueta: "Resumen" },
    { id: "jornadas", etiqueta: "Jornadas y actividades" },
    { id: "equipo", etiqueta: "Equipo y contraparte" },
  ];

  if (cargando) return <Spinner />;
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

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {proyecto.nombre}
          </h2>
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

      {tab === "resumen" ? (
        <>
          <ResumenAsignaciones
            proyecto={proyecto}
            puedeGestionar={puedeGestionar}
            onIrAEquipo={() => setTab("equipo")}
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
