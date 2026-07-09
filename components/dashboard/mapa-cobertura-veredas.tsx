"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { cargarGoogleMapsBase } from "@/lib/google-maps";
import type { MockVeredaCobertura } from "@/lib/mock/dashboard-mock";

interface MapaCoberturaVeredasProps {
  veredas: MockVeredaCobertura[];
}

/**
 * Mapa de cobertura territorial: veredas con proyectos ACTIVOS.
 * Fuente real: proyecto_veredas + centroide AVG(jornadas.lat/lng) por vereda.
 * Datos mock → lib/mock/dashboard-mock.ts → veredasCobertura
 */
export function MapaCoberturaVeredas({ veredas }: MapaCoberturaVeredasProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!contenedorRef.current || veredas.length === 0) return;

    let cancelado = false;
    const infoWindows: google.maps.InfoWindow[] = [];

    cargarGoogleMapsBase()
      .then((google) => {
        if (cancelado || !contenedorRef.current) return;

        const centro = {
          lat:
            veredas.reduce((sum, v) => sum + v.latitud, 0) / veredas.length,
          lng:
            veredas.reduce((sum, v) => sum + v.longitud, 0) / veredas.length,
        };

        const mapa = new google.maps.Map(contenedorRef.current, {
          center: centro,
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapaRef.current = mapa;
        const bounds = new google.maps.LatLngBounds();

        veredas.forEach((vereda) => {
          const posicion = { lat: vereda.latitud, lng: vereda.longitud };
          bounds.extend(posicion);

          const marker = new google.maps.Marker({
            position: posicion,
            map: mapa,
            title: vereda.nombre,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#059669",
              fillOpacity: 0.95,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });

          const proyectosHtml = vereda.proyectosActivos
            .map(
              (p) =>
                `<li><strong>${p.nombre}</strong> — ${p.progresoPorcentaje}% · ${p.beneficiarios} benef.</li>`,
            )
            .join("");

          const info = new google.maps.InfoWindow({
            content: `
              <div style="font-family:system-ui;max-width:240px;padding:4px">
                <p style="font-weight:600;margin:0 0 4px">${vereda.nombre}</p>
                <p style="font-size:12px;color:#666;margin:0 0 8px">${vereda.municipio}, ${vereda.departamento}</p>
                <ul style="font-size:12px;margin:0;padding-left:16px">${proyectosHtml}</ul>
              </div>
            `,
          });

          infoWindows.push(info);
          marker.addListener("click", () => {
            infoWindows.forEach((iw) => iw.close());
            info.open({ map: mapa, anchor: marker });
          });
        });

        mapa.fitBounds(bounds, 48);
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
  }, [veredas]);

  if (veredas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay veredas con cobertura activa.</p>
    );
  }

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
            <p className="mt-1 text-xs opacity-75">
              Configura <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> con Maps
              JavaScript API habilitada.
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={contenedorRef}
        className="h-[320px] w-full rounded-xl border border-emerald-100 bg-zinc-100 lg:h-[380px]"
        aria-label="Mapa de cobertura por veredas"
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
          Vereda con proyecto activo ({veredas.length})
        </span>
      </div>
    </div>
  );
}
