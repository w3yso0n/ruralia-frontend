"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Lock } from "lucide-react";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

function aDia(valor?: string): string {
  return valor ? valor.slice(0, 10) : "";
}

function parsearDia(iso: string): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return { anio: anio ?? 0, mes: (mes ?? 1) - 1, dia: dia ?? 1 };
}

function formatearIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function formatearLegible(iso?: string): string {
  if (!iso) return "";
  const { anio, mes, dia } = parsearDia(aDia(iso));
  return `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${anio}`;
}

function hoyIso(): string {
  const ahora = new Date();
  return formatearIso(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

/** Lunes = 0 … Domingo = 6 */
function diaSemanaLunes(anio: number, mes: number, dia: number): number {
  const js = new Date(anio, mes, dia).getDay();
  return js === 0 ? 6 : js - 1;
}

interface SelectorFechaJornadaProps {
  value: string;
  onChange: (fecha: string) => void;
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SelectorFechaJornada({
  value,
  onChange,
  fechaInicioProyecto,
  fechaFinProyecto,
  required,
  disabled,
}: SelectorFechaJornadaProps) {
  const min = aDia(fechaInicioProyecto);
  const max = aDia(fechaFinProyecto);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  const fechaInicialVista = useMemo(() => {
    const base = value || hoyIso();
    const { anio, mes } = parsearDia(base);
    return { anio, mes };
  }, [value]);

  const [vistaAnio, setVistaAnio] = useState(fechaInicialVista.anio);
  const [vistaMes, setVistaMes] = useState(fechaInicialVista.mes);

  useEffect(() => {
    if (!abierto) return;
    const base = value || (min && hoyIso() < min ? min : hoyIso());
    const { anio, mes } = parsearDia(base);
    setVistaAnio(anio);
    setVistaMes(mes);
  }, [abierto, value, min]);

  useEffect(() => {
    if (!abierto) return;

    function alClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }

    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  function mesAnterior() {
    if (vistaMes === 0) {
      setVistaMes(11);
      setVistaAnio((a) => a - 1);
    } else {
      setVistaMes((m) => m - 1);
    }
  }

  function mesSiguiente() {
    if (vistaMes === 11) {
      setVistaMes(0);
      setVistaAnio((a) => a + 1);
    } else {
      setVistaMes((m) => m + 1);
    }
  }

  const celdas = useMemo(() => {
    const totalDias = diasEnMes(vistaAnio, vistaMes);
    const offset = diaSemanaLunes(vistaAnio, vistaMes, 1);
    const items: {
      iso: string;
      dia: number;
      fueraMes: boolean;
      deshabilitado: boolean;
      esHoy: boolean;
      seleccionado: boolean;
      esInicio: boolean;
      esFin: boolean;
    }[] = [];

    const fueraDeRango = (iso: string) =>
      Boolean((min && iso < min) || (max && iso > max));

    const diasPrev = diasEnMes(
      vistaMes === 0 ? vistaAnio - 1 : vistaAnio,
      vistaMes === 0 ? 11 : vistaMes - 1,
    );

    for (let i = offset - 1; i >= 0; i -= 1) {
      const dia = diasPrev - i;
      const anio = vistaMes === 0 ? vistaAnio - 1 : vistaAnio;
      const mes = vistaMes === 0 ? 11 : vistaMes - 1;
      const iso = formatearIso(anio, mes, dia);
      items.push({
        iso,
        dia,
        fueraMes: true,
        deshabilitado: true,
        esHoy: false,
        seleccionado: false,
        esInicio: false,
        esFin: false,
      });
    }

    const hoy = hoyIso();
    for (let dia = 1; dia <= totalDias; dia += 1) {
      const iso = formatearIso(vistaAnio, vistaMes, dia);
      items.push({
        iso,
        dia,
        fueraMes: false,
        deshabilitado: fueraDeRango(iso),
        esHoy: iso === hoy,
        seleccionado: iso === value,
        esInicio: Boolean(min && iso === min),
        esFin: Boolean(max && iso === max),
      });
    }

    const resto = (7 - (items.length % 7)) % 7;
    for (let dia = 1; dia <= resto; dia += 1) {
      const anio = vistaMes === 11 ? vistaAnio + 1 : vistaAnio;
      const mes = vistaMes === 11 ? 0 : vistaMes + 1;
      const iso = formatearIso(anio, mes, dia);
      items.push({
        iso,
        dia,
        fueraMes: true,
        deshabilitado: true,
        esHoy: false,
        seleccionado: false,
        esInicio: false,
        esFin: false,
      });
    }

    return items;
  }, [vistaAnio, vistaMes, value, min, max]);

  function elegir(iso: string, deshabilitado: boolean) {
    if (deshabilitado || disabled) return;
    onChange(iso);
    setAbierto(false);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
          abierto
            ? "border-ruralia-teal ring-2 ring-ruralia-teal/20"
            : "border-zinc-200 hover:border-ruralia-teal-border"
        } ${disabled ? "cursor-not-allowed opacity-50" : "bg-white"}`}
        aria-required={required}
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 shrink-0 text-ruralia-teal" />
          <span className={value ? "font-medium text-zinc-900" : "text-zinc-400"}>
            {value ? formatearLegible(value) : "Seleccionar fecha"}
          </span>
        </span>
        {max ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
            <Lock className="h-3 w-3" />
            Hasta {formatearLegible(max)}
          </span>
        ) : null}
      </button>

      {max || min ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-zinc-500">
          <Lock className="mt-0.5 h-3 w-3 shrink-0 text-ruralia-teal-muted" />
          <span>
            {min && max
              ? `Solo fechas entre el ${formatearLegible(min)} y el ${formatearLegible(max)} (fin del proyecto).`
              : max
                ? `No se pueden programar jornadas después del ${formatearLegible(max)} (fin del proyecto).`
                : `No se pueden programar jornadas antes del ${formatearLegible(min)} (inicio del proyecto).`}
          </span>
        </p>
      ) : null}

      {abierto ? (
        <div className="absolute z-40 mt-2 w-[min(100%,20rem)] rounded-2xl border border-ruralia-teal-border bg-white p-4 shadow-lg shadow-zinc-900/10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={mesAnterior}
              className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-zinc-900">
              {MESES[vistaMes]} {vistaAnio}
            </p>
            <button
              type="button"
              onClick={mesSiguiente}
              className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {DIAS_SEMANA.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celdas.map((celda) => {
              if (celda.fueraMes) {
                return (
                  <div
                    key={`o-${celda.iso}`}
                    className="flex h-9 items-center justify-center text-sm text-zinc-200"
                  >
                    {celda.dia}
                  </div>
                );
              }

              let clases =
                "relative flex h-9 items-center justify-center rounded-lg text-sm font-medium transition ";

              if (celda.deshabilitado) {
                clases +=
                  "cursor-not-allowed bg-zinc-50 text-zinc-300 line-through decoration-zinc-300";
              } else if (celda.seleccionado) {
                clases +=
                  "bg-ruralia-teal text-white shadow-sm hover:bg-ruralia-teal-hover";
              } else if (celda.esFin) {
                clases +=
                  "bg-amber-50 text-amber-900 ring-2 ring-amber-400 hover:bg-amber-100";
              } else if (celda.esInicio) {
                clases +=
                  "bg-ruralia-teal-soft text-ruralia-teal-text ring-1 ring-ruralia-teal-border hover:bg-ruralia-teal-soft";
              } else if (celda.esHoy) {
                clases +=
                  "text-ruralia-teal-text ring-1 ring-ruralia-teal hover:bg-ruralia-teal-soft";
              } else {
                clases += "text-zinc-800 hover:bg-ruralia-teal-soft";
              }

              return (
                <button
                  key={celda.iso}
                  type="button"
                  disabled={celda.deshabilitado}
                  onClick={() => elegir(celda.iso, celda.deshabilitado)}
                  title={
                    celda.esFin
                      ? "Fin del proyecto"
                      : celda.esInicio
                        ? "Inicio del proyecto"
                        : celda.deshabilitado
                          ? "Fuera del periodo del proyecto"
                          : undefined
                  }
                  className={clases}
                >
                  {celda.dia}
                  {celda.esFin && !celda.seleccionado ? (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-500" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {(min || max) && (
            <div className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3">
              {min ? (
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-ruralia-teal-soft ring-1 ring-ruralia-teal-border" />
                  Inicio del proyecto · {formatearLegible(min)}
                </div>
              ) : null}
              {max ? (
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-50 ring-2 ring-amber-400" />
                  Fin del proyecto · {formatearLegible(max)}
                  <Lock className="ml-auto h-3 w-3 text-amber-600" />
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-zinc-50 line-through" />
                Fechas bloqueadas (fuera de vigencia)
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function fechaFueraDeProyecto(
  fecha: string,
  fechaInicioProyecto?: string,
  fechaFinProyecto?: string,
): string | null {
  const dia = aDia(fecha);
  const min = aDia(fechaInicioProyecto);
  const max = aDia(fechaFinProyecto);
  if (min && dia < min) {
    return `La fecha no puede ser anterior al inicio del proyecto (${formatearLegible(min)})`;
  }
  if (max && dia > max) {
    return `La fecha no puede ser posterior al fin del proyecto (${formatearLegible(max)})`;
  }
  return null;
}
