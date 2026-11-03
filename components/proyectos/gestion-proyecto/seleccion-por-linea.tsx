"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Layers, Search, Sprout, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { claveLineaProductiva, textoBeneficiarios } from "@/lib/lineas-productivas";
import type { LineaProductiva, LineaProductivaProyecto } from "@/lib/types";

export interface MiembroLinea {
  id: string;
  nombre: string;
  subtitulo?: string;
}

/**
 * Tarjeta compacta que aparece al elegir una subactividad con línea productiva.
 * Ofrece agregar a todos los beneficiarios de esa línea con un clic y deja ver
 * quiénes son sin ocupar espacio en el formulario.
 */
export function SugerenciaLineaJornada({
  linea,
  total,
  miembros,
  seleccionados,
  cargando,
  disabled,
  onAgregarTodos,
  onQuitarTodos,
  onAlternar,
  onPedirMiembros,
}: {
  linea: LineaProductiva;
  /** Beneficiarios activos del proyecto con esa línea. */
  total: number;
  /** Se cargan al abrir la tarjeta; undefined mientras no llegan. */
  miembros?: MiembroLinea[];
  seleccionados: Set<string>;
  cargando: boolean;
  disabled?: boolean;
  onAgregarTodos: () => void;
  onQuitarTodos: () => void;
  onAlternar: (miembro: MiembroLinea) => void;
  onPedirMiembros: () => void;
}) {
  const [verQuienes, setVerQuienes] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (total > 0 && !miembros) onPedirMiembros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linea.id, total]);

  const agregados = miembros
    ? miembros.filter((m) => seleccionados.has(m.id)).length
    : 0;
  const todosAgregados = total > 0 && agregados >= total;

  const filtrados = useMemo(() => {
    const clave = claveLineaProductiva(busqueda);
    if (!miembros) return [];
    if (!clave) return miembros;
    return miembros.filter(
      (m) =>
        claveLineaProductiva(m.nombre).includes(clave) ||
        (m.subtitulo ?? "").includes(busqueda.trim()),
    );
  }, [miembros, busqueda]);

  if (total === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3">
        <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-ruralia-teal-muted" />
        <p className="text-sm text-zinc-600">
          La subactividad trabaja con <strong>{linea.nombre}</strong>, pero
          ningún beneficiario del proyecto tiene esa línea. Búscalos por
          nombre.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-3.5 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-ruralia-teal" />
          <div className="min-w-0 text-sm">
            <p className="text-zinc-800">
              {todosAgregados ? (
                <>
                  Agregaste a los {textoBeneficiarios(total)} de{" "}
                  <strong className="text-ruralia-teal-text">{linea.nombre}</strong>.
                </>
              ) : (
                <>
                  Esta subactividad trabaja con{" "}
                  <strong className="text-ruralia-teal-text">{linea.nombre}</strong>:{" "}
                  {textoBeneficiarios(total)} en el proyecto.
                </>
              )}
            </p>
            {agregados > 0 && !todosAgregados ? (
              <p className="mt-0.5 text-xs text-zinc-500">
                {agregados} de {total} ya están en la selección.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setVerQuienes(true)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-white"
          >
            Ver quiénes
          </button>
          {todosAgregados ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onQuitarTodos}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-600 hover:bg-white disabled:opacity-50"
            >
              Quitarlos
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled || cargando}
              onClick={onAgregarTodos}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {agregados > 0
                ? `Agregar a los ${total - agregados} restantes`
                : `Agregar a los ${total}`}
            </button>
          )}
        </div>
      </div>

      <Modal
        abierto={verQuienes}
        onCerrar={() => {
          setVerQuienes(false);
          setBusqueda("");
        }}
        titulo={`${linea.nombre} · ${textoBeneficiarios(total)}`}
        ancho="lg"
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                // El modal vive dentro del formulario de la jornada: Enter no debe enviarlo.
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Buscar por nombre o cédula..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
          </div>
          {!miembros ? (
            <p className="text-sm text-zinc-500">Cargando...</p>
          ) : (
            <ul className="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
              {filtrados.map((miembro) => {
                const elegido = seleccionados.has(miembro.id);
                return (
                  <li key={miembro.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onAlternar(miembro)}
                      className="flex w-full items-center justify-between gap-3 bg-white px-3.5 py-2.5 text-left transition hover:bg-ruralia-teal-soft disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {miembro.nombre}
                        </span>
                        {miembro.subtitulo ? (
                          <span className="block truncate text-xs text-zinc-500">
                            {miembro.subtitulo}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          elegido
                            ? "border-ruralia-teal bg-ruralia-teal text-white"
                            : "border-zinc-300 bg-white"
                        }`}
                      >
                        {elegido ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtrados.length === 0 ? (
                <li className="px-3.5 py-3 text-sm text-zinc-500">
                  Sin coincidencias
                </li>
              ) : null}
            </ul>
          )}
          <p className="text-xs text-zinc-500">
            Marca o desmarca para ajustar la selección. Se crea una jornada por
            cada beneficiario marcado.
          </p>
        </div>
      </Modal>
    </>
  );
}

/** Botón discreto para sumar de un clic a todos los de otra línea del proyecto. */
export function AgregarPorLinea({
  lineas,
  excluirId,
  disabled,
  onElegir,
}: {
  lineas: LineaProductivaProyecto[];
  /** La línea de la subactividad ya se ofrece en la tarjeta de sugerencia. */
  excluirId?: string;
  disabled?: boolean;
  onElegir: (linea: LineaProductivaProyecto) => void;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const opciones = lineas.filter((l) => l.id !== excluirId && l.beneficiarios > 0);

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

  if (!opciones.length) return null;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
      >
        <Layers className="h-4 w-4 text-ruralia-teal" />
        {excluirId ? "Agregar de otra línea productiva" : "Agregar por línea productiva"}
        <ChevronDown
          className={`h-3.5 w-3.5 text-ruralia-teal-muted transition ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>
      {abierto ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-72 overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white py-1.5 shadow-lg shadow-zinc-900/10">
          {opciones.map((linea) => (
            <li key={linea.id}>
              <button
                type="button"
                onClick={() => {
                  onElegir(linea);
                  setAbierto(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft"
              >
                <span className="truncate font-medium text-zinc-900">
                  {linea.nombre}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                  Agregar {linea.beneficiarios}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
