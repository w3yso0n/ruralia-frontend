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
import {
  CENTRO_COLOMBIA,
  GOOGLE_MAP_ID,
  cargarGoogleMaps,
  cargarGoogleMapsDashboard,
  crearContenidoMarcadorPin,
  geocodificarInverso,
  parseGooglePlace,
  type DatosLugarGoogle,
} from "@/lib/google-maps";
import type { NodoTerritorial, Vereda, VeredaResumen } from "@/lib/types";

type ModoSeleccion = "maps" | "dane";

interface VeredaOpcion {
  id: string;
  nombre: string;
  municipioNombre?: string;
  departamentoNombre?: string;
  latitud?: number;
  longitud?: number;
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
    latitud: v.latitud ?? undefined,
    longitud: v.longitud ?? undefined,
  };
}

function tieneUbicacion(v: VeredaOpcion): boolean {
  return (
    v.latitud != null &&
    v.longitud != null &&
    Number.isFinite(v.latitud) &&
    Number.isFinite(v.longitud)
  );
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
  const mapaContenedorRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const marcadorRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const advancedMarkerCtorRef = useRef<
    typeof google.maps.marker.AdvancedMarkerElement | null
  >(null);
  const listenersMapaRef = useRef<google.maps.MapsEventListener[]>([]);
  const valueRef = useRef(value);
  valueRef.current = value;

  const [modo, setModo] = useState<ModoSeleccion>("dane");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaMaps, setBusquedaMaps] = useState("");
  const [sugerencias, setSugerencias] = useState<Vereda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const [geocodificando, setGeocodificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleDisponible, setGoogleDisponible] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [ubicacionPendiente, setUbicacionPendiente] =
    useState<DatosLugarGoogle | null>(null);
  const [enfoqueMapa, setEnfoqueMapa] = useState<{
    lat: number;
    lng: number;
    nombre: string;
  } | null>(null);
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
        const opcion = aOpcion(v);
        const previa = siguiente.get(v.id);
        siguiente.set(
          v.id,
          previa
            ? {
                ...previa,
                ...opcion,
                latitud: opcion.latitud ?? previa.latitud,
                longitud: opcion.longitud ?? previa.longitud,
                municipioNombre:
                  opcion.municipioNombre ?? previa.municipioNombre,
                departamentoNombre:
                  opcion.departamentoNombre ?? previa.departamentoNombre,
              }
            : opcion,
        );
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
    async (payload: DatosLugarGoogle) => {
      setResolviendo(true);
      setError(null);
      try {
        const vereda = await resolverVereda(token, {
          nombreVereda: payload.nombreVereda,
          municipio: payload.municipio,
          departamento: payload.departamento,
          corregimiento: payload.corregimiento,
          placeId: payload.placeId,
          latitud: payload.latitud,
          longitud: payload.longitud,
        });
        agregarVereda(aOpcion(vereda));
        setBusquedaMaps("");
        setUbicacionPendiente(null);
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

  const resolverClickMapa = useCallback(
    async (latitud: number, longitud: number) => {
      setGeocodificando(true);
      setError(null);
      try {
        const datos = await geocodificarInverso(latitud, longitud);
        if (!datos) {
          setError("No se pudo identificar la ubicación en el mapa");
          return;
        }
        setUbicacionPendiente(datos);
        setBusquedaMaps(datos.direccion ?? datos.nombreVereda);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo geocodificar la ubicación",
        );
      } finally {
        setGeocodificando(false);
      }
    },
    [],
  );

  const resolverClickMapaRef = useRef(resolverClickMapa);
  resolverClickMapaRef.current = resolverClickMapa;

  const colocarPin = useCallback(
    (
      AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement,
      posicion: google.maps.LatLngLiteral,
    ) => {
      if (!mapaRef.current) return;

      if (marcadorRef.current) {
        marcadorRef.current.position = posicion;
        return;
      }

      const marcador = new AdvancedMarkerElement({
        map: mapaRef.current,
        position: posicion,
        gmpDraggable: true,
        title: "Ubicación seleccionada",
        content: crearContenidoMarcadorPin("#42827A"),
      });

      marcador.addListener("dragend", () => {
        const pos = marcador.position;
        if (!pos) return;
        const lat =
          typeof pos.lat === "function"
            ? pos.lat()
            : (pos as google.maps.LatLngLiteral).lat;
        const lng =
          typeof pos.lng === "function"
            ? pos.lng()
            : (pos as google.maps.LatLngLiteral).lng;
        void resolverClickMapaRef.current(lat, lng);
      });

      marcadorRef.current = marcador;
    },
    [],
  );

  const colocarPinRef = useRef(colocarPin);
  colocarPinRef.current = colocarPin;

  useEffect(() => {
    if (modo !== "maps" || !tieneGoogle || !inputMapsRef.current) return;

    let cancelado = false;

    void Promise.all([cargarGoogleMaps(), cargarGoogleMapsDashboard()])
      .then(([google, libs]) => {
        if (cancelado || !inputMapsRef.current || !mapaContenedorRef.current) {
          return;
        }
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
          const datos = parseGooglePlace(place);
          if (
            datos.latitud != null &&
            datos.longitud != null &&
            mapaRef.current
          ) {
            const posicion = { lat: datos.latitud, lng: datos.longitud };
            colocarPinRef.current(libs.AdvancedMarkerElement, posicion);
            mapaRef.current.panTo(posicion);
            mapaRef.current.setZoom(
              Math.max(mapaRef.current.getZoom() ?? 12, 14),
            );
          }
          void registrarDesdeMaps(datos);
        });

        autocompleteRef.current = autocomplete;

        if (!mapaRef.current) {
          const mapa = new libs.Map(mapaContenedorRef.current, {
            center: CENTRO_COLOMBIA,
            zoom: 6,
            mapId: GOOGLE_MAP_ID,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
          });

          const clickListener = mapa.addListener(
            "click",
            (evento: google.maps.MapMouseEvent) => {
              const latLng = evento.latLng;
              if (!latLng) return;
              const posicion = { lat: latLng.lat(), lng: latLng.lng() };
              colocarPinRef.current(libs.AdvancedMarkerElement, posicion);
              void resolverClickMapaRef.current(posicion.lat, posicion.lng);
            },
          );

          listenersMapaRef.current = [clickListener];
          mapaRef.current = mapa;
        }

        advancedMarkerCtorRef.current = libs.AdvancedMarkerElement;
        setMapaListo(true);
      })
      .catch(() => {
        if (!cancelado) {
          setGoogleDisponible(false);
          setMapaListo(false);
          setError(
            "No se pudo cargar Google Maps. Usa el catálogo DANE o recarga la página.",
          );
        }
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
    if (modo === "maps") return;

    listenersMapaRef.current.forEach((listener) => listener.remove());
    listenersMapaRef.current = [];
    if (marcadorRef.current) {
      marcadorRef.current.map = null;
      marcadorRef.current = null;
    }
    mapaRef.current = null;
    advancedMarkerCtorRef.current = null;
    setMapaListo(false);
    setUbicacionPendiente(null);
    setEnfoqueMapa(null);
  }, [modo]);

  useEffect(() => {
    if (!mapaListo || !enfoqueMapa || !mapaRef.current) return;
    const ctor = advancedMarkerCtorRef.current;
    if (!ctor) return;

    const posicion = { lat: enfoqueMapa.lat, lng: enfoqueMapa.lng };
    colocarPin(ctor, posicion);
    mapaRef.current.panTo(posicion);
    mapaRef.current.setZoom(15);
    setUbicacionPendiente(null);
    setBusquedaMaps(enfoqueMapa.nombre);
  }, [mapaListo, enfoqueMapa, colocarPin]);

  function enfocarVeredaEnMapa(vereda: VeredaOpcion) {
    if (!tieneUbicacion(vereda)) {
      setError(
        "Esta vereda no tiene ubicación exacta guardada. Agrégala desde Google Maps.",
      );
      return;
    }
    setError(null);
    setEnfoqueMapa({
      lat: vereda.latitud!,
      lng: vereda.longitud!,
      nombre: etiquetaVereda(vereda),
    });
    setModo("maps");
  }

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
            const georreferenciada = vereda ? tieneUbicacion(vereda) : false;
            return (
              <span
                key={id}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-3 pr-1.5 text-sm text-zinc-800 ${
                  georreferenciada
                    ? "border-ruralia-teal-border bg-ruralia-teal-soft/50"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!vereda) return;
                    enfocarVeredaEnMapa(vereda);
                  }}
                  title={
                    georreferenciada
                      ? "Ver ubicación exacta en el mapa"
                      : "Sin ubicación exacta guardada"
                  }
                  className={`truncate text-left transition ${
                    georreferenciada
                      ? "hover:text-ruralia-teal-text"
                      : "cursor-default"
                  }`}
                >
                  {georreferenciada ? (
                    <MapPin className="mr-1 inline h-3.5 w-3.5 text-ruralia-teal-text" />
                  ) : null}
                  {vereda ? etiquetaVereda(vereda) : "Vereda seleccionada"}
                </button>
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
                  ? "Busca un lugar o haz clic en el mapa para colocar un pin y elegir la ubicación exacta."
                  : "Cargando mapa y búsqueda con Google Maps…"}
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

              <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <div
                  ref={mapaContenedorRef}
                  className="h-64 w-full sm:h-72"
                  aria-label="Mapa para seleccionar ubicación"
                />
                {!mapaListo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-100/80 text-sm text-zinc-500">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando mapa…
                    </span>
                  </div>
                ) : null}
              </div>

              {geocodificando ? (
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Identificando ubicación…
                </p>
              ) : null}

              {ubicacionPendiente && !resolviendo ? (
                <div className="flex flex-col gap-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900">
                      {ubicacionPendiente.nombreVereda}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                      {[
                        ubicacionPendiente.municipio,
                        ubicacionPendiente.departamento,
                      ]
                        .filter(Boolean)
                        .join(" · ") ||
                        ubicacionPendiente.direccion ||
                        "Ubicación en el mapa"}
                    </p>
                    {ubicacionPendiente.latitud != null &&
                    ubicacionPendiente.longitud != null ? (
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {ubicacionPendiente.latitud.toFixed(5)},{" "}
                        {ubicacionPendiente.longitud.toFixed(5)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setUbicacionPendiente(null)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => void registrarDesdeMaps(ubicacionPendiente)}
                      className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal/90"
                    >
                      Agregar ubicación
                    </button>
                  </div>
                </div>
              ) : null}

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
