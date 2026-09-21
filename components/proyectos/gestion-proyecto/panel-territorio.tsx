"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin,
  Pencil,
  Pentagon,
  Plus,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { MapaTerritorioProyecto } from "@/components/proyectos/gestion-proyecto/mapa-territorio-proyecto";
import {
  actualizarGeocercaProyecto,
  crearGeocercaProyecto,
  eliminarGeocercaProyecto,
  listarGeocercasProyecto,
} from "@/lib/api";
import { cargarGoogleMaps } from "@/lib/google-maps";
import type { Geocerca, Proyecto, PuntoGeocerca } from "@/lib/types";

const COLORES = [
  "#42827A",
  "#2563EB",
  "#DC2626",
  "#CA8A04",
  "#7C3AED",
  "#EA580C",
] as const;

interface PanelTerritorioProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  puedeGestionar: boolean;
  onIrAEquipo?: () => void;
}

function formatearCoord(valor: number): string {
  return valor.toFixed(6);
}

function puntoValido(latitud: number, longitud: number): boolean {
  return (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    longitud >= -180 &&
    longitud <= 180
  );
}

export function PanelTerritorio({
  token,
  proyectoId,
  proyecto,
  puedeGestionar,
  onIrAEquipo,
}: PanelTerritorioProps) {
  const [geocercas, setGeocercas] = useState<Geocerca[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [modoDibujo, setModoDibujo] = useState(false);
  const [geocercaEditandoId, setGeocercaEditandoId] = useState<string | null>(
    null,
  );
  const [geocercaActivaId, setGeocercaActivaId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState<string>(COLORES[0]);
  const [puntos, setPuntos] = useState<PuntoGeocerca[]>([]);
  const [pinPendiente, setPinPendiente] = useState<PuntoGeocerca | null>(null);
  const [centrarPinKey, setCentrarPinKey] = useState(0);
  const [busquedaLugar, setBusquedaLugar] = useState("");
  const [latitudManual, setLatitudManual] = useState("");
  const [longitudManual, setLongitudManual] = useState("");
  const inputLugarRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const veredas = proyecto.veredas ?? [];

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await listarGeocercasProyecto(token, proyectoId);
      setGeocercas(datos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar geocercas",
      );
    } finally {
      setCargando(false);
    }
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!modoDibujo) return;
    const input = inputLugarRef.current;
    if (!input) return;

    let cancelado = false;

    void cargarGoogleMaps()
      .then((googleNs) => {
        if (cancelado || !inputLugarRef.current) return;
        if (autocompleteRef.current) {
          googleNs.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        const autocomplete = new googleNs.maps.places.Autocomplete(input, {
          componentRestrictions: { country: "co" },
          fields: ["geometry", "name", "formatted_address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          colocarPin(loc.lat(), loc.lng(), true);
          setBusquedaLugar(place.formatted_address || place.name || "");
          setError(null);
        });
        autocompleteRef.current = autocomplete;
      })
      .catch(() => {
        /* El pin en el mapa sigue disponible sin autocomplete. */
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
  }, [modoDibujo]);

  function iniciarNueva() {
    setModoDibujo(true);
    setGeocercaEditandoId(null);
    setGeocercaActivaId(null);
    setNombre("");
    setDescripcion("");
    setColor(COLORES[0]);
    setPuntos([]);
    setPinPendiente(null);
    setBusquedaLugar("");
    setLatitudManual("");
    setLongitudManual("");
    setError(null);
    setExito(null);
  }

  function iniciarEdicion(geocerca: Geocerca) {
    setModoDibujo(true);
    setGeocercaEditandoId(geocerca.id);
    setGeocercaActivaId(geocerca.id);
    setNombre(geocerca.nombre);
    setDescripcion(geocerca.descripcion ?? "");
    setColor(geocerca.color);
    setPuntos(geocerca.puntos.map((p) => ({ ...p })));
    setPinPendiente(null);
    setBusquedaLugar("");
    setLatitudManual("");
    setLongitudManual("");
    setError(null);
    setExito(null);
  }

  function cancelarDibujo() {
    setModoDibujo(false);
    setGeocercaEditandoId(null);
    setPuntos([]);
    setPinPendiente(null);
    setBusquedaLugar("");
    setNombre("");
    setDescripcion("");
  }

  function colocarPin(latitud: number, longitud: number, centrar = false) {
    if (!puntoValido(latitud, longitud)) return;
    setPinPendiente({ latitud, longitud });
    if (centrar) setCentrarPinKey((prev) => prev + 1);
  }

  function agregarPunto(latitud: number, longitud: number) {
    if (!puntoValido(latitud, longitud)) return;
    setPuntos((prev) => [...prev, { latitud, longitud }]);
  }

  function agregarDesdePin() {
    if (!pinPendiente) return;
    agregarPunto(pinPendiente.latitud, pinPendiente.longitud);
    setPinPendiente(null);
    setBusquedaLugar("");
    setError(null);
  }

  function agregarPuntoManual() {
    const latitud = Number(latitudManual.replace(",", "."));
    const longitud = Number(longitudManual.replace(",", "."));
    if (!puntoValido(latitud, longitud)) {
      setError("Ingresa una latitud (-90 a 90) y una longitud (-180 a 180) válidas");
      return;
    }
    setError(null);
    agregarPunto(latitud, longitud);
    setLatitudManual("");
    setLongitudManual("");
  }

  function quitarPunto(indice: number) {
    setPuntos((prev) => prev.filter((_, i) => i !== indice));
  }

  async function guardarGeocerca() {
    if (!nombre.trim()) {
      setError("Escribe un nombre para la geocerca");
      return;
    }
    if (puntos.length < 3) {
      setError("Marca al menos 3 puntos para cerrar la zona");
      return;
    }
    setGuardando(true);
    setError(null);
    setExito(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        color,
        puntos,
      };
      if (geocercaEditandoId) {
        const actualizada = await actualizarGeocercaProyecto(
          token,
          proyectoId,
          geocercaEditandoId,
          payload,
        );
        setGeocercas((prev) =>
          prev.map((g) => (g.id === actualizada.id ? actualizada : g)),
        );
        setGeocercaActivaId(actualizada.id);
        setExito("Geocerca actualizada");
      } else {
        const creada = await crearGeocercaProyecto(token, proyectoId, payload);
        setGeocercas((prev) => [...prev, creada]);
        setGeocercaActivaId(creada.id);
        setExito("Geocerca guardada en este proyecto");
      }
      setModoDibujo(false);
      setGeocercaEditandoId(null);
      setPuntos([]);
      setPinPendiente(null);
      setBusquedaLugar("");
      setNombre("");
      setDescripcion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar geocerca");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarGeocerca(geocerca: Geocerca) {
    if (
      !confirm(
        `¿Eliminar la geocerca “${geocerca.nombre}”? Esta zona dejará de verse en el mapa del proyecto.`,
      )
    ) {
      return;
    }
    setError(null);
    setExito(null);
    try {
      await eliminarGeocercaProyecto(token, proyectoId, geocerca.id);
      setGeocercas((prev) => prev.filter((g) => g.id !== geocerca.id));
      if (geocercaActivaId === geocerca.id) setGeocercaActivaId(null);
      if (geocercaEditandoId === geocerca.id) cancelarDibujo();
      setExito("Geocerca eliminada");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar geocerca",
      );
    }
  }

  if (cargando) return <Spinner />;

  return (
    <div className="space-y-6">
      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Mapa del territorio</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Las veredas del proyecto son la base visual. Encima puedes trazar
              geocercas con puntos de latitud y longitud.
            </p>
          </div>
          {puedeGestionar && !modoDibujo ? (
            <button
              type="button"
              onClick={iniciarNueva}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
            >
              <Plus className="h-4 w-4" />
              Nueva geocerca
            </button>
          ) : null}
        </div>

        {veredas.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {veredas.map((vereda) => (
              <span
                key={vereda.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
              >
                <MapPin className="h-3.5 w-3.5 text-ruralia-teal-text" />
                {vereda.nombre}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Este proyecto aún no tiene veredas asignadas.
            {puedeGestionar && onIrAEquipo ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onIrAEquipo}
                  className="font-semibold underline"
                >
                  Asignarlas en Equipo
                </button>
              </>
            ) : null}
          </p>
        )}

        {modoDibujo ? (
          <div className="mb-4 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
            <p className="text-sm font-medium text-ruralia-teal-text">
              {geocercaEditandoId
                ? "Editando geocerca"
                : "Trazando una geocerca"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Coloca un pin en el mapa (clic o búsqueda), ajústalo y pulsa
              “Añadir como punto”. Con 3 o más puntos se cierra la zona.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">
                  Nombre
                </span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  placeholder="Ej. Predio norte, zona de siembra…"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">
                  Descripción (opcional)
                </span>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2"
                  placeholder="Notas de la zona"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-sm font-medium text-zinc-700">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${
                      color === c
                        ? "border-zinc-900"
                        : "border-white shadow-sm"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">
                  Buscar un lugar para el pin
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    ref={inputLugarRef}
                    value={busquedaLugar}
                    onChange={(e) => setBusquedaLugar(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 py-2 pl-10 pr-3 text-sm"
                    placeholder="Ej. vereda, predio o municipio"
                  />
                </div>
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Elige un resultado o haz clic en el mapa. El pin no se agrega
                hasta que pulses “Añadir como punto”.
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={latitudManual}
                onChange={(e) => setLatitudManual(e.target.value)}
                inputMode="decimal"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Latitud (ej. 4.570868)"
              />
              <input
                value={longitudManual}
                onChange={(e) => setLongitudManual(e.target.value)}
                inputMode="decimal"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="Longitud (ej. -74.297333)"
              />
              <button
                type="button"
                onClick={agregarPuntoManual}
                className="rounded-xl border border-ruralia-teal-border bg-white px-3 py-2 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
              >
                Añadir punto
              </button>
            </div>

            {puntos.length ? (
              <ol className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
                {puntos.map((punto, indice) => (
                  <li
                    key={`${punto.latitud}-${punto.longitud}-${indice}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5"
                  >
                    <span className="font-medium text-zinc-700">
                      {indice + 1}.
                    </span>
                    <span className="flex-1 font-mono text-xs text-zinc-600">
                      {formatearCoord(punto.latitud)},{" "}
                      {formatearCoord(punto.longitud)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarPunto(indice)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Aún no hay puntos. Coloca un pin en el mapa o captura
                coordenadas.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={guardando || puntos.length < 3 || !nombre.trim()}
                onClick={() => void guardarGeocerca()}
                className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : geocercaEditandoId
                    ? "Guardar cambios"
                    : "Guardar geocerca"}
              </button>
              <button
                type="button"
                disabled={guardando || puntos.length === 0}
                onClick={() => setPuntos((prev) => prev.slice(0, -1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Deshacer último
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={cancelarDibujo}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        <MapaTerritorioProyecto
          veredas={veredas}
          geocercas={geocercas}
          puntosBorrador={puntos}
          colorBorrador={color}
          geocercaActivaId={geocercaActivaId}
          modoDibujo={modoDibujo}
          pinPendiente={modoDibujo ? pinPendiente : null}
          centrarPinKey={centrarPinKey}
          onClickMapa={modoDibujo ? colocarPin : undefined}
          onSeleccionarGeocerca={
            modoDibujo ? undefined : (id) => setGeocercaActivaId(id)
          }
          onMoverPunto={(indice, latitud, longitud) => {
            setPuntos((prev) =>
              prev.map((punto, i) =>
                i === indice ? { latitud, longitud } : punto,
              ),
            );
          }}
          onMoverPin={(latitud, longitud) => {
            setPinPendiente({ latitud, longitud });
          }}
          onConfirmarPin={agregarDesdePin}
          onCancelarPin={() => {
            setPinPendiente(null);
            setBusquedaLugar("");
          }}
        />

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-ruralia-teal" />
            Vereda del proyecto
          </span>
          <span className="flex items-center gap-1.5">
            <Pentagon className="h-3.5 w-3.5 text-ruralia-teal-text" />
            Geocerca (zona trazada)
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-ruralia-teal-text" />
            Pin para añadir un punto
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <h3 className="font-semibold text-zinc-900">Geocercas del proyecto</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Estas zonas quedan guardadas solo en este proyecto. Más adelante
          servirán de base para croquis de campo.
        </p>

        {geocercas.length ? (
          <ul className="mt-4 divide-y divide-zinc-100">
            {geocercas.map((geocerca) => {
              const activa = geocerca.id === geocercaActivaId;
              return (
                <li
                  key={geocerca.id}
                  className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    activa ? "rounded-xl bg-ruralia-teal-soft/40 px-3" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setGeocercaActivaId(geocerca.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: geocerca.color }}
                      />
                      {geocerca.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {geocerca.puntos.length} puntos
                      {geocerca.descripcion
                        ? ` · ${geocerca.descripcion}`
                        : ""}
                    </p>
                  </button>
                  {puedeGestionar ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => iniciarEdicion(geocerca)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void eliminarGeocerca(geocerca)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Todavía no hay geocercas.{" "}
            {puedeGestionar
              ? "Usa “Nueva geocerca” y marca la zona en el mapa."
              : "Cuando se tracen, aparecerán aquí."}
          </p>
        )}
      </section>
    </div>
  );
}
