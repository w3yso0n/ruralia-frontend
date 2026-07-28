"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  listarDepartamentos,
  listarMunicipios,
  listarVeredas,
  listarVeredasPorMunicipio,
  resolverVereda,
} from "@/lib/api";
import { cargarGoogleMaps, parseGooglePlace } from "@/lib/google-maps";
import type { NodoTerritorial, Vereda, VeredaResumen } from "@/lib/types";

type ModoSeleccion = "maps" | "dane";

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

function aOpcion(v: Vereda | VeredaResumen): VeredaOpcion {
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
  const inputMapsRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [modo, setModo] = useState<ModoSeleccion>("dane");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaMaps, setBusquedaMaps] = useState("");
  const [sugerencias, setSugerencias] = useState<Vereda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDisponible, setGoogleDisponible] = useState(false);
  const [catalogo, setCatalogo] = useState<Map<string, VeredaOpcion>>(
    () => new Map(veredasIniciales.map((v) => [v.id, aOpcion(v)])),
  );

  const [departamentos, setDepartamentos] = useState<NodoTerritorial[]>([]);
  const [municipios, setMunicipios] = useState<NodoTerritorial[]>([]);
  const [veredasMunicipio, setVeredasMunicipio] = useState<NodoTerritorial[]>(
    [],
  );
  const [deptId, setDeptId] = useState("");
  const [munId, setMunId] = useState("");
  const [cargandoDept, setCargandoDept] = useState(false);
  const [cargandoMun, setCargandoMun] = useState(false);
  const [cargandoVer, setCargandoVer] = useState(false);

  const tieneGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  const agregarVereda = useCallback(
    (vereda: VeredaOpcion) => {
      setCatalogo((prev) => {
        const siguiente = new Map(prev);
        siguiente.set(vereda.id, vereda);
        return siguiente;
      });
      if (!valueRef.current.includes(vereda.id)) {
        onChange([...valueRef.current, vereda.id]);
      }
      setError(null);
    },
    [onChange],
  );

  const registrarDesdeMaps = useCallback(
    async (payload: {
      nombreVereda: string;
      municipio?: string;
      departamento?: string;
      corregimiento?: string;
      placeId?: string;
      latitud?: number;
      longitud?: number;
    }) => {
      setResolviendo(true);
      setError(null);
      try {
        const vereda = await resolverVereda(token, payload);
        agregarVereda(aOpcion(vereda));
        setBusquedaMaps("");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo registrar la vereda",
        );
      } finally {
        setResolviendo(false);
      }
    },
    [token, agregarVereda],
  );

  useEffect(() => {
    if (modo !== "maps" || !tieneGoogle || !inputMapsRef.current) return;

    let cancelado = false;

    void cargarGoogleMaps()
      .then((google) => {
        if (cancelado || !inputMapsRef.current) return;
        setGoogleDisponible(true);

        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

        const autocomplete = new google.maps.places.Autocomplete(
          inputMapsRef.current,
          {
            componentRestrictions: { country: "co" },
            fields: [
              "address_components",
              "geometry",
              "name",
              "place_id",
              "formatted_address",
            ],
          },
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.place_id) return;
          void registrarDesdeMaps(parseGooglePlace(place));
        });

        autocompleteRef.current = autocomplete;
      })
      .catch(() => {
        setGoogleDisponible(false);
        setError(
          "No se pudo cargar Google Maps. Usa el catálogo DANE o recarga la página.",
        );
      });

    return () => {
      cancelado = true;
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(
          autocompleteRef.current,
        );
        autocompleteRef.current = null;
      }
    };
  }, [modo, tieneGoogle, registrarDesdeMaps]);

  useEffect(() => {
    if (modo !== "dane") return;
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
  }, [busqueda, token, modo]);

  useEffect(() => {
    if (modo !== "dane") return;
    let cancelado = false;
    setCargandoDept(true);
    void listarDepartamentos(token, { incluirInactivos: false })
      .then((datos) => {
        if (!cancelado) setDepartamentos(datos.filter((d) => d.estaActivo));
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar departamentos DANE",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoDept(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, modo]);

  useEffect(() => {
    if (!deptId) {
      setMunicipios([]);
      setMunId("");
      setVeredasMunicipio([]);
      return;
    }
    let cancelado = false;
    setCargandoMun(true);
    setMunId("");
    setVeredasMunicipio([]);
    void listarMunicipios(token, deptId, false)
      .then((datos) => {
        if (!cancelado) setMunicipios(datos.filter((m) => m.estaActivo));
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar municipios DANE",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoMun(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, deptId]);

  useEffect(() => {
    if (!munId) {
      setVeredasMunicipio([]);
      return;
    }
    let cancelado = false;
    setCargandoVer(true);
    void listarVeredasPorMunicipio(token, munId, false)
      .then((datos) => {
        if (!cancelado) setVeredasMunicipio(datos.filter((v) => v.estaActivo));
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar veredas DANE",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoVer(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, munId]);

  function quitar(id: string) {
    onChange(value.filter((x) => x !== id));
  }

  function agregarDesdeCatalogo(vereda: Vereda) {
    if (value.includes(vereda.id)) return;
    agregarVereda(aOpcion(vereda));
    setBusqueda("");
    setSugerencias([]);
    setMostrarSugerencias(false);
  }

  function agregarDesdeNodo(nodo: NodoTerritorial) {
    if (value.includes(nodo.id)) return;
    const dept = departamentos.find((d) => d.id === deptId);
    const mun = municipios.find((m) => m.id === munId);
    agregarVereda({
      id: nodo.id,
      nombre: nodo.nombre,
      municipioNombre: mun?.nombre,
      departamentoNombre: dept?.nombre,
    });
  }

  const sugerenciasFiltradas = sugerencias.filter((v) => !value.includes(v.id));
  const veredasMunicipioDisponibles = veredasMunicipio.filter(
    (v) => !value.includes(v.id),
  );

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
          Aún no hay veredas asignadas. Elige cómo agregarlas.
        </p>
      )}

      <div
        role="tablist"
        aria-label="Método para asociar veredas"
        className="flex rounded-xl border border-zinc-200 bg-zinc-50 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={modo === "dane"}
          onClick={() => {
            setModo("dane");
            setError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            modo === "dane"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <Search className="h-4 w-4" />
          Catálogo DANE
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modo === "maps"}
          onClick={() => {
            setModo("maps");
            setError(null);
          }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
            modo === "maps"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Google Maps
        </button>
      </div>

      {modo === "dane" ? (
        <div className="space-y-4">
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
                        onClick={() => agregarDesdeCatalogo(v)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-ruralia-teal-soft"
                      >
                        <span className="font-medium text-zinc-900">
                          {v.nombre}
                        </span>
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

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
            <p className="mb-3 text-xs font-medium text-zinc-600">
              O navega el catálogo oficial (departamento → municipio → vereda)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Departamento
                </label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  disabled={cargandoDept}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                >
                  <option value="">
                    {cargandoDept ? "Cargando…" : "Selecciona departamento"}
                  </option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Municipio
                </label>
                <select
                  value={munId}
                  onChange={(e) => setMunId(e.target.value)}
                  disabled={!deptId || cargandoMun}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal disabled:opacity-60"
                >
                  <option value="">
                    {cargandoMun
                      ? "Cargando…"
                      : deptId
                        ? "Selecciona municipio"
                        : "Elige departamento primero"}
                  </option>
                  {municipios.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {munId ? (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                {cargandoVer ? (
                  <p className="flex items-center gap-2 px-3 py-3 text-sm text-zinc-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando veredas DANE…
                  </p>
                ) : veredasMunicipioDisponibles.length > 0 ? (
                  <ul className="divide-y divide-zinc-100">
                    {veredasMunicipioDisponibles.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => agregarDesdeNodo(v)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-ruralia-teal-soft"
                        >
                          <span>
                            <span className="font-medium text-zinc-900">
                              {v.nombre}
                            </span>
                            {v.codigo ? (
                              <span className="ml-2 text-xs text-zinc-400">
                                {v.codigo}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-ruralia-teal-text">
                            Agregar
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-sm text-zinc-500">
                    {veredasMunicipio.length > 0
                      ? "Todas las veredas de este municipio ya están seleccionadas."
                      : "Este municipio no tiene veredas activas en el catálogo."}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <p className="text-xs text-zinc-500">
            Usa el mismo catálogo cargado en Territorios (DANE). Busca por
            nombre o navega por municipio.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {!tieneGoogle ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No hay API key de Google Maps. Configura{" "}
              <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> o
              usa el catálogo DANE.
            </p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">
                {googleDisponible
                  ? "Busca una vereda, corregimiento o localidad rural en Colombia y se agregará al proyecto."
                  : "Cargando búsqueda con Google Maps…"}
              </p>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  ref={inputMapsRef}
                  type="text"
                  value={busquedaMaps}
                  onChange={(e) => setBusquedaMaps(e.target.value)}
                  disabled={resolviendo || !googleDisponible}
                  placeholder="Ej: Vereda El Paraíso, Marinilla, Antioquia"
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10 disabled:opacity-60"
                />
              </div>
              {resolviendo ? (
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Registrando territorio…
                </p>
              ) : null}
            </>
          )}
        </div>
      )}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
