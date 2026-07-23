"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { listarVeredas } from "@/lib/api";
import type { Vereda, VeredaResumen } from "@/lib/types";

interface VeredaOpcion {
  id: string;
  nombre: string;
  municipioNombre?: string;
  departamentoNombre?: string;
}

interface SelectorVeredasMultipleProps {
  token: string;
  value: string[];
  onChange: (ids: string[]) => void;
  veredasIniciales?: (Vereda | VeredaResumen)[];
  placeholder?: string;
}

function etiquetaVereda(v: VeredaOpcion): string {
  const ubicacion = [v.municipioNombre, v.departamentoNombre]
    .filter(Boolean)
    .join(", ");
  return ubicacion ? `${v.nombre} · ${ubicacion}` : v.nombre;
}

function aOpcion(
  v: Vereda | VeredaResumen,
): VeredaOpcion {
  return {
    id: v.id,
    nombre: v.nombre,
    municipioNombre: "municipioNombre" in v ? v.municipioNombre : undefined,
    departamentoNombre:
      "departamentoNombre" in v ? v.departamentoNombre : undefined,
  };
}

export function SelectorVeredasMultiple({
  token,
  value,
  onChange,
  veredasIniciales = [],
  placeholder = "Buscar vereda, municipio o departamento…",
}: SelectorVeredasMultipleProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<Vereda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [catalogo, setCatalogo] = useState<Map<string, VeredaOpcion>>(
    () => new Map(veredasIniciales.map((v) => [v.id, aOpcion(v)])),
  );

  useEffect(() => {
    setCatalogo((prev) => {
      const siguiente = new Map(prev);
      for (const v of veredasIniciales) {
        if (!siguiente.has(v.id)) {
          siguiente.set(v.id, aOpcion(v));
        }
      }
      return siguiente;
    });
  }, [veredasIniciales]);

  useEffect(() => {
    function cerrarSiClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", cerrarSiClickFuera);
    return () => document.removeEventListener("mousedown", cerrarSiClickFuera);
  }, []);

  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setSugerencias([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    const timer = window.setTimeout(() => {
      void listarVeredas(token, { busqueda: termino, limite: 12 })
        .then((r) => setSugerencias(r.datos))
        .finally(() => setCargando(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [busqueda, token]);

  function agregar(vereda: Vereda) {
    if (value.includes(vereda.id)) return;
    setCatalogo((prev) => {
      const siguiente = new Map(prev);
      siguiente.set(vereda.id, aOpcion(vereda));
      return siguiente;
    });
    onChange([...value, vereda.id]);
    setBusqueda("");
    setSugerencias([]);
    setMostrarSugerencias(false);
  }

  function quitar(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  const sugerenciasFiltradas = sugerencias.filter((v) => !value.includes(v.id));

  return (
    <div ref={contenedorRef} className="space-y-3">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => {
            const vereda = catalogo.get(id);
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 py-1 pl-3 pr-1.5 text-sm text-zinc-800"
              >
                <span className="truncate">
                  {vereda ? etiquetaVereda(vereda) : "Vereda seleccionada"}
                </span>
                <button
                  type="button"
                  onClick={() => quitar(id)}
                  className="shrink-0 rounded-full p-0.5 text-zinc-500 transition hover:bg-white hover:text-zinc-800"
                  aria-label="Quitar vereda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Aún no hay veredas asignadas. Usa el buscador para agregar.
        </p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setMostrarSugerencias(true);
          }}
          onFocus={() => setMostrarSugerencias(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
        />

        {mostrarSugerencias && busqueda.trim().length >= 2 ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            {cargando ? (
              <li className="px-3 py-2 text-sm text-zinc-500">Buscando…</li>
            ) : sugerenciasFiltradas.length > 0 ? (
              sugerenciasFiltradas.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => agregar(v)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-ruralia-teal-soft"
                  >
                    <span className="font-medium text-zinc-900">{v.nombre}</span>
                    {v.municipioNombre || v.departamentoNombre ? (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {[v.municipioNombre, v.departamentoNombre]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-zinc-500">
                Sin resultados para &ldquo;{busqueda.trim()}&rdquo;
              </li>
            )}
          </ul>
        ) : null}
      </div>

      <p className="text-xs text-zinc-500">
        Escribe al menos 2 caracteres para buscar en el catálogo DANE.
      </p>
    </div>
  );
}
