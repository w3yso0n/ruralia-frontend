"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Plus } from "lucide-react";
import {
  ModalEquipoResumen,
  type FiltroEquipoResumen,
} from "@/components/proyectos/gestion-proyecto/modal-equipo-resumen";
import { Alerta } from "@/components/ui/modal";
import { obtenerResumenProyecto } from "@/lib/api";
import type { ResumenProyecto as DatosResumen } from "@/lib/types";

const formatoNumero = new Intl.NumberFormat("es-CO");

function numero(valor: number): string {
  return formatoNumero.format(valor);
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return fecha;
  return `${dia}/${mes}/${anio}`;
}

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${numero(n)} ${n === 1 ? singular : pluralTexto}`;
}

const MAX_MUNICIPIOS = 7;
const MUNICIPIOS_VISIBLES = 6;

interface FilaMunicipio {
  clave: string;
  nombre: string;
  total: number;
  sinMunicipio?: boolean;
}

/** Ordenados de mayor a menor; con más de 7 se agrupan en "Otros (N)". */
function filasMunicipio(
  porMunicipio: DatosResumen["contraparte"]["porMunicipio"],
): FilaMunicipio[] {
  const conNombre = porMunicipio.filter((m) => m.municipio);
  const sinMunicipio = porMunicipio.find((m) => !m.municipio);

  const filas: FilaMunicipio[] =
    conNombre.length > MAX_MUNICIPIOS
      ? [
          ...conNombre.slice(0, MUNICIPIOS_VISIBLES).map((m) => ({
            clave: m.municipio!,
            nombre: m.municipio!,
            total: m.total,
          })),
          {
            clave: "__otros",
            nombre: `Otros (${conNombre.length - MUNICIPIOS_VISIBLES})`,
            total: conNombre
              .slice(MUNICIPIOS_VISIBLES)
              .reduce((suma, m) => suma + m.total, 0),
          },
        ]
      : conNombre.map((m) => ({
          clave: m.municipio!,
          nombre: m.municipio!,
          total: m.total,
        }));

  if (sinMunicipio) {
    filas.push({
      clave: "__sin",
      nombre: "Sin municipio",
      total: sinMunicipio.total,
      sinMunicipio: true,
    });
  }
  return filas;
}

interface ResumenProyectoProps {
  token: string;
  proyectoId: string;
  puedeGestionar?: boolean;
  /** Cambia cuando la vista recarga el proyecto, para volver a pedir los agregados. */
  version?: number;
}

export function ResumenProyecto({
  token,
  proyectoId,
  puedeGestionar,
  version = 0,
}: ResumenProyectoProps) {
  const [datos, setDatos] = useState<DatosResumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    obtenerResumenProyecto(token, proyectoId)
      .then((r) => {
        if (!vigente) return;
        setDatos(r);
        setError(null);
      })
      .catch((err: unknown) => {
        if (vigente) {
          setError(
            err instanceof Error ? err.message : "Error al cargar el resumen",
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, [token, proyectoId, version]);

  const urlEquipo = `/proyectos/${proyectoId}?tab=equipo`;

  if (error && !datos) return <Alerta mensaje={error} />;
  if (!datos) return <EsqueletoResumen />;

  const { contraparte, equipo } = datos;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          etiqueta="Progreso del plan"
          valor={`${datos.progreso}%`}
        >
          <div
            aria-hidden="true"
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-ruralia-teal"
              style={{
                width: `${Math.min(100, Math.max(0, datos.progreso))}%`,
              }}
            />
          </div>
        </TarjetaIndicador>
        <TarjetaIndicador
          etiqueta="Beneficiarios"
          valor={numero(contraparte.beneficiarios)}
        >
          <p className="mt-1 text-[13px] text-zinc-500">
            {plural(contraparte.asociaciones, "asociación", "asociaciones")}
          </p>
        </TarjetaIndicador>
        <TarjetaIndicador etiqueta="Jornadas" valor={numero(datos.jornadas)}>
          <p className="mt-1 text-[13px] text-zinc-500">
            {plural(datos.formularios, "formulario", "formularios")}
          </p>
        </TarjetaIndicador>
        <TarjetaIndicador
          etiqueta="Actividades completadas"
          valor={`${numero(datos.actividades.completadas)} / ${numero(datos.actividades.total)}`}
        >
          <p className="mt-1 text-[13px] text-zinc-500">
            {formatearFecha(datos.fechas.inicio)} –{" "}
            {formatearFecha(datos.fechas.fin)}
          </p>
        </TarjetaIndicador>
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <TarjetaEquipo
          token={token}
          proyectoId={proyectoId}
          version={version}
          equipo={equipo}
          urlEquipo={urlEquipo}
          puedeGestionar={puedeGestionar}
        />
        <TarjetaContraparte
          contraparte={contraparte}
          urlEquipo={urlEquipo}
          puedeGestionar={puedeGestionar}
        />
      </div>
    </div>
  );
}

function TarjetaIndicador({
  etiqueta,
  valor,
  children,
}: {
  etiqueta: string;
  valor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ruralia-teal-border bg-white px-5 py-[18px]">
      <p className="text-[13px] text-zinc-500">{etiqueta}</p>
      <p className="mt-1 text-[28px] font-bold leading-tight tabular-nums text-zinc-900">
        {valor}
      </p>
      {children}
    </div>
  );
}

function EncabezadoTarjeta({
  id,
  titulo,
  total,
  subtitulo,
  urlGestionar,
  acciones,
}: {
  id: string;
  titulo: string;
  total?: number;
  subtitulo: string;
  urlGestionar?: string;
  acciones?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-5">
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-semibold text-zinc-900">
          {titulo}
          {total !== undefined ? (
            <span className="font-medium tabular-nums text-zinc-500">
              {" "}
              · {numero(total)}
            </span>
          ) : null}
        </h2>
        <p className="mt-0.5 text-[13px] text-zinc-500">{subtitulo}</p>
      </div>
      <div className="-mr-2 flex shrink-0 items-center gap-1">
        {acciones}
        {urlGestionar ? (
          <Link
            href={urlGestionar}
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
          >
            Gestionar
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function TarjetaEquipo({
  token,
  proyectoId,
  version,
  equipo,
  urlEquipo,
  puedeGestionar,
}: {
  token: string;
  proyectoId: string;
  version: number;
  equipo: DatosResumen["equipo"];
  urlEquipo: string;
  puedeGestionar?: boolean;
}) {
  const [filtro, setFiltro] = useState<FiltroEquipoResumen | null>(null);

  return (
    <section
      aria-labelledby="resumen-equipo-titulo"
      className="flex min-w-0 flex-[1_1_480px] flex-col overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white"
    >
      <EncabezadoTarjeta
        id="resumen-equipo-titulo"
        titulo="Equipo interno"
        total={equipo.total}
        subtitulo="Agrupado por rol. El detalle de cada persona está en Equipo y contraparte."
        urlGestionar={
          puedeGestionar ? `${urlEquipo}#equipo-interno` : undefined
        }
        acciones={
          equipo.total > 0 ? (
            <button
              type="button"
              onClick={() => setFiltro({ tipo: "todos" })}
              className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
            >
              Ver todos
            </button>
          ) : null
        }
      />

      {equipo.porRol.length ? (
        <ul className="px-6 pb-2">
          {equipo.porRol.map((rol) => {
            const restantes = rol.total - rol.muestra.length;
            return (
              <li
                key={rol.rolId ?? "sin-rol"}
                className="border-t border-zinc-100 py-1"
              >
                <button
                  type="button"
                  onClick={() =>
                    setFiltro({ tipo: "rol", rolId: rol.rolId ?? "sin-rol" })
                  }
                  aria-label={`Ver las ${numero(rol.total)} personas de ${rol.rol}`}
                  className="group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-xl px-3 py-2.5 text-left transition hover:bg-ruralia-teal-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruralia-teal/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {rol.rol}
                    </p>
                    {rol.descripcion ? (
                      <p className="truncate text-[13px] text-zinc-500">
                        {rol.descripcion}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className="flex shrink-0 items-center pl-2"
                    title={`${rol.muestra.map((m) => m.nombre).join(", ")}${restantes > 0 ? ` y ${numero(restantes)} más` : ""}`}
                  >
                    {rol.muestra.map((m) => (
                      <span
                        key={m.id}
                        aria-hidden="true"
                        className="-ml-2 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-ruralia-teal-soft text-[11px] font-semibold text-ruralia-teal-text"
                      >
                        {m.iniciales}
                      </span>
                    ))}
                    {restantes > 0 ? (
                      <span
                        aria-hidden="true"
                        className="-ml-2 inline-flex h-[30px] min-w-[30px] items-center justify-center rounded-full border-2 border-white bg-zinc-100 px-1.5 text-[11px] font-semibold tabular-nums text-zinc-600"
                      >
                        +{numero(restantes)}
                      </span>
                    ) : null}
                  </div>
                  <span className="w-9 shrink-0 text-right text-[15px] font-semibold tabular-nums text-zinc-900">
                    {numero(rol.total)}
                  </span>
                  <ChevronRight
                    className="-ml-2 h-4 w-4 shrink-0 text-zinc-300 transition group-hover:text-ruralia-teal"
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 border-t border-zinc-100 px-6 py-5">
          <p className="text-sm text-zinc-500">Aún no hay equipo asignado.</p>
          {puedeGestionar ? (
            <Link
              href={`${urlEquipo}#equipo-interno`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-ruralia-teal px-4 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Asignar equipo
            </Link>
          ) : null}
        </div>
      )}

      <ModalEquipoResumen
        key={version}
        token={token}
        proyectoId={proyectoId}
        equipo={equipo}
        filtro={filtro}
        onCambiarFiltro={setFiltro}
        onCerrar={() => setFiltro(null)}
        urlGestionar={
          puedeGestionar ? `${urlEquipo}#equipo-interno` : undefined
        }
      />
    </section>
  );
}

function TarjetaContraparte({
  contraparte,
  urlEquipo,
  puedeGestionar,
}: {
  contraparte: DatosResumen["contraparte"];
  urlEquipo: string;
  puedeGestionar?: boolean;
}) {
  const filas = filasMunicipio(contraparte.porMunicipio);
  const hayMunicipios = filas.some((f) => !f.sinMunicipio);
  const maximo = Math.max(1, ...filas.map((f) => f.total));
  const sinMunicipio =
    contraparte.porMunicipio.find((m) => !m.municipio)?.total ?? 0;
  const vacia =
    contraparte.beneficiarios === 0 && contraparte.asociaciones === 0;

  return (
    <section
      aria-labelledby="resumen-contraparte-titulo"
      className="flex min-w-0 flex-[1_1_480px] flex-col overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white"
    >
      <EncabezadoTarjeta
        id="resumen-contraparte-titulo"
        titulo="Contraparte"
        subtitulo="Beneficiarios por municipio. En cada jornada eliges a quién se atiende."
        urlGestionar={puedeGestionar ? `${urlEquipo}#contraparte` : undefined}
      />

      <div className="flex gap-2 px-6 pb-4">
        <div className="flex-1 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-3.5 py-2.5">
          <p className="text-xs font-semibold text-ruralia-teal-text">
            Beneficiarios
          </p>
          <p className="text-xl font-bold tabular-nums text-zinc-900">
            {numero(contraparte.beneficiarios)}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5">
          <p className="text-xs font-semibold text-zinc-500">Asociaciones</p>
          <p className="text-xl font-bold tabular-nums text-zinc-900">
            {numero(contraparte.asociaciones)}
          </p>
        </div>
      </div>

      {vacia ? (
        <div className="flex flex-col items-start gap-3 border-t border-zinc-100 px-6 py-5">
          <p className="text-sm text-zinc-500">Aún no hay contraparte.</p>
          {puedeGestionar ? (
            <Link
              href={`${urlEquipo}#contraparte`}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-ruralia-teal px-4 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar beneficiarios
            </Link>
          ) : null}
        </div>
      ) : null}

      {hayMunicipios ? (
        <ul className="flex flex-col gap-3 px-6 pb-5">
          {filas.map((f) => (
            <li
              key={f.clave}
              className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-sm sm:grid-cols-[170px_1fr_48px]"
            >
              <span
                className={`truncate ${f.sinMunicipio ? "text-amber-800" : "text-zinc-700"}`}
                title={f.nombre}
              >
                {f.nombre}
              </span>
              <span
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-zinc-100"
              >
                <span
                  className={`block h-full rounded-full ${f.sinMunicipio ? "bg-amber-400" : "bg-ruralia-teal"}`}
                  style={{ width: `${Math.max(3, (f.total / maximo) * 100)}%` }}
                />
              </span>
              <span className="text-right font-semibold tabular-nums text-zinc-900">
                {numero(f.total)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {contraparte.beneficiarios > 0 ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-6 py-2">
          <p className="text-[13px] text-zinc-500">
            {numero(contraparte.conVereda)} con vereda asignada ·{" "}
            {numero(sinMunicipio)} sin municipio
          </p>
          <Link
            href={`${urlEquipo}#contraparte`}
            className="-mr-2 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
          >
            Ver los {numero(contraparte.beneficiarios)}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function Bloque({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-100 ${className}`} />
  );
}

function EsqueletoResumen() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando resumen">
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ruralia-teal-border bg-white px-5 py-[18px]"
          >
            <Bloque className="h-3.5 w-24" />
            <Bloque className="mt-2.5 h-7 w-20" />
            <Bloque className="mt-2.5 h-3.5 w-28" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="min-w-0 flex-[1_1_480px] rounded-2xl border border-ruralia-teal-border bg-white px-6 pb-2 pt-5">
          <Bloque className="h-5 w-40" />
          <Bloque className="mt-2 h-3.5 w-64" />
          <div className="mt-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-t border-zinc-100 py-3.5"
              >
                <div className="flex-1">
                  <Bloque className="h-4 w-32" />
                  <Bloque className="mt-1.5 h-3.5 w-48" />
                </div>
                <Bloque className="h-[30px] w-24 rounded-full" />
                <Bloque className="h-4 w-6" />
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-[1_1_480px] rounded-2xl border border-ruralia-teal-border bg-white px-6 pb-5 pt-5">
          <Bloque className="h-5 w-32" />
          <Bloque className="mt-2 h-3.5 w-72" />
          <div className="mt-4 flex gap-2">
            <Bloque className="h-[62px] flex-1 rounded-xl" />
            <Bloque className="h-[62px] flex-1 rounded-xl" />
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-[120px_1fr_48px] items-center gap-3 sm:grid-cols-[170px_1fr_48px]"
              >
                <Bloque className="h-3.5 w-24" />
                <Bloque className="h-2 rounded-full" />
                <Bloque className="ml-auto h-3.5 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
