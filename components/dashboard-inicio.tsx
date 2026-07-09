"use client";

import { useEffect, useState } from "react";
import { Activity, Map, Route } from "lucide-react";
import { GraficaActividadMensual } from "@/components/dashboard/grafica-actividad-mensual";
import { GraficaProgresoProyectos } from "@/components/dashboard/grafica-progreso-proyectos";
import { MapaCoberturaVeredas } from "@/components/dashboard/mapa-cobertura-veredas";
import { MapaSeguimientoCampo } from "@/components/dashboard/mapa-seguimiento-campo";
import { MedidorCircular } from "@/components/dashboard/medidor-circular";
import { MetricaNumerica } from "@/components/dashboard/metrica-numerica";
import { TablaJornadasRecientes } from "@/components/dashboard/tabla-jornadas-recientes";
import {
  AvisoDatosMock,
  ListaProyectosRecientes,
  TarjetaKpi,
} from "@/components/dashboard/tarjeta-kpi";
import { Alerta, Spinner } from "@/components/ui/modal";
import { obtenerKpisDashboard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DASHBOARD_USAR_MOCK,
  MOCK_DASHBOARD,
  type MockDashboardCompleto,
} from "@/lib/mock/dashboard-mock";
import type { KpisDashboard } from "@/lib/types";

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
      className={`rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="mb-5 flex items-start gap-3">
        {Icono ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
  const [kpisReales, setKpisReales] = useState<KpisDashboard | null>(null);
  const [cargando, setCargando] = useState(!DASHBOARD_USAR_MOCK);
  const [error, setError] = useState<string | null>(null);

  const mock: MockDashboardCompleto = MOCK_DASHBOARD;
  const kpis = DASHBOARD_USAR_MOCK ? mock.kpis : kpisReales;

  useEffect(() => {
    if (DASHBOARD_USAR_MOCK || !token) return;

    let cancelado = false;

    async function cargar() {
      if (!token) return;
      setCargando(true);
      setError(null);
      try {
        const datos = await obtenerKpisDashboard(token);
        if (!cancelado) setKpisReales(datos);
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar indicadores",
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [token]);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
        <p className="mt-1 text-zinc-600">
          Monitoreo operativo de proyectos, territorio y actividad en campo
        </p>
      </div>

      <AvisoDatosMock activo={DASHBOARD_USAR_MOCK} />

      {error ? <Alerta mensaje={error} /> : null}

      {cargando ? (
        <Spinner />
      ) : kpis ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TarjetaKpi
              etiqueta="Proyectos activos"
              valor={kpis.proyectosActivos}
              descripcion="En ejecución actualmente"
              destacado
            />
            <TarjetaKpi
              etiqueta="Total proyectos"
              valor={kpis.totalProyectos}
              descripcion="Todos los estados"
            />
            <TarjetaKpi
              etiqueta="Jornadas de campo"
              valor={kpis.jornadasRegistradas}
              descripcion="Actividades registradas"
            />
            <TarjetaKpi
              etiqueta="Indicadores"
              valor={kpis.indicadoresMonitoreados}
              descripcion="Métricas monitoreadas"
            />
          </div>

          <TarjetaSeccion
            titulo="Cumplimiento operativo"
            descripcion="Calculado desde plan de actividades, veredas y evidencias de jornadas"
            icono={Activity}
          >
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <MedidorCircular
                valor={mock.medidores.cumplimientoPlan}
                etiqueta="Avance del plan"
                subetiqueta="Promedio proyectos activos"
              />
              <MedidorCircular
                valor={mock.medidores.coberturaTerritorial}
                etiqueta="Cobertura territorial"
                subetiqueta="Veredas con jornada registrada"
                color="#0d9488"
              />
              <MedidorCircular
                valor={mock.medidores.jornadasConEvidencia}
                etiqueta="Jornadas con evidencia"
                subetiqueta="Completadas con foto adjunta"
                color="#2732a6"
              />
              <MetricaNumerica
                valor={mock.medidores.jornadasMesActual}
                etiqueta="Jornadas del mes"
                subetiqueta="COUNT por rango de fechas"
              />
            </div>
          </TarjetaSeccion>

          <div className="grid gap-6 xl:grid-cols-2">
            <TarjetaSeccion
              titulo="Actividad mensual"
              descripcion="Jornadas, envíos de formulario y beneficiarios atendidos"
            >
              <GraficaActividadMensual datos={mock.actividadMensual} />
            </TarjetaSeccion>

            <TarjetaSeccion
              titulo="Progreso por proyecto"
              descripcion="Avance del plan y beneficiarios vinculados"
            >
              <GraficaProgresoProyectos datos={mock.progresoProyectos} />
            </TarjetaSeccion>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TarjetaSeccion
              titulo="Mapa de cobertura territorial"
              descripcion="Veredas con proyectos activos (centroide de jornadas)"
              icono={Map}
            >
              <MapaCoberturaVeredas veredas={mock.veredasCobertura} />
            </TarjetaSeccion>

            <TarjetaSeccion
              titulo="Jornadas georreferenciadas"
              descripcion={`${mock.seguimientoDestacado.nombreProyecto} — avance cronológico en campo`}
              icono={Route}
            >
              <MapaSeguimientoCampo seguimiento={mock.seguimientoDestacado} />
            </TarjetaSeccion>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <TarjetaSeccion
              titulo="Proyectos activos recientes"
              descripcion="Últimos proyectos en ejecución"
            >
              <ListaProyectosRecientes proyectos={kpis.proyectosRecientes} />
            </TarjetaSeccion>

            <TarjetaSeccion
              titulo="Jornadas recientes"
              descripcion="Actividad de campo registrada por técnicos"
            >
              <TablaJornadasRecientes jornadas={mock.jornadasRecientes} />
            </TarjetaSeccion>
          </div>
        </div>
      ) : null}
    </>
  );
}
