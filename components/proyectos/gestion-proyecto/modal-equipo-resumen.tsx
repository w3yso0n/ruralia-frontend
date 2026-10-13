"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { AvatarUsuario } from "@/components/ui/avatar-usuario";
import { Modal } from "@/components/ui/modal";
import { listarEquipoResumenProyecto } from "@/lib/api";
import type { MiembroEquipoResumen, ResumenProyecto } from "@/lib/types";

/** Qué grupo se ve en el modal: todos o un rol ("sin-rol" incluido). */
export type FiltroEquipoResumen =
  { tipo: "todos" } | { tipo: "rol"; rolId: string };

function claveFiltro(filtro: FiltroEquipoResumen): string {
  if (filtro.tipo === "rol") return `rol:${filtro.rolId}`;
  return filtro.tipo;
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const formatoNumero = new Intl.NumberFormat("es-CO");

interface ModalEquipoResumenProps {
  token: string;
  proyectoId: string;
  equipo: ResumenProyecto["equipo"];
  filtro: FiltroEquipoResumen | null;
  onCambiarFiltro: (filtro: FiltroEquipoResumen) => void;
  onCerrar: () => void;
  urlGestionar?: string;
}

export function ModalEquipoResumen({
  token,
  proyectoId,
  equipo,
  filtro,
  onCambiarFiltro,
  onCerrar,
  urlGestionar,
}: ModalEquipoResumenProps) {
  const [porClave, setPorClave] = useState<
    Record<string, MiembroEquipoResumen[]>
  >({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState("");

  const clave = filtro ? claveFiltro(filtro) : null;
  const miembros = clave ? porClave[clave] : undefined;
  const error = clave ? errores[clave] : undefined;

  useEffect(() => {
    if (!filtro || !clave || porClave[clave]) return;
    let vigente = true;
    listarEquipoResumenProyecto(token, proyectoId, {
      rolId: filtro.tipo === "rol" ? filtro.rolId : undefined,
    })
      .then((datos) => {
        if (vigente) setPorClave((prev) => ({ ...prev, [clave]: datos }));
      })
      .catch((err: unknown) => {
        if (!vigente) return;
        setErrores((prev) => ({
          ...prev,
          [clave]:
            err instanceof Error ? err.message : "Error al cargar el equipo",
        }));
      });
    return () => {
      vigente = false;
    };
  }, [token, proyectoId, filtro, clave, porClave]);

  useEffect(() => {
    if (!filtro) return;
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", alEscape);
    return () => document.removeEventListener("keydown", alEscape);
  }, [filtro, onCerrar]);

  const filtrados = useMemo(() => {
    if (!miembros) return [];
    const termino = normalizar(busqueda.trim());
    if (!termino) return miembros;
    return miembros.filter(
      (m) =>
        normalizar(m.nombre).includes(termino) ||
        normalizar(m.correo).includes(termino),
    );
  }, [miembros, busqueda]);

  const opciones: {
    filtro: FiltroEquipoResumen;
    etiqueta: string;
    total: number;
  }[] = [
    { filtro: { tipo: "todos" }, etiqueta: "Todos", total: equipo.total },
    ...equipo.porRol.map((r) => ({
      filtro: { tipo: "rol", rolId: r.rolId ?? "sin-rol" } as const,
      etiqueta: r.rol,
      total: r.total,
    })),
  ];

  const mostrarRol = filtro?.tipo !== "rol";

  return (
    <Modal
      titulo="Equipo interno"
      abierto={!!filtro}
      onCerrar={onCerrar}
      ancho="lg"
    >
      <div
        role="tablist"
        aria-label="Filtrar por rol"
        className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {opciones.map((o) => {
          const activa = !!filtro && claveFiltro(o.filtro) === clave;
          return (
            <button
              key={claveFiltro(o.filtro)}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => onCambiarFiltro(o.filtro)}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                activa
                  ? "border-ruralia-teal bg-ruralia-teal text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-ruralia-teal-border hover:bg-ruralia-teal-soft"
              }`}
            >
              {o.etiqueta}
              <span
                className={`tabular-nums ${activa ? "text-white/80" : "text-zinc-400"}`}
              >
                {formatoNumero.format(o.total)}
              </span>
            </button>
          );
        })}
      </div>

      <label className="relative mb-4 block">
        <span className="sr-only">Buscar persona</span>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ruralia-teal-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-zinc-400 hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />
      </label>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : !miembros ? (
        <ul aria-busy="true" aria-label="Cargando personas">
          {Array.from({ length: 5 }, (_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 border-t border-zinc-100 py-3 first:border-t-0"
            >
              <span className="h-9 w-9 animate-pulse rounded-full bg-zinc-100" />
              <span className="flex-1">
                <span className="block h-4 w-40 animate-pulse rounded-md bg-zinc-100" />
                <span className="mt-1.5 block h-3 w-56 animate-pulse rounded-md bg-zinc-100" />
              </span>
            </li>
          ))}
        </ul>
      ) : filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          {busqueda.trim()
            ? "Ninguna persona coincide con la búsqueda."
            : "No hay personas en este grupo."}
        </p>
      ) : (
        <ul className="max-h-[50vh] overflow-y-auto">
          {filtrados.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 border-t border-zinc-100 py-3 first:border-t-0"
            >
              <AvatarUsuario nombre={m.nombre} urlFoto={m.urlFoto} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={`truncate text-sm font-semibold ${m.estaActivo ? "text-zinc-900" : "text-zinc-400"}`}
                  >
                    {m.nombre}
                  </p>
                  {!m.estaActivo ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
                      Inactiva
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-zinc-500">{m.correo}</p>
              </div>
              {mostrarRol || m.otrosRoles.length ? (
                <div className="hidden shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
                  {mostrarRol ? (
                    <span className="max-w-[180px] truncate rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
                      {m.rol}
                    </span>
                  ) : null}
                  {m.otrosRoles.length ? (
                    <span
                      className="text-[11px] text-zinc-500"
                      title={m.otrosRoles.join(", ")}
                    >
                      +{m.otrosRoles.length}{" "}
                      {m.otrosRoles.length === 1 ? "rol" : "roles"}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
        <p className="text-xs text-zinc-500">
          {miembros
            ? busqueda.trim()
              ? `${formatoNumero.format(filtrados.length)} de ${formatoNumero.format(miembros.length)} personas`
              : `${formatoNumero.format(miembros.length)} ${miembros.length === 1 ? "persona" : "personas"}`
            : null}
        </p>
        {urlGestionar ? (
          <Link
            href={urlGestionar}
            onClick={onCerrar}
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
          >
            Gestionar equipo
          </Link>
        ) : null}
      </div>
    </Modal>
  );
}
