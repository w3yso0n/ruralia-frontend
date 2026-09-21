"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  CENTRO_COLOMBIA,
  GOOGLE_MAP_ID,
  cargarGoogleMapsDashboard,
  crearContenidoMarcadorCircular,
  crearContenidoMarcadorPin,
} from "@/lib/google-maps";
import type { Geocerca, PuntoGeocerca, VeredaResumen } from "@/lib/types";

interface MapaTerritorioProyectoProps {
  veredas: VeredaResumen[];
  geocercas: Geocerca[];
  puntosBorrador: PuntoGeocerca[];
  colorBorrador: string;
  geocercaActivaId: string | null;
  modoDibujo: boolean;
  pinPendiente?: PuntoGeocerca | null;
  centrarPinKey?: number;
  onClickMapa?: (latitud: number, longitud: number) => void;
  onSeleccionarGeocerca?: (id: string) => void;
  onMoverPunto?: (indice: number, latitud: number, longitud: number) => void;
  onMoverPin?: (latitud: number, longitud: number) => void;
  onConfirmarPin?: () => void;
  onCancelarPin?: () => void;
}

function puntosAPath(
  puntos: PuntoGeocerca[],
): google.maps.LatLngLiteral[] {
  return puntos.map((p) => ({ lat: p.latitud, lng: p.longitud }));
}

