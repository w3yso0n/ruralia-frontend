"use client";

import { useEffect, useState } from "react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { obtenerKpisDashboard } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { KpisDashboard } from "@/lib/types";

function TarjetaKpi({
  etiqueta,
  valor,
  descripcion,
  destacado = false,
}: {
  etiqueta: string;
  valor: number | string;
  descripcion: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 transition ${
        destacado
          ? "border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/10"
          : "border-emerald-100 bg-white shadow-sm"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          destacado ? "text-emerald-100" : "text-emerald-700"
        }`}
      >
        {etiqueta}
      </p>
      <p
        className={`mt-2 text-4xl font-bold tracking-tight ${
          destacado ? "text-white" : "text-zinc-900"
        }`}
      >
        {valor}
      </p>
      <p
        className={`mt-1 text-xs ${
          destacado ? "text-emerald-100/80" : "text-zinc-500"
        }`}
      >
        {descripcion}
      </p>
    </div>
  );
}

function etiquetaEstado(estado: string): string {
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

export function DashboardInicio() {
  const { token } = useAuth();
  const [kpis, setKpis] = useState<KpisDashboard | null>(null);
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
        const datos = await obtenerKpisDashboard(token);
        if (!cancelado) setKpis(datos);
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
          Resumen general de la operación rural
        </p>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {cargando ? (
        <Spinner />
      ) : kpis ? (
        <>
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

          <section className="mt-8 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">
              Proyectos activos recientes
            </h3>
            {kpis.proyectosRecientes.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No hay proyectos activos registrados todavía.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100">
                {kpis.proyectosRecientes.map((proyecto) => (
                  <li
                    key={proyecto.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">
                        {proyecto.nombre}
                      </p>
                      <p className="text-sm text-zinc-500">
                        {proyecto.tipo.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {etiquetaEstado(proyecto.estado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
