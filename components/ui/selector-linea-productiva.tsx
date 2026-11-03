"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, Sprout, X } from "lucide-react";
import { buscarLineasProductivas } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  claveLineaProductiva,
  limpiarNombreLinea,
  textoBeneficiarios,
} from "@/lib/lineas-productivas";
import type { LineaProductiva, LineaProductivaProyecto } from "@/lib/types";

interface SelectorLineaProductivaProps {
  /** Nombre de la línea elegida; vacío si no tiene. */
  value: string;
  onChange: (nombre: string) => void;
  /**
   * Líneas de los beneficiarios del proyecto, con su conteo. Si llegan, son
   * lo primero que se ve al abrir; al escribir se busca en todo el catálogo.
   */
  lineasProyecto?: LineaProductivaProyecto[];
  /** Ofrece "Crear «...»" cuando lo escrito no existe. */
  permitirCrear?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

interface Opcion {
  id: string;
  nombre: string;
  beneficiarios?: number;
}

export function SelectorLineaProductiva({
  value,
  onChange,
  lineasProyecto,
  permitirCrear = true,
  disabled = false,
  placeholder = "Sin línea productiva",
}: SelectorLineaProductivaProps) {
  const { token } = useAuth();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<LineaProductiva[]>([]);
  const [buscando, setBuscando] = useState(false);
  /** El usuario pidió agregar una línea nueva: el buscador pasa a pedir el nombre. */
  const [modoNuevo, setModoNuevo] = useState(false);
  /** Abre hacia arriba si no cabe abajo (p. ej. al final de un modal con scroll). */
  const [haciaArriba, setHaciaArriba] = useState(false);

  const termino = busqueda.trim();
  const usarProyecto = !!lineasProyecto && !termino;

  useEffect(() => {
    if (!abierto || !token || usarProyecto) return;
    let cancelado = false;
    const timer = setTimeout(
      () => {
        setBuscando(true);
        void buscarLineasProductivas(token, termino)
          .then((datos) => {
            if (!cancelado) setResultados(datos);
          })
          .catch(() => {
            if (!cancelado) setResultados([]);
          })
          .finally(() => {
            if (!cancelado) setBuscando(false);
          });
      },
      termino ? 250 : 0,
    );
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [abierto, token, termino, usarProyecto]);

  useEffect(() => {
    if (!abierto) return;
    inputRef.current?.focus();

    function alClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
        setModoNuevo(false);
      }
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAbierto(false);
        setModoNuevo(false);
      }
    }
    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  const conteoPorId = useMemo(
    () => new Map((lineasProyecto ?? []).map((l) => [l.id, l.beneficiarios])),
    [lineasProyecto],
  );

  const opciones: Opcion[] = useMemo(() => {
    if (usarProyecto) return lineasProyecto ?? [];
    return resultados.map((l) => ({
      ...l,
      beneficiarios: lineasProyecto ? (conteoPorId.get(l.id) ?? 0) : undefined,
    }));
  }, [usarProyecto, lineasProyecto, resultados, conteoPorId]);

  const claveActual = claveLineaProductiva(value);
  const claveTermino = claveLineaProductiva(termino);
  const existeExacta = opciones.some(
    (o) => claveLineaProductiva(o.nombre) === claveTermino,
  );
  const mostrarCrear = permitirCrear && !!claveTermino && !existeExacta;

  function elegir(nombre: string) {
    onChange(nombre);
    setBusqueda("");
    setModoNuevo(false);
    setAbierto(false);
  }

  function alternarAbierto() {
    if (!abierto && contenedorRef.current) {
      const caja = contenedorRef.current.getBoundingClientRect();
      const espacioAbajo = window.innerHeight - caja.bottom;
      setHaciaArriba(espacioAbajo < 340 && caja.top > espacioAbajo);
    }
    if (abierto) setModoNuevo(false);
    setAbierto((v) => !v);
  }

  function empezarNueva() {
    setModoNuevo(true);
    inputRef.current?.focus();
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={alternarAbierto}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
          abierto
            ? "border-ruralia-teal ring-2 ring-ruralia-teal/20"
            : "border-zinc-200 hover:border-ruralia-teal-border"
        } ${disabled ? "cursor-not-allowed bg-zinc-50 opacity-60" : "bg-white"}`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Sprout className="h-4 w-4 shrink-0 text-ruralia-teal" />
          {value ? (
            <span className="truncate font-medium text-zinc-900">{value}</span>
          ) : (
            <span className="text-zinc-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ruralia-teal-muted transition ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && !disabled ? (
        <div
          className={`absolute z-40 w-full rounded-2xl ${
            haciaArriba ? "bottom-full mb-2" : "mt-2"
          } border border-ruralia-teal-border bg-white p-2 shadow-lg shadow-zinc-900/10`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (mostrarCrear) elegir(limpiarNombreLinea(termino));
                  else if (opciones[0]) elegir(opciones[0].nombre);
                }
              }}
              placeholder={
                modoNuevo
                  ? "Nombre de la nueva línea, por ejemplo Cacao"
                  : permitirCrear
                    ? "Buscar o escribir una nueva..."
                    : "Buscar línea..."
              }
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
          </div>

          {permitirCrear ? (
            mostrarCrear ? (
              <button
                type="button"
                onClick={() => elegir(limpiarNombreLinea(termino))}
                className="mt-1.5 flex w-full items-center gap-2 rounded-lg bg-ruralia-teal-soft px-2.5 py-2 text-left text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft/70"
              >
                <Plus className="h-4 w-4 shrink-0 text-ruralia-teal" />
                <span className="truncate">
                  Crear «{limpiarNombreLinea(termino)}»
                </span>
              </button>
            ) : !termino ? (
              modoNuevo ? (
                <p className="px-2.5 pt-2 text-xs text-zinc-500">
                  Escribe el nombre y elige Crear. Si ya existe, se usa la
                  existente.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={empezarNueva}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
                >
                  <Plus className="h-4 w-4 shrink-0 text-ruralia-teal" />
                  Agregar nueva línea
                </button>
              )
            ) : null
          ) : null}

          {usarProyecto && opciones.length > 0 ? (
            <p className="px-2.5 pb-1 pt-2.5 text-xs font-semibold text-zinc-500">
              En este proyecto
            </p>
          ) : null}

          <ul role="listbox" className="mt-1 max-h-56 overflow-y-auto">
            {value ? (
              <li>
                <button
                  type="button"
                  onClick={() => elegir("")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-500 transition hover:bg-ruralia-teal-soft"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitar línea productiva
                </button>
              </li>
            ) : null}

            {opciones.map((opcion) => {
              const activa = claveLineaProductiva(opcion.nombre) === claveActual;
              return (
                <li key={opcion.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={activa}
                    onClick={() => elegir(opcion.nombre)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-ruralia-teal-soft ${
                      activa ? "bg-ruralia-teal-soft/70" : ""
                    }`}
                  >
                    <span
                      className={`truncate font-medium ${
                        activa ? "text-ruralia-teal-text" : "text-zinc-900"
                      }`}
                    >
                      {opcion.nombre}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {opcion.beneficiarios !== undefined ? (
                        <span
                          className={`text-xs tabular-nums ${
                            opcion.beneficiarios > 0
                              ? "text-zinc-500"
                              : "text-zinc-400"
                          }`}
                        >
                          {opcion.beneficiarios > 0
                            ? textoBeneficiarios(opcion.beneficiarios)
                            : "0 en este proyecto"}
                        </span>
                      ) : null}
                      {activa ? (
                        <Check className="h-3.5 w-3.5 text-ruralia-teal" />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}

            {buscando && opciones.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-zinc-500">Buscando...</li>
            ) : null}

            {!buscando && opciones.length === 0 && !mostrarCrear && !modoNuevo ? (
              <li className="px-2.5 py-2 text-sm text-zinc-500">
                {usarProyecto
                  ? "Los beneficiarios del proyecto aún no tienen línea. Escribe para buscar en el catálogo."
                  : termino
                    ? "Sin coincidencias"
                    : "Aún no hay líneas productivas registradas."}
              </li>
            ) : null}

          </ul>
        </div>
      ) : null}
    </div>
  );
}
