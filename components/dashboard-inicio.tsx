"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, FolderKanban, Settings2 } from "lucide-react";
import { FiltroDashboardProvider } from "@/components/dashboard/filtro-dashboard-context";
import {
  ICONO_WIDGET,
  REGISTRO_WIDGETS,
} from "@/components/dashboard/registro-widgets";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  descargarPdfDashboard,
  listarProyectosFiltroDashboard,
  obtenerMiConfiguracionDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  ConfiguracionDashboard,
  ProyectoFiltroDashboard,
  TamanoWidgetDashboard,
} from "@/lib/types";

/** Etiquetas y descripciones de sección para widgets que no son KPI simple. */
const SECCION_WIDGET: Record<
  string,
  { titulo: string; descripcion?: string }
> = {
  "medidor.cumplimiento_operativo": {
    titulo: "Cumplimiento operativo",
    descripcion:
      "Calculado desde plan de actividades, veredas y evidencias de jornadas",
  },
  "lista.agentes_eficientes": {
    titulo: "Agentes de campo más eficientes",
    descripcion:
      "Top del mes por índice de eficiencia (cumplimiento, jornadas, cobertura y evidencia)",
  },
  "grafica.actividad_mensual": {
    titulo: "Actividad mensual",
    descripcion: "Jornadas, envíos de formulario y beneficiarios atendidos",
  },
  "grafica.progreso_proyectos": {
    titulo: "Progreso por proyecto",
    descripcion: "Avance del plan y beneficiarios vinculados",
  },
  "mapa.cobertura_veredas": {
    titulo: "Mapa de cobertura territorial",
    descripcion:
      "Veredas con proyectos activos e inactivos (centroide de jornadas)",
  },
  "tabla.proyectos_recientes": {
    titulo: "Proyectos activos recientes",
    descripcion: "Últimos proyectos en ejecución",
  },
  "tabla.jornadas_recientes": {
    titulo: "Jornadas recientes",
    descripcion: "Actividad de campo registrada por técnicos",
  },
};

const SECCION_WIDGET_PROYECTO: Record<string, { titulo: string; descripcion?: string }> =
  {
    "grafica.progreso_proyectos": {
      titulo: "Avance del plan",
      descripcion: "Progreso y beneficiarios del proyecto seleccionado",
    },
    "tabla.proyectos_recientes": {
      titulo: "Proyecto seleccionado",
      descripcion: "Estado y avance del filtro actual",
    },
  };

/**
 * Grid único de 12 columnas para todo el dashboard (mínimo común múltiplo de
 * cuartos y tercios, para que ambos sistemas convivan sin conflicto):
 *   PEQUENO  = 3/12 (1/4) → los 4 KPIs caben exactos en una fila
 *   MEDIANO  = 4/12 (1/3)
 *   GRANDE   = 8/12 (2/3) → Grande + Mediano llenan una fila exacta (8+4=12)
 *   COMPLETO = 12/12 (ancho total)
 * Debe coincidir con el mismo criterio de /configuracion/dashboard para que
 * la vista previa sea fiel.
 */
const CLASE_TAMANO: Record<TamanoWidgetDashboard, string> = {
  PEQUENO: "lg:col-span-3",
  MEDIANO: "lg:col-span-4",
  GRANDE: "lg:col-span-8",
  COMPLETO: "lg:col-span-12",
};

function etiquetaEstadoProyecto(estado: string): string {
  switch (estado) {
    case "ACTIVO":
      return "Activo";
    case "BORRADOR":
      return "Borrador";
    case "SUSPENDIDO":
      return "Suspendido";
    case "COMPLETADO":
      return "Completado";
    default:
      return estado;
  }
}

