"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Map, Users } from "lucide-react";
import { ListaAgentesEficientes } from "@/components/evaluaciones/lista-agentes-eficientes";
import { GraficaActividadMensual } from "@/components/dashboard/grafica-actividad-mensual";
import { GraficaProgresoProyectos } from "@/components/dashboard/grafica-progreso-proyectos";
import { MapaCoberturaVeredas } from "@/components/dashboard/mapa-cobertura-veredas";
import { MedidorCircular } from "@/components/dashboard/medidor-circular";
import { MetricaNumerica } from "@/components/dashboard/metrica-numerica";
import { TablaJornadasRecientes } from "@/components/dashboard/tabla-jornadas-recientes";
import {
  ListaProyectosRecientes,
  TarjetaKpi,
} from "@/components/dashboard/tarjeta-kpi";
import { Spinner } from "@/components/ui/modal";
import {
  obtenerActividadMensualDashboard,
  obtenerCumplimientoDashboard,
  obtenerCumplimientoEquipoDashboard,
  obtenerJornadasRecientesDashboard,
  obtenerKpisDashboard,
  obtenerMapaCoberturaDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ProductividadPersona,
  SerieMensualDashboard,
  VeredaCobertura,
} from "@/lib/types";

/**
 * Hook genérico para que cada widget pida su propio dato de forma autocontenida,
 * en vez de depender del blob /dashboard completo.
 */
function useDatoWidget<T>(cargar: (token: string) => Promise<T>) {
  const { token } = useAuth();
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    cargar(token)
      .then((res) => {
        if (!vivo) return;
        setDatos(res);
        setError(false);
      })
      .catch(() => {
        if (vivo) setError(true);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { datos, cargando, error };
}

function EstadoCargaWidget({
  cargando,
  error,
  children,
}: {
  cargando: boolean;
  error: boolean;
  children: React.ReactNode;
}) {
  if (cargando) return <Spinner className="py-8" />;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        No se pudo cargar la información de este widget.
      </p>
    );
  }
  return <>{children}</>;
}

type CampoKpiNumerico =
  | "proyectosActivos"
  | "totalProyectos"
  | "jornadasRegistradas"
  | "agentesEnCampo";

function WidgetKpisResumen({ campo }: { campo: CampoKpiNumerico }) {
  const { datos, cargando, error } = useDatoWidget(obtenerKpisDashboard);
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos ? (
        <TarjetaKpi
          etiqueta={ETIQUETAS_KPI[campo].etiqueta}
          valor={datos[campo]}
          descripcion={ETIQUETAS_KPI[campo].descripcion}
          destacado={campo === "proyectosActivos"}
        />
      ) : null}
    </EstadoCargaWidget>
  );
}

const ETIQUETAS_KPI: Record<
  CampoKpiNumerico,
  { etiqueta: string; descripcion: string }
> = {
  proyectosActivos: {
    etiqueta: "Proyectos activos",
    descripcion: "En ejecución actualmente",
  },
  totalProyectos: {
    etiqueta: "Total proyectos",
    descripcion: "Todos los estados",
  },
  jornadasRegistradas: {
    etiqueta: "Jornadas de campo",
    descripcion: "Actividades registradas",
  },
  agentesEnCampo: {
    etiqueta: "Agentes en campo",
    descripcion: "Técnicos con jornadas registradas",
  },
};

/**
 * Los 4 indicadores de cumplimiento operativo son un único widget: siempre se
 * calculan y muestran juntos, no tiene sentido dejarlos como piezas sueltas.
 */
function WidgetCumplimientoOperativo() {
  const { datos, cargando, error } = useDatoWidget(obtenerCumplimientoDashboard);
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos ? (
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <MedidorCircular
            valor={datos.cumplimientoPlan}
            etiqueta="Avance del plan"
            subetiqueta="Promedio proyectos activos"
          />
          <MedidorCircular
            valor={datos.coberturaTerritorial}
            etiqueta="Cobertura territorial"
            subetiqueta="Veredas con jornada registrada"
            color="#0d9488"
          />
          <MedidorCircular
            valor={datos.jornadasConEvidencia}
            etiqueta="Jornadas con evidencia"
            subetiqueta="Completadas con foto adjunta"
            color="#356960"
          />
          <MetricaNumerica
            valor={datos.jornadasMesActual}
            etiqueta="Jornadas del mes"
            subetiqueta="Periodo calendario actual"
          />
        </div>
      ) : null}
    </EstadoCargaWidget>
  );
}