function coordsDePosicion(
  pos: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude,
): { lat: number; lng: number } | null {
  const lat =
    typeof (pos as google.maps.LatLng).lat === "function"
      ? (pos as google.maps.LatLng).lat()
      : (pos as google.maps.LatLngLiteral).lat;
  const lng =
    typeof (pos as google.maps.LatLng).lng === "function"
      ? (pos as google.maps.LatLng).lng()
      : (pos as google.maps.LatLngLiteral).lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export function MapaTerritorioProyecto({
  veredas,
  geocercas,
  puntosBorrador,
  colorBorrador,
  geocercaActivaId,
  modoDibujo,
  pinPendiente = null,
  centrarPinKey = 0,
  onClickMapa,
  onSeleccionarGeocerca,
  onMoverPunto,
  onMoverPin,
  onConfirmarPin,
  onCancelarPin,
}: MapaTerritorioProyectoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<Awaited<
    ReturnType<typeof cargarGoogleMapsDashboard>
  > | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const marcadoresVeredaRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    [],
  );
  const infoVeredasRef = useRef<google.maps.InfoWindow[]>([]);
  const poligonosRef = useRef<google.maps.Polygon[]>([]);
  const listenersPoligonosRef = useRef<google.maps.MapsEventListener[]>([]);
  const lineaBorradorRef = useRef<google.maps.Polyline | null>(null);
  const poligonoBorradorRef = useRef<google.maps.Polygon | null>(null);
  const verticesBorradorRef = useRef<
    google.maps.marker.AdvancedMarkerElement[]
  >([]);
  const listenersVerticesRef = useRef<google.maps.MapsEventListener[]>([]);
  const pinRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const listenersPinRef = useRef<google.maps.MapsEventListener[]>([]);
  const onClickMapaRef = useRef(onClickMapa);
  const onSeleccionarGeocercaRef = useRef(onSeleccionarGeocerca);
  const onMoverPuntoRef = useRef(onMoverPunto);
  const onMoverPinRef = useRef(onMoverPin);
  const pinPendienteRef = useRef(pinPendiente);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const vistaInicialAjustadaRef = useRef(false);

  onClickMapaRef.current = onClickMapa;
  onSeleccionarGeocercaRef.current = onSeleccionarGeocerca;
  onMoverPuntoRef.current = onMoverPunto;
  onMoverPinRef.current = onMoverPin;
  pinPendienteRef.current = pinPendiente;

  useEffect(() => {
    if (!contenedorRef.current) return;

    let cancelado = false;

    cargarGoogleMapsDashboard()
      .then((libs) => {
        if (cancelado || !contenedorRef.current) return;

        libsRef.current = libs;
        const mapa = new libs.Map(contenedorRef.current, {
          center: CENTRO_COLOMBIA,
          zoom: 6,
          mapId: GOOGLE_MAP_ID,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });

        mapaRef.current = mapa;
        clickListenerRef.current = mapa.addListener(
          "click",
          (evento: google.maps.MapMouseEvent) => {
            const latLng = evento.latLng;
            if (!latLng) return;
            onClickMapaRef.current?.(latLng.lat(), latLng.lng());
          },
        );

        setListo(true);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el mapa",
          );
        }
      });

    return () => {
      cancelado = true;
      clickListenerRef.current?.remove();
      clickListenerRef.current = null;
      listenersPinRef.current.forEach((l) => l.remove());
      listenersPinRef.current = [];
      if (pinRef.current) {
        pinRef.current.map = null;
        pinRef.current = null;
      }
      mapaRef.current = null;
      libsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo) return;
    mapa.setOptions({
      draggableCursor: modoDibujo ? "crosshair" : undefined,
    });
  }, [modoDibujo, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo) return;

    marcadoresVeredaRef.current.forEach((m) => {
      m.map = null;
    });
    marcadoresVeredaRef.current = [];
    infoVeredasRef.current.forEach((iw) => iw.close());
    infoVeredasRef.current = [];

    veredas.forEach((vereda) => {
      if (vereda.latitud == null || vereda.longitud == null) return;
      const posicion = { lat: vereda.latitud, lng: vereda.longitud };
      const marker = new libs.AdvancedMarkerElement({
        map: mapa,
        position: posicion,
        title: vereda.nombre,
        content: crearContenidoMarcadorCircular("#42827A", {
          tamano: 16,
        }),
        zIndex: 1,
      });
      const info = new libs.InfoWindow({
        content: `<div style="font-family:system-ui;padding:2px 4px">
          <p style="margin:0;font-weight:600">${vereda.nombre}</p>
          <p style="margin:2px 0 0;font-size:11px;color:#666">Vereda del proyecto</p>
        </div>`,
      });
      marker.addListener("click", () => {
        infoVeredasRef.current.forEach((iw) => iw.close());
        info.open({ map: mapa, anchor: marker });
      });
      marcadoresVeredaRef.current.push(marker);
      infoVeredasRef.current.push(info);
    });
  }, [veredas, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo) return;

    listenersPoligonosRef.current.forEach((l) => l.remove());
    listenersPoligonosRef.current = [];
    poligonosRef.current.forEach((p) => p.setMap(null));
    poligonosRef.current = [];

    geocercas.forEach((geocerca) => {
      if (modoDibujo && geocerca.id === geocercaActivaId) return;
      if (geocerca.puntos.length < 3) return;
      const activa = geocerca.id === geocercaActivaId;
      const polygon = new libs.Polygon({
        map: mapa,
        paths: puntosAPath(geocerca.puntos),
        strokeColor: geocerca.color,
        strokeOpacity: activa ? 1 : 0.85,
        strokeWeight: activa ? 3 : 2,
        fillColor: geocerca.color,
        fillOpacity: activa ? 0.38 : 0.22,
        clickable: !modoDibujo,
        zIndex: activa ? 4 : 2,
      });
      const listener = polygon.addListener("click", () => {
        onSeleccionarGeocercaRef.current?.(geocerca.id);
      });
      listenersPoligonosRef.current.push(listener);
      poligonosRef.current.push(polygon);
    });
  }, [geocercas, geocercaActivaId, modoDibujo, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo) return;

    lineaBorradorRef.current?.setMap(null);
    lineaBorradorRef.current = null;
    poligonoBorradorRef.current?.setMap(null);
    poligonoBorradorRef.current = null;
    listenersVerticesRef.current.forEach((l) => l.remove());
    listenersVerticesRef.current = [];
    verticesBorradorRef.current.forEach((m) => {
      m.map = null;
    });
    verticesBorradorRef.current = [];

    if (!modoDibujo) return;

    const path = puntosAPath(puntosBorrador);

    if (puntosBorrador.length >= 3) {
      poligonoBorradorRef.current = new libs.Polygon({
        map: mapa,
        paths: path,
        strokeColor: colorBorrador,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: colorBorrador,
        fillOpacity: 0.28,
        clickable: false,
        zIndex: 5,
      });
    } else if (puntosBorrador.length === 2) {
      lineaBorradorRef.current = new libs.Polyline({
        map: mapa,
        path,
        strokeColor: colorBorrador,
        strokeOpacity: 1,
        strokeWeight: 2,
        clickable: false,
        zIndex: 5,
      });
    }

    puntosBorrador.forEach((punto, indice) => {
      const marker = new libs.AdvancedMarkerElement({
        map: mapa,
        position: { lat: punto.latitud, lng: punto.longitud },
        title: `Punto ${indice + 1}`,
        content: crearContenidoMarcadorCircular(colorBorrador, {
          etiqueta: String(indice + 1),
          tamano: 24,
        }),
        gmpDraggable: true,
        zIndex: 8,
      });
      const listener = marker.addListener("dragend", () => {
        const pos = marker.position;
        if (!pos) return;
        const coords = coordsDePosicion(pos);
        if (!coords) return;
        onMoverPuntoRef.current?.(indice, coords.lat, coords.lng);
      });
      listenersVerticesRef.current.push(listener);
      verticesBorradorRef.current.push(marker);
    });
  }, [puntosBorrador, colorBorrador, modoDibujo, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo) return;

    const limpiarPin = () => {
      listenersPinRef.current.forEach((l) => l.remove());
      listenersPinRef.current = [];
      if (pinRef.current) {
        pinRef.current.map = null;
        pinRef.current = null;
      }
    };

    if (!modoDibujo || !pinPendiente) {
      limpiarPin();
      return;
    }

    const posicion = {
      lat: pinPendiente.latitud,
      lng: pinPendiente.longitud,
    };

    if (pinRef.current) {
      pinRef.current.position = posicion;
      return;
    }

    const marker = new libs.AdvancedMarkerElement({
      map: mapa,
      position: posicion,
      title: "Pin para añadir a la geocerca. Arrástralo para ajustar.",
      content: crearContenidoMarcadorPin(colorBorrador),
      gmpDraggable: true,
      zIndex: 20,
    });
    const listener = marker.addListener("dragend", () => {
      const pos = marker.position;
      if (!pos) return;
      const coords = coordsDePosicion(pos);
      if (!coords) return;
      onMoverPinRef.current?.(coords.lat, coords.lng);
    });
    listenersPinRef.current.push(listener);
    pinRef.current = marker;
  }, [pinPendiente, modoDibujo, listo]);

  useEffect(() => {
    if (!pinRef.current || !modoDibujo) return;
    pinRef.current.content = crearContenidoMarcadorPin(colorBorrador);
  }, [colorBorrador, modoDibujo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !listo || !centrarPinKey) return;
    const pin = pinPendienteRef.current;
    if (!pin) return;
    mapa.panTo({ lat: pin.latitud, lng: pin.longitud });
    const zoom = mapa.getZoom() ?? 6;
    if (zoom < 14) mapa.setZoom(14);
  }, [centrarPinKey, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo || vistaInicialAjustadaRef.current) return;

    const bounds = new libs.LatLngBounds();
    let hayPuntos = false;

    veredas.forEach((vereda) => {
      if (vereda.latitud == null || vereda.longitud == null) return;
      bounds.extend({ lat: vereda.latitud, lng: vereda.longitud });
      hayPuntos = true;
    });
    geocercas.forEach((geocerca) => {
      geocerca.puntos.forEach((p) => {
        bounds.extend({ lat: p.latitud, lng: p.longitud });
        hayPuntos = true;
      });
    });

    if (hayPuntos) {
      mapa.fitBounds(bounds, 48);
      vistaInicialAjustadaRef.current = true;
    }
  }, [veredas, geocercas, listo]);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo || modoDibujo || !geocercaActivaId) return;
    const geocerca = geocercas.find((g) => g.id === geocercaActivaId);
    if (!geocerca || geocerca.puntos.length < 2) return;
    const bounds = new libs.LatLngBounds();
    geocerca.puntos.forEach((p) => {
      bounds.extend({ lat: p.latitud, lng: p.longitud });
    });
    mapa.fitBounds(bounds, 64);
  }, [geocercaActivaId, geocercas, listo, modoDibujo]);

  return (
    <div className="relative">
      {!listo && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-zinc-50/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Mapa no disponible</p>
            <p className="mt-0.5 text-xs opacity-90">{error}</p>
            <p className="mt-1 text-xs opacity-75">
              Configura <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> con Maps
              JavaScript API habilitada. Mientras tanto puedes añadir puntos
              con latitud y longitud.
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={contenedorRef}
        className="h-[360px] w-full rounded-xl border border-ruralia-teal-border bg-zinc-100 lg:h-[440px]"
        aria-label="Mapa territorial del proyecto"
      />

      {modoDibujo ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
          <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-ruralia-teal-border bg-white/95 p-3 shadow-lg backdrop-blur-sm">
            {pinPendiente ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
                    <MapPin className="h-4 w-4 text-ruralia-teal-text" />
                    Pin listo para agregar
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-zinc-600">
                    {pinPendiente.latitud.toFixed(6)},{" "}
                    {pinPendiente.longitud.toFixed(6)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    Arrástralo para ajustar y luego añádelo como punto de la
                    geocerca.
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={onCancelarPin}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    Quitar pin
                  </button>
                  <button
                    type="button"
                    onClick={onConfirmarPin}
                    className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
                  >
                    Añadir como punto
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                Haz clic en el mapa para colocar un pin. Después podrás
                añadirlo como punto de la geocerca.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
