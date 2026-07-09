"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listarVeredas, resolverVereda } from "@/lib/api";
import { cargarGoogleMaps, parseGooglePlace } from "@/lib/google-maps";
import type { Vereda } from "@/lib/types";

interface SelectorVeredaProps {
  token: string;
  value: string;
  veredaInicial?: Vereda | null;
  onChange: (veredaId: string, vereda?: Vereda) => void;
  required?: boolean;
  label?: string;
}

export function SelectorVereda({
  token,
  value,
  veredaInicial,
  onChange,
  required,
  label = "Territorio (vereda)",
}: SelectorVeredaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionada, setSeleccionada] = useState<Vereda | null>(
    veredaInicial ?? null,
  );
  const [sugerencias, setSugerencias] = useState<Vereda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modoManual, setModoManual] = useState(false);
  const [googleDisponible, setGoogleDisponible] = useState(false);
  const [manual, setManual] = useState({
    nombreVereda: "",
    municipio: "",
    departamento: "",
  });

  const tieneGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (veredaInicial) {
      setSeleccionada(veredaInicial);
    }
  }, [veredaInicial]);

  useEffect(() => {
    if (!value) {
      setSeleccionada(null);
    }
  }, [value]);

  const registrarVereda = useCallback(
    async (payload: {
      nombreVereda: string;
      municipio?: string;
      departamento?: string;
      corregimiento?: string;
      placeId?: string;
      latitud?: number;
      longitud?: number;
    }) => {
      setCargando(true);
      setError(null);
      try {
        const vereda = await resolverVereda(token, payload);
        setSeleccionada(vereda);
        onChange(vereda.id, vereda);
        setBusqueda("");
        setMostrarSugerencias(false);
        setModoManual(false);
        return vereda;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar vereda");
        return null;
      } finally {
        setCargando(false);
      }
    },
    [token, onChange],
  );

  useEffect(() => {
    if (!tieneGoogle || !inputRef.current || modoManual) return;

    let cancelado = false;

    void cargarGoogleMaps()
      .then((google) => {
        if (cancelado || !inputRef.current) return;
        setGoogleDisponible(true);

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "co" },
          fields: [
            "address_components",
            "geometry",
            "name",
            "place_id",
            "formatted_address",
          ],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.place_id) return;
          const datos = parseGooglePlace(place);
          void registrarVereda(datos);
        });

        autocompleteRef.current = autocomplete;
      })
      .catch(() => {
        setGoogleDisponible(false);
        setModoManual(true);
      });

    return () => {
      cancelado = true;
      autocompleteRef.current = null;
    };
  }, [tieneGoogle, modoManual, registrarVereda]);

  useEffect(() => {
    if (busqueda.trim().length < 2 || modoManual) {
      setSugerencias([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void listarVeredas(token, { busqueda: busqueda.trim(), limite: 8 }).then(
        (r) => setSugerencias(r.datos),
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [busqueda, token, modoManual]);

  function elegirExistente(vereda: Vereda) {
    setSeleccionada(vereda);
    onChange(vereda.id, vereda);
    setBusqueda("");
    setMostrarSugerencias(false);
    setError(null);
  }

  function limpiar() {
    setSeleccionada(null);
    onChange("");
    setBusqueda("");
    setError(null);
  }

  async function guardarManual(evento: React.FormEvent) {
    evento.preventDefault();
    if (!manual.nombreVereda.trim() || !manual.municipio.trim()) {
      setError("Indica al menos el nombre de la vereda y el municipio");
      return;
    }
    await registrarVereda({
      nombreVereda: manual.nombreVereda.trim(),
      municipio: manual.municipio.trim(),
      departamento: manual.departamento.trim() || undefined,
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700">
        {label}
        {required ? " *" : ""}
      </label>

      {seleccionada ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3">
          <div>
            <p className="font-medium text-zinc-900">{seleccionada.nombre}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {[seleccionada.municipioNombre, seleccionada.departamentoNombre]
                .filter(Boolean)
                .join(" · ") || "Territorio registrado"}
            </p>
          </div>
          <button
            type="button"
            onClick={limpiar}
            className="text-sm font-semibold text-ruralia-teal-text hover:underline"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {googleDisponible
              ? "Busca con Google Maps: vereda, corregimiento o municipio rural en Colombia."
              : tieneGoogle
                ? "Cargando búsqueda con mapas..."
                : "Sin API de Google Maps: usa el registro manual o escribe para buscar territorios ya guardados."}
          </p>

          {!modoManual ? (
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                placeholder="Ej: Vereda El Paraíso, Marinilla, Antioquia"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
              />

              {mostrarSugerencias && sugerencias.length > 0 ? (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                  <li className="px-3 py-1 text-xs font-medium uppercase text-zinc-400">
                    Ya registradas
                  </li>
                  {sugerencias.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => elegirExistente(v)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-ruralia-teal-soft"
                      >
                        <span className="font-medium">{v.nombre}</span>
                        {v.municipioNombre ? (
                          <span className="ml-2 text-zinc-500">
                            {v.municipioNombre}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <form onSubmit={guardarManual} className="space-y-3 rounded-xl border border-zinc-200 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">
                  Nombre de la vereda *
                </label>
                <input
                  required
                  value={manual.nombreVereda}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, nombreVereda: e.target.value }))
                  }
                  placeholder="El Paraíso"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Municipio *
                  </label>
                  <input
                    required
                    value={manual.municipio}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, municipio: e.target.value }))
                    }
                    placeholder="Marinilla"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">
                    Departamento
                  </label>
                  <input
                    value={manual.departamento}
                    onChange={(e) =>
                      setManual((m) => ({ ...m, departamento: e.target.value }))
                    }
                    placeholder="Antioquia"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={cargando}
                className="rounded-lg bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {cargando ? "Registrando..." : "Registrar territorio"}
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            {!modoManual ? (
              <button
                type="button"
                onClick={() => setModoManual(true)}
                className="font-semibold text-ruralia-teal-text hover:underline"
              >
                Registrar manualmente
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModoManual(false)}
                className="font-semibold text-ruralia-teal-text hover:underline"
              >
                Volver a búsqueda
              </button>
            )}
          </div>
        </>
      )}

      {cargando ? (
        <p className="text-xs text-zinc-500">Registrando territorio...</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
