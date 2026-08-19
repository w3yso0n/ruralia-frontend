"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import {
  ICONO_WIDGET,
  REGISTRO_WIDGETS,
} from "@/components/dashboard/registro-widgets";
import { Alerta, Spinner } from "@/components/ui/modal";
import { obtenerMiConfiguracionDashboard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ConfiguracionDashboard, TamanoWidgetDashboard } from "@/lib/types";

/** Etiquetas y descripciones de sección para widgets que no son KPI simple. */
const SECCION_WIDGET: Record<
  string,
  { titulo: string; descripcion?: string }
> = {
  "medidor.cumplimiento_operativo": {
    titulo: "Cumplimiento operativo",
    descripcion: "Calculado desde plan de actividades, veredas y evidencias de jornadas",
  },
  "lista.agentes_eficientes": {
    titulo: "Agentes de campo más eficientes",
    descripcion: "Top del mes por índice de eficiencia (cumplimiento, jornadas, cobertura y evidencia)",
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
    descripcion: "Veredas con proyectos activos e inactivos (centroide de jornadas)",
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
      className={`flex h-full flex-col rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm ${className}`}
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
  const [config, setConfig] = useState<ConfiguracionDashboard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const items = (config?.items ?? [])
    .filter((i) => i.visible && REGISTRO_WIDGETS[i.widgetClave])
    .sort((a, b) => a.posicion - b.posicion);

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-zinc-600">
            Monitoreo operativo de proyectos, territorio y actividad en campo
          </p>
        </div>
        <Link
          href="/configuracion/dashboard"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Settings2 className="h-4 w-4 text-ruralia-teal" />
          Personalizar
        </Link>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {cargando ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Tu dashboard no tiene widgets configurados todavía.{" "}
          <Link
            href="/configuracion/dashboard"
            className="font-semibold text-ruralia-teal-text hover:underline"
          >
            Personalízalo aquí
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {items.map((item) => {
            const Widget = REGISTRO_WIDGETS[item.widgetClave];
            const seccion = SECCION_WIDGET[item.widgetClave];
            const Icono = ICONO_WIDGET[item.widgetClave];

            if (!seccion) {
              // Widgets tipo KPI: ya traen su propio marco visual (TarjetaKpi).
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
    </>
  );
}
