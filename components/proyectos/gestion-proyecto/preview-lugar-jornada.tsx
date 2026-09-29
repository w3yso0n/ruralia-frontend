"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GOOGLE_MAP_ID,
  cargarGoogleMapsDashboard,
  crearContenidoMarcadorPin,
} from "@/lib/google-maps";
import type { PuntoGeocerca } from "@/lib/types";

const SIN_PUNTOS: PuntoGeocerca[] = [];

interface PreviewLugarJornadaProps {
  titulo: string;
  detalle: string;
  modo: "vereda" | "geocerca";
  latitud?: number | null;
  longitud?: number | null;
  puntos?: PuntoGeocerca[];
  color?: string;
}

function numero(valor: number | null | undefined): number | null {
  if (valor == null) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function PreviewLugarJornada({
  titulo,
  detalle,
  modo,
  latitud,
  longitud,
  puntos = SIN_PUNTOS,
  color = "#42827A",
}: PreviewLugarJornadaProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<Awaited<
    ReturnType<typeof cargarGoogleMapsDashboard>
  > | null>(null);
  const poligonoRef = useRef<google.maps.Polygon | null>(null);
  const marcadorRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  );
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = numero(latitud);
  const lng = numero(longitud);
  const vertices = useMemo(
    () =>
      puntos
        .map((punto) => ({
          lat: numero(punto.latitud),
          lng: numero(punto.longitud),
        }))
        .filter(
          (punto): punto is { lat: number; lng: number } =>
            punto.lat != null && punto.lng != null,
        ),
    [puntos],
  );

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    let cancelado = false;

    void cargarGoogleMapsDashboard()
      .then((libs) => {
        if (cancelado || !contenedorRef.current) return;
        libsRef.current = libs;
        if (!mapaRef.current) {
          mapaRef.current = new libs.Map(contenedorRef.current, {
            center: { lat: 4.57, lng: -74.3 },
            zoom: 6,
            mapId: GOOGLE_MAP_ID,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            gestureHandling: "cooperative",
          });
        }
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
      poligonoRef.current?.setMap(null);
      poligonoRef.current = null;
      if (marcadorRef.current) marcadorRef.current.map = null;
      marcadorRef.current = null;
      mapaRef.current = null;
      libsRef.current = null;
      setListo(false);
    };
  }, []);

  useEffect(() => {
    const mapa = mapaRef.current;
    const libs = libsRef.current;
    if (!mapa || !libs || !listo) return;

    poligonoRef.current?.setMap(null);
    poligonoRef.current = null;
    if (marcadorRef.current) marcadorRef.current.map = null;
    marcadorRef.current = null;

    if (modo === "geocerca" && vertices.length >= 3) {
      poligonoRef.current = new libs.Polygon({
        map: mapa,
        paths: vertices,
        strokeColor: color,
        strokeOpacity: 1,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.32,
        clickable: false,
      });
      const bounds = new libs.LatLngBounds();
      vertices.forEach((punto) => bounds.extend(punto));
      mapa.fitBounds(bounds, 28);
      return;
    }

    if (modo === "vereda" && lat != null && lng != null) {
      marcadorRef.current = new libs.AdvancedMarkerElement({
        map: mapa,
        position: { lat, lng },
        content: crearContenidoMarcadorPin(color),
        title: titulo,
      });
      mapa.setCenter({ lat, lng });
      mapa.setZoom(15);
    }
  }, [modo, lat, lng, vertices, color, titulo, listo]);

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white">
      <div className="relative h-48">
        <div ref={contenedorRef} className="h-full w-full" />
        {error ? (
          <p className="absolute inset-0 flex items-center justify-center bg-white px-4 text-center text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
      <div className="border-t border-ruralia-teal-border px-4 py-2.5">
        <p className="text-sm font-semibold text-zinc-900">{titulo}</p>
        <p className="text-xs text-zinc-500">{detalle}</p>
      </div>
    </div>
  );
}
