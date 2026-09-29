"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderKanban,
} from "lucide-react";
import { FichaEvaluacion } from "@/components/evaluaciones/ficha-evaluacion";
import { MESES } from "@/components/evaluaciones/indicadores-evaluacion";
import { PanelAsignaciones } from "@/components/evaluaciones/panel-asignaciones";
import { VistaEquipo } from "@/components/evaluaciones/vista-equipo";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  descargarPdfEvaluaciones,
  descargarPdfFichaUsuario,
  listarProyectos,
  obtenerCumplimientoEquipoDashboard,
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
} from "@/lib/types";

type TabEval = "equipo" | "cuotas";

function tabDesdeUrl(valor: string | null): TabEval {
  // "asignaciones" se mantiene por los enlaces existentes (vista de gestión del proyecto).
  return valor === "cuotas" || valor === "asignaciones" ? "cuotas" : "equipo";
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function PanelEvaluaciones() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const searchParams = useSearchParams();
  const puedeGestionar = puede("evaluaciones.gestionar");

  const ahora = new Date();
  const [tab, setTab] = useState<TabEval>(tabDesdeUrl(searchParams.get("tab")));
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [proyectoId, setProyectoId] = useState(
    searchParams.get("proyectoId") ?? "",
  );
  const [usuarioId, setUsuarioId] = useState(searchParams.get("usuarioId") ?? "");

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [equipo, setEquipo] = useState<ProductividadPersona[]>([]);
  const [detalle, setDetalle] = useState<ProductividadUsuarioDetalle | null>(
    null,
  );
  const [proyectoCuotas, setProyectoCuotas] = useState<Proyecto | null>(null);
  const [planCuotas, setPlanCuotas] = useState<PlanProyecto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const esMesActual = anio === ahora.getFullYear() && mes === ahora.getMonth() + 1;

  function moverMes(delta: -1 | 1) {
    const fecha = new Date(anio, mes - 1 + delta, 1);
    setAnio(fecha.getFullYear());
    setMes(fecha.getMonth() + 1);
  }

  function irACuotas() {
    setUsuarioId("");
    setTab("cuotas");
  }

  useEffect(() => {
    if (!token) return;
    void listarProyectos(token, { estado: "ACTIVO", limite: 50 })
      .then((r) => setProyectos(r.datos))
      .catch(() => setProyectos([]));
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "equipo") return;
    let cancelado = false;
    async function cargarEquipo(tk: string) {
      setCargando(true);
      setError(null);
      try {
        const datos = proyectoId
          ? await obtenerProductividadProyecto(tk, proyectoId, { anio, mes })
          : await obtenerCumplimientoEquipoDashboard(tk, { anio, mes });
        if (!cancelado) setEquipo(datos);
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el equipo",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargarEquipo(token);
    return () => {
      cancelado = true;
    };
  }, [token, tab, anio, mes, proyectoId]);

  useEffect(() => {
    if (!token || tab !== "equipo" || !usuarioId) return;
    let cancelado = false;
    async function cargarFicha(tk: string, id: string) {
      setDetalle(null);
      try {
        const datos = await obtenerProductividadUsuario(tk, id, {
          proyectoId: proyectoId || undefined,
          anio,
          mes,
        });
        if (!cancelado) setDetalle(datos);
      } catch (err) {
        if (!cancelado) {
          setUsuarioId("");
          setError(
            err instanceof Error ? err.message : "Error al cargar la ficha",
          );
        }
      }
    }
    void cargarFicha(token, usuarioId);
    return () => {
      cancelado = true;
    };
  }, [token, tab, usuarioId, anio, mes, proyectoId]);

  useEffect(() => {
    if (!token || tab !== "cuotas" || !proyectoId) return;
    let cancelado = false;
    async function cargarProyecto(tk: string) {
      setCargando(true);
      setError(null);
      try {
        const [proyecto, plan] = await Promise.all([
          obtenerProyecto(tk, proyectoId),
          obtenerPlanProyecto(tk, proyectoId),
        ]);
        if (!cancelado) {
          setProyectoCuotas(proyecto);
          setPlanCuotas(plan);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el proyecto",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }
    void cargarProyecto(token);
    return () => {
      cancelado = true;
    };
  }, [token, tab, proyectoId]);

  async function descargarPdf() {
    if (!token) return;
    setDescargandoPdf(true);
    setError(null);
    const sufijo = `${anio}-${String(mes).padStart(2, "0")}`;
    try {
      if (usuarioId) {
        const blob = await descargarPdfFichaUsuario(token, usuarioId, {
          proyectoId: proyectoId || undefined,
          anio,
          mes,
        });
        descargarBlob(blob, `ficha-${usuarioId.slice(0, 8)}-${sufijo}.pdf`);
      } else {
        const blob = await descargarPdfEvaluaciones(token, {
          proyectoId: proyectoId || undefined,
          anio,
          mes,
        });
        descargarBlob(blob, `evaluaciones-${sufijo}.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al descargar el PDF");
    } finally {
      setDescargandoPdf(false);
    }
  }

  const tabs: { id: TabEval; etiqueta: string }[] = [
    { id: "equipo", etiqueta: "Equipo" },
    { id: "cuotas", etiqueta: "Cuotas por meta" },
  ];

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">Evaluaciones</h2>
        <p className="mt-1 text-zinc-600">
          Desempeño mensual del equipo de campo frente a sus cuotas.
        </p>
      </div>

      <div className="mb-6 flex gap-6 border-b border-ruralia-teal-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setUsuarioId("");
            }}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition ${
              tab === t.id
                ? "border-ruralia-teal text-ruralia-teal-text"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {tab === "equipo" ? (
          <div className="flex items-center rounded-xl border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => moverMes(-1)}
              aria-label="Mes anterior"
              className="rounded-l-xl px-2.5 py-2.5 text-zinc-500 transition hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] px-2 text-center text-sm font-semibold text-zinc-900">
              {MESES[mes - 1]} {anio}
            </span>
            <button
              type="button"
              onClick={() => moverMes(1)}
              disabled={esMesActual}
              aria-label="Mes siguiente"
              className="rounded-r-xl px-2.5 py-2.5 text-zinc-500 transition hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="w-full min-w-[220px] sm:w-72">
          <SelectorDesplegable
            value={proyectoId}
            onChange={(id) => {
              setProyectoId(id);
              setUsuarioId("");
            }}
            opciones={proyectos.map((p) => ({ id: p.id, nombre: p.nombre }))}
            permitirVacio={tab === "equipo"}
            etiquetaVacio="Todos los proyectos activos"
            placeholder={
              tab === "cuotas" ? "Selecciona un proyecto" : "Todos los proyectos activos"
            }
            mensajeSinOpciones="Sin proyectos activos"
            icono={FolderKanban}
          />
        </div>
        {tab === "equipo" && !usuarioId ? (
          <button
            type="button"
            disabled={descargandoPdf || equipo.length === 0}
            onClick={() => void descargarPdf()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {descargandoPdf ? "Generando…" : "Descargar PDF"}
          </button>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {tab === "equipo" ? (
        usuarioId ? (
          <FichaEvaluacion
            detalle={detalle}
            resumen={equipo.find((p) => p.usuarioId === usuarioId)}
            anio={anio}
            mes={mes}
            descargandoPdf={descargandoPdf}
            onDescargarPdf={() => void descargarPdf()}
            onVolver={() => setUsuarioId("")}
            onIrACuotas={puedeGestionar ? irACuotas : undefined}
          />
        ) : cargando ? (
          <Spinner />
        ) : (
          <VistaEquipo
            personas={equipo}
            mostrarProyecto={!proyectoId}
            onSeleccionar={setUsuarioId}
            onIrACuotas={puedeGestionar ? irACuotas : undefined}
          />
        )
      ) : !proyectoId ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-6 py-12 text-center text-sm text-zinc-600">
          Selecciona un proyecto para repartir las cuotas de sus metas entre el
          equipo.
        </div>
      ) : cargando || !proyectoCuotas ? (
        <Spinner />
      ) : (
        <PanelAsignaciones
          token={token!}
          proyectoId={proyectoId}
          proyecto={proyectoCuotas}
          plan={planCuotas}
          puedeGestionar={puedeGestionar}
        />
      )}
    </>
  );
}