function WidgetAgentesEficientes() {
  const { datos, cargando, error } = useDatoWidget<ProductividadPersona[]>(
    (token) => obtenerCumplimientoEquipoDashboard(token),
  );
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos && datos.length > 0 ? (
        <>
          <ListaAgentesEficientes personas={datos} limite={6} />
          <Link
            href="/evaluaciones"
            className="mt-4 inline-block text-sm font-semibold text-ruralia-teal-text hover:underline"
          >
            Ver módulo Evaluaciones →
          </Link>
        </>
      ) : (
        <p className="text-sm text-zinc-500">Sin datos de eficiencia todavía.</p>
      )}
    </EstadoCargaWidget>
  );
}

function WidgetActividadMensual() {
  const { datos, cargando, error } = useDatoWidget<SerieMensualDashboard[]>(
    (token) => obtenerActividadMensualDashboard(token),
  );
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos ? <GraficaActividadMensual datos={datos} /> : null}
    </EstadoCargaWidget>
  );
}

function WidgetProgresoProyectos() {
  const { datos, cargando, error } = useDatoWidget(obtenerKpisDashboard);
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos ? (
        <GraficaProgresoProyectos
          datos={datos.proyectosRecientes.map((p) => ({
            proyectoId: p.id,
            nombre: p.nombre,
            tipo: p.tipo,
            progresoPorcentaje: p.progresoPorcentaje ?? 0,
            conteoBeneficiarios: p.conteoBeneficiarios ?? 0,
          }))}
        />
      ) : null}
    </EstadoCargaWidget>
  );
}

function WidgetMapaCobertura() {
  const { datos, cargando, error } = useDatoWidget<VeredaCobertura[]>((token) =>
    obtenerMapaCoberturaDashboard(token),
  );
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      <MapaCoberturaVeredas veredas={datos ?? []} />
    </EstadoCargaWidget>
  );
}

function WidgetProyectosRecientes() {
  const { datos, cargando, error } = useDatoWidget(obtenerKpisDashboard);
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      {datos ? (
        <ListaProyectosRecientes proyectos={datos.proyectosRecientes} />
      ) : null}
    </EstadoCargaWidget>
  );
}

function WidgetJornadasRecientes() {
  const { datos, cargando, error } = useDatoWidget((token) =>
    obtenerJornadasRecientesDashboard(token, 5),
  );
  return (
    <EstadoCargaWidget cargando={cargando} error={error}>
      <TablaJornadasRecientes jornadas={datos ?? []} />
    </EstadoCargaWidget>
  );
}

/** Icono por widget para el marco de sección (widgets tipo GRAFICA/MAPA/LISTA). */
export const ICONO_WIDGET: Record<string, typeof Activity> = {
  "medidor.cumplimiento_operativo": Activity,
  "lista.agentes_eficientes": Users,
  "mapa.cobertura_veredas": Map,
};

/** Registro clave del catálogo → componente autocontenido. */
export const REGISTRO_WIDGETS: Record<string, React.ComponentType> = {
  "kpi.proyectos_activos": () => <WidgetKpisResumen campo="proyectosActivos" />,
  "kpi.total_proyectos": () => <WidgetKpisResumen campo="totalProyectos" />,
  "kpi.jornadas_registradas": () => (
    <WidgetKpisResumen campo="jornadasRegistradas" />
  ),
  "kpi.agentes_en_campo": () => <WidgetKpisResumen campo="agentesEnCampo" />,
  "medidor.cumplimiento_operativo": WidgetCumplimientoOperativo,
  "lista.agentes_eficientes": WidgetAgentesEficientes,
  "grafica.actividad_mensual": WidgetActividadMensual,
  "grafica.progreso_proyectos": WidgetProgresoProyectos,
  "mapa.cobertura_veredas": WidgetMapaCobertura,
  "tabla.proyectos_recientes": WidgetProyectosRecientes,
  "tabla.jornadas_recientes": WidgetJornadasRecientes,
};
