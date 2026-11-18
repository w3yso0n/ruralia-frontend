"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Crosshair,
  LoaderCircle,
  MapPinOff,
  Pencil,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  confirmarUbicacionBeneficiario,
  corregirUbicacionBeneficiario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { candidatosUbicacion } from "@/lib/territorio/candidatos-ubicacion";
import type { Beneficiario, PuntoTerritorioBeneficiario } from "@/lib/types";

export type TipoRevision = "ilegible" | "dudosa";

export interface ItemRevision {
  punto: PuntoTerritorioBeneficiario;
  tipo: TipoRevision;
  motivos: string[];
  /** Texto original de la carga, si existe. */
  latitudTexto: string | null;
  longitudTexto: string | null;
}

interface RevisionUbicacionesProps {
  items: ItemRevision[];
  puedeGestionar: boolean;
  /** Nombre del polígono del equipo donde cae el punto (para orientar al elegir). */
  describirPunto: (latitud: number, longitud: number) => string | null;
  onVer: (latitud: number, longitud: number) => void;
  onActualizado: (id: string, beneficiario: Beneficiario) => void;
}

const POR_PAGINA = 25;

function numero(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function RevisionUbicaciones({
  items,
  puedeGestionar,
  describirPunto,
  onVer,
  onActualizado,
}: RevisionUbicacionesProps) {
  const [tipo, setTipo] = useState<TipoRevision>("ilegible");
  const [busqueda, setBusqueda] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [abierto, setAbierto] = useState<string | null>(null);

  const conteo = useMemo(
    () => ({
      ilegible: items.filter((i) => i.tipo === "ilegible").length,
      dudosa: items.filter((i) => i.tipo === "dudosa").length,
    }),
    [items],
  );

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.tipo === tipo &&
        (!termino ||
          `${i.punto.nombres} ${i.punto.apellidos} ${i.punto.numeroDocumento}`
            .toLowerCase()
            .includes(termino)),
    );
  }, [items, tipo, busqueda]);

  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-ruralia-teal" />
          <h3 className="text-sm font-semibold text-zinc-900">Ubicaciones por revisar</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          No hay ubicaciones ilegibles ni dudosas.
        </p>
      </section>
    );
  }

  return (
    <section
      id="revision-ubicaciones"
      className="rounded-2xl border border-amber-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-zinc-900">
              Ubicaciones por revisar ({items.length})
            </h3>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Corrige la ubicación o confirma que es correcta. Lo confirmado deja de
            aparecer aquí hasta que la ubicación cambie.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setLimite(POR_PAGINA);
            }}
            placeholder="Buscar por nombre o documento"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2 border-b border-zinc-200">
        {(
          [
            ["ilegible", "Ilegibles o imposibles", conteo.ilegible],
            ["dudosa", "Dudosas", conteo.dudosa],
          ] as const
        ).map(([valor, etiqueta, total]) => (
          <button
            key={valor}
            type="button"
            onClick={() => {
              setTipo(valor);
              setLimite(POR_PAGINA);
              setAbierto(null);
            }}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tipo === valor
                ? "border-ruralia-teal text-ruralia-teal-text"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {etiqueta} ({total})
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {tipo === "ilegible"
          ? "La ubicación que llegó no se puede leer sin adivinar (números sin separador decimal, valores imposibles o mal escritos). No aparecen en el mapa."
          : "La ubicación se pudo leer pero algo no cuadra: queda fuera de los límites del equipo, no coincide con el territorio registrado o el GPS no fue confiable."}
      </p>

      {visibles.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Sin resultados.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {visibles.slice(0, limite).map((item) => (
            <FilaRevision
              key={item.punto.id}
              item={item}
              abierto={abierto === item.punto.id}
              onAlternar={() =>
                setAbierto((a) => (a === item.punto.id ? null : item.punto.id))
              }
              puedeGestionar={puedeGestionar}
              describirPunto={describirPunto}
              onVer={onVer}
              onActualizado={(b) => {
                setAbierto(null);
                onActualizado(item.punto.id, b);
              }}
            />
          ))}
        </ul>
      )}
      {visibles.length > limite ? (
        <button
          type="button"
          onClick={() => setLimite((l) => l + POR_PAGINA)}
          className="mt-3 w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Ver más ({visibles.length - limite} restantes)
        </button>
      ) : null}
    </section>
  );
}