function TarjetaSeccion({
  titulo,
  descripcion,
  icono: Icono,
  children,
  className = "",
}: {
  titulo: string;
  descripcion?: string;
  icono?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl border border-ruralia-teal-border bg-white p-4 shadow-sm sm:p-6 ${className}`}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icono ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ruralia-teal-soft text-ruralia-teal-text">
            <Icono className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{titulo}</h3>
          {descripcion ? (
            <p className="mt-0.5 text-sm text-zinc-500">{descripcion}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function DashboardInicio() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const [config, setConfig] = useState<ConfiguracionDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proyectoId, setProyectoId] = useState("");
  const [proyectos, setProyectos] = useState<ProyectoFiltroDashboard[]>([]);
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;

    obtenerMiConfiguracionDashboard(token)
      .then((res) => {
        if (!cancelado) setConfig(res);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el dashboard",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void listarProyectosFiltroDashboard(token)
      .then((lista) => setProyectos(lista))
      .catch(() => setProyectos([]));
  }, [token]);

  async function descargarPdf() {
    if (!token) return;
    setDescargandoPdf(true);
    setError(null);
    try {
      const blob = await descargarPdfDashboard(
        token,
        proyectoId || undefined,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const seleccionado = proyectos.find((p) => p.id === proyectoId);
      const slug = seleccionado
        ? seleccionado.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 40)
        : "general";
      a.download = `reporte-dashboard-${slug || "general"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el reporte PDF",
      );
    } finally {
      setDescargandoPdf(false);
    }
  }

  const items = (config?.items ?? [])
    .filter((i) => i.visible && REGISTRO_WIDGETS[i.widgetClave])
    .sort((a, b) => a.posicion - b.posicion);

  const proyectoSeleccionado = proyectos.find((p) => p.id === proyectoId);

  return (
    <FiltroDashboardProvider
      value={{
        proyectoId,
        nombreProyecto: proyectoSeleccionado?.nombre ?? null,
      }}
    >
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-zinc-600">
            Monitoreo operativo de proyectos, territorio y actividad en campo
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {puede("configuracion.editar_dashboard") ? (
            <Link
              href="/configuracion/dashboard"
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 sm:w-auto"
            >
              <Settings2 className="h-4 w-4 text-ruralia-teal" />
              Personalizar
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-ruralia-teal-border bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <span className="mb-1.5 block text-sm font-medium text-zinc-700">
            Proyecto
          </span>
          <SelectorDesplegable
            value={proyectoId}
            onChange={setProyectoId}
            opciones={proyectos.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              subtitulo: etiquetaEstadoProyecto(p.estado),
            }))}
            permitirVacio
            etiquetaVacio="Todos los proyectos"
            placeholder="Todos los proyectos"
            mensajeSinOpciones="Sin proyectos para filtrar"
            icono={FolderKanban}
          />
        </div>
        <button
          type="button"
          onClick={() => void descargarPdf()}
          disabled={descargandoPdf || !token}
          className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-60 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          {descargandoPdf ? "Generando PDF…" : "Descargar reporte PDF"}
        </button>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {!cargando &&
      config?.origen === "PLANTILLA" &&
      !puede("configuracion.editar_dashboard") ? (
        <p className="mb-4 text-xs text-zinc-500">
          Este dashboard fue configurado por tu administrador para tu rol.
        </p>
      ) : null}

      {cargando ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Tu dashboard no tiene widgets configurados todavía.
          {puede("configuracion.editar_dashboard") ? (
            <>
              {" "}
              <Link
                href="/configuracion/dashboard"
                className="font-semibold text-ruralia-teal-text hover:underline"
              >
                Personalízalo aquí
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {items.map((item) => {
            const Widget = REGISTRO_WIDGETS[item.widgetClave];
            const seccion =
              (proyectoId ? SECCION_WIDGET_PROYECTO[item.widgetClave] : undefined) ??
              SECCION_WIDGET[item.widgetClave];
            const Icono = ICONO_WIDGET[item.widgetClave];

            if (!seccion) {
              return (
                <div key={item.widgetClave} className={CLASE_TAMANO[item.tamano]}>
                  <Widget />
                </div>
              );
            }

            return (
              <TarjetaSeccion
                key={item.widgetClave}
                titulo={seccion.titulo}
                descripcion={seccion.descripcion}
                icono={Icono}
                className={CLASE_TAMANO[item.tamano]}
              >
                <Widget />
              </TarjetaSeccion>
            );
          })}
        </div>
      )}
    </FiltroDashboardProvider>
  );
}
