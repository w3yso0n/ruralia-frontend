"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Sprout, UserPlus } from "lucide-react";
import { AgregarPorLinea } from "@/components/proyectos/gestion-proyecto/seleccion-por-linea";
import { Modal } from "@/components/ui/modal";
import {
  listarDisponiblesDeLinea,
  listarLineasDisponiblesProyecto,
  listarLineasProductivasProyecto,
} from "@/lib/api";
import { claveLineaProductiva, textoBeneficiarios } from "@/lib/lineas-productivas";
import type { BeneficiarioResumen, LineaProductivaProyecto } from "@/lib/types";

export const SIN_LINEA = "sin-linea";

function nombreCompleto(b: BeneficiarioResumen): string {
  return `${b.nombres} ${b.apellidos}`.trim();
}

/**
 * Suma al proyecto, de una vez, a los beneficiarios del catálogo que tienen una
 * línea productiva y todavía no están en él. Solo para proyectos agrícolas.
 */
export function AgregarBeneficiariosPorLinea({
  token,
  proyectoId,
  recarga,
  disabled,
  onAgregar,
}: {
  token: string;
  proyectoId: string;
  /** Cambia cuando se vinculan o quitan beneficiarios, para refrescar los conteos. */
  recarga: number;
  disabled?: boolean;
  onAgregar: (ids: string[], linea: LineaProductivaProyecto) => Promise<boolean>;
}) {
  const [lineas, setLineas] = useState<LineaProductivaProyecto[]>([]);
  const [linea, setLinea] = useState<LineaProductivaProyecto | null>(null);
  const [candidatos, setCandidatos] = useState<BeneficiarioResumen[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    void listarLineasDisponiblesProyecto(token, proyectoId)
      .then((datos) => {
        if (!cancelado) setLineas(datos);
      })
      .catch(() => {
        if (!cancelado) setLineas([]);
      });
    return () => {
      cancelado = true;
    };
  }, [token, proyectoId, recarga]);

  async function abrir(elegida: LineaProductivaProyecto) {
    setLinea(elegida);
    setCandidatos(null);
    setBusqueda("");
    setError(null);
    try {
      const datos = await listarDisponiblesDeLinea(token, proyectoId, elegida.id);
      setCandidatos(datos);
      setMarcados(new Set(datos.map((b) => b.id)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar a los beneficiarios",
      );
      setCandidatos([]);
    }
  }

  function cerrar() {
    if (guardando) return;
    setLinea(null);
    setCandidatos(null);
  }

  const filtrados = useMemo(() => {
    const clave = claveLineaProductiva(busqueda);
    if (!candidatos) return [];
    if (!clave) return candidatos;
    return candidatos.filter((b) =>
      claveLineaProductiva(
        `${nombreCompleto(b)} ${b.numeroDocumento ?? ""} ${b.municipio ?? ""}`,
      ).includes(clave),
    );
  }, [candidatos, busqueda]);

  const todosMarcados =
    filtrados.length > 0 && filtrados.every((b) => marcados.has(b.id));

  function alternarTodos() {
    setMarcados((prev) => {
      const siguiente = new Set(prev);
      for (const b of filtrados) {
        if (todosMarcados) siguiente.delete(b.id);
        else siguiente.add(b.id);
      }
      return siguiente;
    });
  }

  function alternar(id: string) {
    setMarcados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  async function confirmar() {
    if (!linea || !marcados.size) return;
    setGuardando(true);
    setError(null);
    const ok = await onAgregar([...marcados], linea);
    setGuardando(false);
    if (ok) {
      setLinea(null);
      setCandidatos(null);
    }
  }

  if (!lineas.length) return null;

  return (
    <>
      <AgregarPorLinea
        lineas={lineas}
        disabled={disabled}
        onElegir={(elegida) => void abrir(elegida)}
      />

      <Modal
        abierto={!!linea}
        onCerrar={cerrar}
        titulo={linea ? `Agregar beneficiarios de ${linea.nombre}` : ""}
        ancho="lg"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {candidatos
              ? `${textoBeneficiarios(candidatos.length)} con esta línea todavía no ${
                  candidatos.length === 1 ? "está" : "están"
                } en el proyecto. Desmarca a quien no deba entrar.`
              : "Buscando beneficiarios con esta línea..."}
          </p>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, cédula o municipio..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
          </div>

          {candidatos && candidatos.length ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                {marcados.size.toLocaleString("es-CO")} de{" "}
                {candidatos.length.toLocaleString("es-CO")} marcados
              </span>
              <button
                type="button"
                onClick={alternarTodos}
                disabled={!filtrados.length}
                className="rounded-lg px-2 py-1 font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
              >
                {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
              </button>
            </div>
          ) : null}

          {!candidatos ? (
            <p className="text-sm text-zinc-500">Cargando...</p>
          ) : (
            <ul className="max-h-[45vh] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
              {filtrados.map((b) => {
                const elegido = marcados.has(b.id);
                const detalle = [b.numeroDocumento, b.municipio]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => alternar(b.id)}
                      className="flex w-full items-center justify-between gap-3 bg-white px-3.5 py-2.5 text-left transition hover:bg-ruralia-teal-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-zinc-900">
                          {nombreCompleto(b)}
                        </span>
                        {detalle ? (
                          <span className="block truncate text-xs text-zinc-500">
                            {detalle}
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
                  {candidatos.length ? "Sin coincidencias" : "No hay nadie por agregar."}
                </li>
              ) : null}
            </ul>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={cerrar}
              disabled={guardando}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={guardando || !marcados.size}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {guardando
                ? "Agregando..."
                : `Agregar ${textoBeneficiarios(marcados.size)}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Pestañas por línea productiva para la lista de beneficiarios del proyecto:
 * "Todos", una por línea con su conteo y "Sin línea".
 */
export function FiltroLineasBeneficiarios({
  token,
  proyectoId,
  total,
  recarga,
  value,
  onChange,
}: {
  token: string;
  proyectoId: string;
  /** Beneficiarios activos del proyecto. */
  total: number;
  recarga: number;
  value: string;
  onChange: (linea: string) => void;
}) {
  const [lineas, setLineas] = useState<LineaProductivaProyecto[] | null>(null);

  useEffect(() => {
    let cancelado = false;
    void listarLineasProductivasProyecto(token, proyectoId)
      .then((datos) => {
        if (!cancelado) setLineas(datos);
      })
      .catch(() => {
        if (!cancelado) setLineas([]);
      });
    return () => {
      cancelado = true;
    };
  }, [token, proyectoId, recarga]);

  if (!lineas || !lineas.length) return null;

  const conLinea = lineas.reduce((suma, l) => suma + l.beneficiarios, 0);
  const sinLinea = Math.max(total - conLinea, 0);
  const opciones = [
    { id: "", nombre: "Todos", beneficiarios: total },
    ...lineas,
    ...(sinLinea ? [{ id: SIN_LINEA, nombre: "Sin línea", beneficiarios: sinLinea }] : []),
  ];

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <Sprout className="h-3.5 w-3.5 text-ruralia-teal-muted" />
        Por línea productiva
      </p>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {opciones.map((opcion) => {
          const activa = value === opcion.id;
          return (
            <button
              key={opcion.id || "todos"}
              type="button"
              onClick={() => onChange(opcion.id)}
              aria-pressed={activa}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                activa
                  ? "border-ruralia-teal bg-ruralia-teal text-white"
                  : opcion.id === SIN_LINEA
                    ? "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    : "border-ruralia-teal-border bg-white text-zinc-800 hover:bg-ruralia-teal-soft"
              }`}
            >
              <span className="font-medium">{opcion.nombre}</span>
              <span
                className={`text-xs tabular-nums ${
                  activa ? "text-white/80" : "text-zinc-500"
                }`}
              >
                {opcion.beneficiarios.toLocaleString("es-CO")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
