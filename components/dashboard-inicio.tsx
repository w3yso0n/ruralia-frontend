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
import { Alerta, Spinner } from "@/components/ui/modal";
import { obtenerDashboardCompleto, obtenerCumplimientoEquipoDashboard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  DashboardCompleto,
  ProductividadPersona,
} from "@/lib/types";

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
      className={`rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm ${className}`}
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
  const [datos, setDatos] = useState<DashboardCompleto | null>(null);
  const [equipo, setEquipo] = useState<ProductividadPersona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelado = false;

    async function cargar() {
      if (!token) return;
      setCargando(true);
      setError(null);
      try {
        const [completo, cumplimientoEquipo] = await Promise.all([
          obtenerDashboardCompleto(token),
          obtenerCumplimientoEquipoDashboard(token).catch(() => [] as ProductividadPersona[]),
        ]);
        if (!cancelado) {
          setDatos(completo);
          setEquipo(cumplimientoEquipo);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el dashboard",
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

  const kpis = datos?.kpis;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
        <p className="mt-1 text-zinc-600">
          Monitoreo operativo de proyectos, territorio y actividad en campo
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {cargando ? (
        <Spinner />
      ) : kpis && datos ? (
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
              etiqueta="Agentes en campo"
              valor={kpis.agentesEnCampo}
              descripcion="Técnicos con jornadas registradas"
            />
          </div>

          <TarjetaSeccion
            titulo="Cumplimiento operativo"
            descripcion="Calculado desde plan de actividades, veredas y evidencias de jornadas"
            icono={Activity}
          >
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              <MedidorCircular
                valor={datos.medidores.cumplimientoPlan}
                etiqueta="Avance del plan"
                subetiqueta="Promedio proyectos activos"
              />
              <MedidorCircular
                valor={datos.medidores.coberturaTerritorial}
                etiqueta="Cobertura territorial"
                subetiqueta="Veredas con jornada registrada"
                color="#0d9488"
              />
              <MedidorCircular
                valor={datos.medidores.jornadasConEvidencia}
                etiqueta="Jornadas con evidencia"
                subetiqueta="Completadas con foto adjunta"
                color="#356960"
              />
              <MetricaNumerica
                valor={datos.medidores.jornadasMesActual}
                etiqueta="Jornadas del mes"
                subetiqueta="Periodo calendario actual"
              />
            </div>
          </TarjetaSeccion>

          {equipo.length > 0 ? (
            <TarjetaSeccion
              titulo="Agentes de campo más eficientes"
              descripcion="Top del mes por índice de eficiencia (cumplimiento, jornadas, cobertura y evidencia)"
              icono={Users}
            >
              <ListaAgentesEficientes personas={equipo} limite={6} />
              <Link
                href="/evaluaciones"
                className="mt-4 inline-block text-sm font-semibold text-ruralia-teal-text hover:underline"
              >
                Ver módulo Evaluaciones →
              </Link>
            </TarjetaSeccion>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-2">
            <TarjetaSeccion
              titulo="Actividad mensual"
              descripcion="Jornadas, envíos de formulario y beneficiarios atendidos"
            >
              <GraficaActividadMensual datos={datos.actividadMensual} />
            </TarjetaSeccion>

            <TarjetaSeccion
              titulo="Progreso por proyecto"
              descripcion="Avance del plan y beneficiarios vinculados"
            >
              <GraficaProgresoProyectos datos={datos.progresoProyectos} />
            </TarjetaSeccion>
          </div>

          <TarjetaSeccion
            titulo="Mapa de cobertura territorial"
            descripcion="Veredas con proyectos activos e inactivos (centroide de jornadas)"
            icono={Map}
          >
            <MapaCoberturaVeredas veredas={datos.veredasCobertura} />
          </TarjetaSeccion>

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
              <TablaJornadasRecientes jornadas={datos.jornadasRecientes} />
            </TarjetaSeccion>
          </div>
        </div>
      ) : null}
    </>
  );
}
