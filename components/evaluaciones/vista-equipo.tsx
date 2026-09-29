"use client";

import {
  CalendarCheck,
  ChevronRight,
  Info,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  AnilloIndice,
  BadgeNivel,
  BarraAvance,
  formatearNumero,
} from "@/components/evaluaciones/indicadores-evaluacion";
import { AvatarUsuario } from "@/components/ui/avatar-usuario";
import type { ProductividadPersona } from "@/lib/types";

export function TarjetaIndicador({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  children,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  detalle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Icono className="h-4 w-4 text-ruralia-teal" />
        {etiqueta}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{valor}</p>
      {children ? <div className="mt-2">{children}</div> : null}
      {detalle ? <p className="mt-1 text-xs text-zinc-500">{detalle}</p> : null}
    </div>
  );
}

export function VistaEquipo({
  personas,
  mostrarProyecto,
  onSeleccionar,
  onIrACuotas,
}: {
  personas: ProductividadPersona[];
  mostrarProyecto: boolean;
  onSeleccionar: (usuarioId: string) => void;
  onIrACuotas?: () => void;
}) {
  if (personas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-6 py-14 text-center">
        <Users className="mx-auto h-8 w-8 text-ruralia-teal-muted" />
        <p className="mt-3 font-semibold text-zinc-900">
          Sin actividad en este periodo
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
          Nadie registró jornadas ni tiene cuotas en este mes. Prueba con otro
          mes u otro proyecto.
        </p>
      </div>
    );
  }

  const jornadas = personas.reduce((s, p) => s + p.conteoJornadas, 0);
  const aprobadas = personas.reduce((s, p) => s + p.jornadasAprobadas, 0);
  const beneficiarios = personas.reduce((s, p) => s + p.beneficiariosAtendidos, 0);
  const conCuota = personas.filter((p) => p.cuotasAsignadas > 0);
  const cumplimientoEquipo = conCuota.length
    ? conCuota.reduce((s, p) => s + p.cumplimientoPorcentaje, 0) / conCuota.length
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          icono={Users}
          etiqueta="Personas evaluadas"
          valor={String(personas.length)}
          detalle={`${conCuota.length} con cuotas asignadas`}
        />
        <TarjetaIndicador
          icono={CalendarCheck}
          etiqueta="Jornadas del mes"
          valor={String(jornadas)}
          detalle={`${aprobadas} aprobadas`}
        />
        <TarjetaIndicador
          icono={Users}
          etiqueta="Beneficiarios atendidos"
          valor={formatearNumero(beneficiarios)}
          detalle="Suma de lo atendido por cada persona"
        />
        <TarjetaIndicador
          icono={Target}
          etiqueta="Cumplimiento de cuotas"
          valor={
            cumplimientoEquipo != null
              ? `${formatearNumero(cumplimientoEquipo)}%`
              : "Sin cuotas"
          }
        >
          {cumplimientoEquipo != null ? (
            <BarraAvance porcentaje={cumplimientoEquipo} />
          ) : onIrACuotas ? (
            <button
              type="button"
              onClick={onIrACuotas}
              className="text-xs font-semibold text-ruralia-teal-text hover:underline"
            >
              Asignar cuotas
            </button>
          ) : null}
        </TarjetaIndicador>
      </div>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-zinc-900">Equipo de campo</h3>
            <p className="text-xs text-zinc-500">
              Ordenado por índice de eficiencia. Haz clic en una persona para
              ver su ficha.
            </p>
          </div>
          <details className="group relative text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2 py-1 font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft">
              <Info className="h-3.5 w-3.5" />
              ¿Cómo se calcula el índice?
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-2xl border border-ruralia-teal-border bg-white p-4 text-zinc-600 shadow-lg shadow-zinc-900/10">
              <p className="font-semibold text-zinc-900">Índice de 0 a 100</p>
              <ul className="mt-2 space-y-1">
                <li>28% cumplimiento de cuotas</li>
                <li>20% jornadas realizadas</li>
                <li>16% beneficiarios atendidos</li>
                <li>10% jornadas con foto de evidencia</li>
                <li>10% calidad (pocos rechazos en revisión)</li>
                <li>8% veredas cubiertas y 8% formularios enviados</li>
              </ul>
              <p className="mt-2">
                Jornadas, beneficiarios, veredas y formularios se comparan con
                la persona del equipo que más tiene. Quien no tiene cuotas
                recibe un valor neutro en cumplimiento.
              </p>
            </div>
          </details>
        </div>

        <ul className="divide-y divide-zinc-100">
          {personas.map((p, i) => (
            <li key={`${p.usuarioId}-${p.proyectoId ?? ""}`}>
              <button
                type="button"
                onClick={() => onSeleccionar(p.usuarioId)}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-4 text-left transition hover:bg-ruralia-teal-soft/40 md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1.2fr)_auto_auto]"
              >
                <span className="flex items-center gap-3">
                  <span className="w-5 text-right text-sm font-semibold text-zinc-400">
                    {i + 1}
                  </span>
                  <AvatarUsuario nombre={p.nombreCompleto} />
                </span>

                <span className="min-w-0">
                  <span className="block truncate font-medium text-zinc-900">
                    {p.nombreCompleto}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {p.conteoJornadas} jornada{p.conteoJornadas === 1 ? "" : "s"}{" "}
                    · {p.beneficiariosAtendidos} beneficiario
                    {p.beneficiariosAtendidos === 1 ? "" : "s"}
                    {mostrarProyecto && p.proyectoNombre
                      ? ` · ${p.proyectoNombre}`
                      : ""}
                  </span>
                </span>

                <span className="col-span-3 min-w-0 md:col-span-1">
                  {p.cuotasAsignadas > 0 ? (
                    <>
                      <span className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                        <span className="text-zinc-500">
                          Cuotas ({p.cuotasAsignadas})
                        </span>
                        <span className="font-semibold text-zinc-900">
                          {formatearNumero(p.cumplimientoPorcentaje)}%
                        </span>
                      </span>
                      <BarraAvance porcentaje={p.cumplimientoPorcentaje} />
                    </>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Sin cuotas asignadas
                    </span>
                  )}
                </span>

                <span className="hidden items-center gap-3 md:flex">
                  <AnilloIndice valor={p.indiceEficiencia} />
                  <BadgeNivel indice={p.indiceEficiencia} />
                </span>

                <span className="flex items-center gap-2 md:contents">
                  <span className="md:hidden">
                    <AnilloIndice valor={p.indiceEficiencia} />
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