function FilaRevision({
  item,
  abierto,
  onAlternar,
  puedeGestionar,
  describirPunto,
  onVer,
  onActualizado,
}: {
  item: ItemRevision;
  abierto: boolean;
  onAlternar: () => void;
  puedeGestionar: boolean;
  describirPunto: (latitud: number, longitud: number) => string | null;
  onVer: (latitud: number, longitud: number) => void;
  onActualizado: (beneficiario: Beneficiario) => void;
}) {
  const { token } = useAuth();
  const { punto } = item;
  const tieneUbicacion = punto.latitud != null && punto.longitud != null;
  const [latitud, setLatitud] = useState(tieneUbicacion ? String(punto.latitud) : "");
  const [longitud, setLongitud] = useState(tieneUbicacion ? String(punto.longitud) : "");
  const [enviando, setEnviando] = useState<"confirmar" | "corregir" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidatos = useMemo(
    () =>
      candidatosUbicacion(item.latitudTexto, item.longitudTexto).map((c) => ({
        ...c,
        lugar: describirPunto(c.latitud, c.longitud),
      })),
    [item.latitudTexto, item.longitudTexto, describirPunto],
  );

  async function confirmar() {
    if (!token) return;
    setEnviando("confirmar");
    setError(null);
    try {
      onActualizado(await confirmarUbicacionBeneficiario(token, punto.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar");
    } finally {
      setEnviando(null);
    }
  }

  async function corregir() {
    if (!token) return;
    const lat = numero(latitud);
    const lng = numero(longitud);
    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Escribe latitud y longitud en grados decimales, por ejemplo 9.7309 y -75.1868");
      return;
    }
    setEnviando("corregir");
    setError(null);
    try {
      onActualizado(
        await corregirUbicacionBeneficiario(token, punto.id, {
          latitud: lat,
          longitud: lng > 0 ? -lng : lng,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setEnviando(null);
    }
  }

  const textoOriginal =
    item.latitudTexto || item.longitudTexto
      ? `${item.latitudTexto ?? "(vacía)"} | ${item.longitudTexto ?? "(vacía)"}`
      : null;

  return (
    <li className="px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">
            {punto.nombres} {punto.apellidos}
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {punto.numeroDocumento}
            </span>
          </p>
          <ul className="mt-0.5 flex flex-col gap-0.5 text-xs text-amber-800">
            {item.motivos.map((m) => (
              <li key={m} className="flex items-start gap-1">
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-zinc-500">
            {tieneUbicacion
              ? `Actual: ${punto.latitud!.toFixed(5)}, ${punto.longitud!.toFixed(5)}`
              : "Sin ubicación válida"}
            {textoOriginal ? ` · Original: ${textoOriginal}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {tieneUbicacion ? (
            <button
              type="button"
              onClick={() => onVer(punto.latitud!, punto.longitud!)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <Crosshair className="h-3.5 w-3.5" /> Ver
            </button>
          ) : null}
          {puedeGestionar && item.tipo === "dudosa" ? (
            <button
              type="button"
              disabled={enviando !== null}
              onClick={confirmar}
              className="inline-flex items-center gap-1 rounded-lg bg-ruralia-teal-soft px-2.5 py-1 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
            >
              {enviando === "confirmar" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Es correcta
            </button>
          ) : null}
          {puedeGestionar ? (
            <button
              type="button"
              onClick={onAlternar}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {abierto ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {abierto ? "Cerrar" : "Corregir"}
            </button>
          ) : null}
        </div>
      </div>

      {error && !abierto ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

      {abierto ? (
        <div className="mt-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 p-3">
          {candidatos.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-medium text-zinc-700">
                Lecturas posibles del valor original (elige una o escribe la correcta)
              </p>
              <ul className="flex flex-col gap-1.5">
                {candidatos.map((c) => {
                  const elegido =
                    numero(latitud) === c.latitud && numero(longitud) === c.longitud;
                  return (
                    <li key={`${c.latitud},${c.longitud}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setLatitud(String(c.latitud));
                          setLongitud(String(c.longitud));
                          onVer(c.latitud, c.longitud);
                        }}
                        className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-xs ${
                          elegido
                            ? "border-ruralia-teal ring-2 ring-ruralia-teal/20"
                            : "border-zinc-200 hover:border-ruralia-teal-border"
                        }`}
                      >
                        <span>
                          <span className="font-semibold text-zinc-900">
                            {c.latitud.toFixed(5)}, {c.longitud.toFixed(5)}
                          </span>
                          <span className="ml-2 text-zinc-500">{c.descripcion}</span>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 ${
                            c.lugar ? "text-ruralia-teal-text" : "text-amber-700"
                          }`}
                        >
                          {c.lugar ? null : <MapPinOff className="h-3 w-3" />}
                          {c.lugar ?? "Fuera de los límites del equipo"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input
              inputMode="decimal"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
              placeholder="Latitud, ej. 9.7309"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
            <input
              inputMode="decimal"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              placeholder="Longitud, ej. -75.1868"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
            />
            <button
              type="button"
              onClick={() => {
                const lat = numero(latitud);
                const lng = numero(longitud);
                if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
                  onVer(lat, lng > 0 ? -lng : lng);
                }
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <Crosshair className="h-3.5 w-3.5" /> Ver
            </button>
            <button
              type="button"
              disabled={enviando !== null}
              onClick={corregir}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-ruralia-teal px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviando === "corregir" ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Guardar corrección
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
          <p className="mt-2 text-[11px] text-zinc-500">
            La corrección queda como ubicación manual confirmada por ti. Si después
            llega un GPS de un formulario de campo, el GPS la reemplaza.
          </p>
        </div>
      ) : null}
    </li>
  );
}
