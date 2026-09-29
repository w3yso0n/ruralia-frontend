"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarCheck,
  Download,
  MapPinned,
  Target,
  Users,
} from "lucide-react";
import {
  AnilloIndice,
  BadgeNivel,
  BarraAvance,
  esCuotaTotal,
  estadoCuota,
  formatearNumero,
  MESES,
} from "@/components/evaluaciones/indicadores-evaluacion";
import { TarjetaIndicador } from "@/components/evaluaciones/vista-equipo";
import { AvatarUsuario } from "@/components/ui/avatar-usuario";
import { Spinner } from "@/components/ui/modal";
import type {
  ProductividadPersona,
  ProductividadUsuarioDetalle,
} from "@/lib/types";

export function FichaEvaluacion({
  detalle,
  resumen,
  anio,
  mes,
  descargandoPdf,
  onDescargarPdf,
  onVolver,
  onIrACuotas,
}: {
  detalle: ProductividadUsuarioDetalle | null;
  /** Fila del equipo para el índice y las jornadas aprobadas; puede no existir. */
  resumen?: ProductividadPersona;
  anio: number;
  mes: number;
  descargandoPdf: boolean;
  onDescargarPdf: () => void;
  onVolver: () => void;
  onIrACuotas?: () => void;
}) {
  const volver = (
    <button
      type="button"
      onClick={onVolver}
      className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver al equipo
    </button>
  );

  if (!detalle) {
    return (
      <div>
        {volver}
        <Spinner />
      </div>
    );
  }

  const cuotas = detalle.asignaciones.filter((a) => a.cantidadAsignada > 0);
  const cumplidas = cuotas.filter((a) => a.cumplimientoPorcentaje >= 100).length;
  const mensualesAtrasadas = cuotas.filter(
    (a) => !esCuotaTotal(a) && a.cumplimientoPorcentaje < 100,
  ).length;

  return (
    <div>
      {volver}

      <section className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <AvatarUsuario nombre={detalle.usuario.nombreCompleto} tamano="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-zinc-900">
            {detalle.usuario.nombreCompleto}
          </h3>
          <p className="truncate text-sm text-zinc-500">
            {detalle.usuario.correo}
            {" · "}
            {MESES[mes - 1]} {anio}
          </p>
        </div>
        {resumen ? (
          <div className="flex items-center gap-3">
            <AnilloIndice valor={resumen.indiceEficiencia} tamano={64} />
            <div>
              <p className="text-xs text-zinc-500">Índice de eficiencia</p>
              <BadgeNivel indice={resumen.indiceEficiencia} />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          disabled={descargandoPdf}
          onClick={onDescargarPdf}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {descargandoPdf ? "Generando…" : "PDF"}
        </button>
      </section>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          icono={Target}
          etiqueta="Cumplimiento de cuotas"
          valor={
            cuotas.length ? `${formatearNumero(detalle.cumplimientoPromedio)}%` : "—"
          }
          detalle={
            cuotas.length
              ? `${cumplidas} de ${cuotas.length} cumplidas`
              : "Sin cuotas en este periodo"
          }
        >
          {cuotas.length ? (
            <BarraAvance porcentaje={detalle.cumplimientoPromedio} />
          ) : null}
        </TarjetaIndicador>
        <TarjetaIndicador
          icono={CalendarCheck}
          etiqueta="Jornadas"
          valor={String(detalle.conteoJornadas)}
          detalle={
            resumen ? `${resumen.jornadasAprobadas} aprobadas` : undefined
          }
        />
        <TarjetaIndicador
          icono={Users}
          etiqueta="Beneficiarios"
          valor={formatearNumero(detalle.beneficiariosAtendidos)}
        />
        <TarjetaIndicador
          icono={MapPinned}
          etiqueta="Veredas"
          valor={String(detalle.veredasCubiertas)}
        />
      </div>

      {(detalle.rechazosRevision ?? 0) > 0 ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {detalle.rechazosRevision} rechazo
          {detalle.rechazosRevision === 1 ? "" : "s"} en revisión este mes.
        </p>
      ) : null}

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-zinc-900">Avance por meta</h3>
          <p className="text-xs text-zinc-500">
            {cuotas.length === 0
              ? "No tiene cuotas personales en este periodo."
              : mensualesAtrasadas > 0
                ? `${mensualesAtrasadas} cuota${mensualesAtrasadas === 1 ? "" : "s"} del mes por debajo de lo planeado.`
                : "Las cuotas totales se miden con lo acumulado hasta el fin del mes."}
          </p>
        </div>

        {cuotas.length === 0 ? (
          <div className="rounded-xl bg-ruralia-teal-soft/40 px-4 py-6 text-center text-sm text-zinc-600">
            Sus jornadas y cobertura sí cuentan en los indicadores de arriba.
            {onIrACuotas ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onIrACuotas}
                  className="font-semibold text-ruralia-teal-text hover:underline"
                >
                  Asignar cuotas
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-4">
            {cuotas.map((a) => {
              const estado = estadoCuota(a);
              const Icono = estado.icono;
              return (
                <li key={a.id}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900">
                        {a.metaNombre}
                      </span>
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                        {esCuotaTotal(a)
                          ? "Cuota total"
                          : `Cuota de ${MESES[(a.mes ?? 1) - 1].toLowerCase()}`}
                      </span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${estado.clase}`}
                    >
                      <Icono className="h-3 w-3" />
                      {estado.texto}
                    </span>
                  </div>
                  <BarraAvance porcentaje={a.cumplimientoPorcentaje} />
                  <p className="mt-1 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-900">
                      {formatearNumero(a.ejecutado)}
                    </span>{" "}
                    de {formatearNumero(a.cantidadAsignada)} {a.unidadMedida} (
                    {formatearNumero(a.cumplimientoPorcentaje)}%)
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
