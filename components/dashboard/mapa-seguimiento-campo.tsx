"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cargarGoogleMapsBase } from "@/lib/google-maps";
import type { MockSeguimientoCampo } from "@/lib/mock/dashboard-mock";

interface MapaSeguimientoCampoProps {
  seguimiento: MockSeguimientoCampo;
}

const COLOR_ESTADO = {
  COMPLETADA: "#059669",
  EN_PROGRESO: "#0ea5e9",
  PLANIFICADA: "#a1a1aa",
} as const;

const ETIQUETA_ESTADO = {
  COMPLETADA: "Completada",
  EN_PROGRESO: "En progreso",
  PLANIFICADA: "Planificada",
} as const;

/**
 * Mapa de jornadas georreferenciadas de un proyecto (orden cronológico).
 * Fuente real: Jornada.latitud/longitud + Jornada.estado
 */
export function MapaSeguimientoCampo({ seguimiento }: MapaSeguimientoCampoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const jornadas = seguimiento.jornadas;

  useEffect(() => {
    if (!contenedorRef.current || jornadas.length === 0) return;

    let cancelado = false;
    const infoWindows: google.maps.InfoWindow[] = [];

    cargarGoogleMapsBase()
      .then((google) => {
        if (cancelado || !contenedorRef.current) return;

        const puntosRuta = jornadas.map((j) => ({
          lat: j.latitud,
          lng: j.longitud,
        }));

        const bounds = new google.maps.LatLngBounds();
        puntosRuta.forEach((p) => bounds.extend(p));

        const mapa = new google.maps.Map(contenedorRef.current, {
          center: bounds.getCenter(),
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        new google.maps.Polyline({
          path: puntosRuta,
          geodesic: true,
          strokeColor: "#d4d4d8",
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map: mapa,
        });

        const indiceEnCurso = jornadas.findIndex((j) => j.estado === "EN_PROGRESO");
        const ultimoAvance =
          indiceEnCurso >= 0
            ? indiceEnCurso + 1
            : jornadas.filter((j) => j.estado === "COMPLETADA").length;

        if (ultimoAvance >= 2) {
          new google.maps.Polyline({
            path: puntosRuta.slice(0, ultimoAvance),
            geodesic: true,
            strokeColor: "#059669",
            strokeOpacity: 1,
            strokeWeight: 4,
            map: mapa,
          });
        }

        jornadas.forEach((jornada, index) => {
          const posicion = { lat: jornada.latitud, lng: jornada.longitud };
          const marker = new google.maps.Marker({
            position: posicion,
            map: mapa,
            label: {
              text: String(index + 1),
              color: "#fff",
              fontSize: "11px",
              fontWeight: "600",
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 11,
              fillColor: COLOR_ESTADO[jornada.estado],
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            },
            title: jornada.nombre,
          });

          const info = new google.maps.InfoWindow({
            content: `
              <div style="font-family:system-ui;max-width:220px;padding:4px">
                <p style="font-weight:600;margin:0 0 4px">${jornada.nombre}</p>
                <p style="font-size:11px;color:#666;margin:0 0 6px">${ETIQUETA_ESTADO[jornada.estado]}${jornada.fecha ? ` · ${jornada.fecha}` : ""}</p>
                <p style="font-size:12px;margin:0">${jornada.descripcion}</p>
              </div>
            `,
          });

          infoWindows.push(info);
          marker.addListener("click", () => {
            infoWindows.forEach((iw) => iw.close());
            info.open({ map: mapa, anchor: marker });
          });
        });

        mapa.fitBounds(bounds, 56);
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
      infoWindows.forEach((iw) => iw.close());
    };
  }, [jornadas]);

  if (jornadas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No hay jornadas georreferenciadas para este proyecto.
      </p>
    );
  }

  const primera = jornadas[0];
  const ultima = jornadas[jornadas.length - 1];

  return (
    <div className="relative">
      {!listo && !error ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-zinc-50/80">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      ) : null}

      {error ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Mapa no disponible</p>
            <p className="mt-0.5 text-xs opacity-90">{error}</p>
          </div>
        </div>
      ) : null}

      <div
        ref={contenedorRef}
        className="h-[320px] w-full rounded-xl border border-emerald-100 bg-zinc-100 lg:h-[380px]"
        aria-label="Mapa de jornadas georreferenciadas"
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Primera jornada
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{primera.nombre}</p>
          <p className="text-xs text-zinc-500">{primera.descripcion}</p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Última jornada programada
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{ultima.nombre}</p>
          <p className="text-xs text-zinc-500">{ultima.descripcion}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-6 bg-emerald-600" />
          Avance ({seguimiento.progresoAvancePorcentaje}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
          Completada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-sky-500" />
          En progreso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-zinc-400" />
          Planificada
        </span>
      </div>

      <ol className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
        {jornadas.map((jornada, index) => (
          <li key={jornada.jornadaId} className="flex items-start gap-3 text-sm">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: COLOR_ESTADO[jornada.estado] }}
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-zinc-900">{jornada.nombre}</p>
              <p className="text-xs text-zinc-500">
                {ETIQUETA_ESTADO[jornada.estado]}
                {jornada.fecha ? ` · ${jornada.fecha}` : ""} — {jornada.descripcion}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
