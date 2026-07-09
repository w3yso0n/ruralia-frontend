"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  GOOGLE_MAP_ID,
  cargarGoogleMapsDashboard,
  crearContenidoMarcadorCircular,
} from "@/lib/google-maps";
import type { MockVeredaCobertura } from "@/lib/mock/dashboard-mock";
import type { EstadoProyecto } from "@/lib/types";

interface MapaCoberturaVeredasProps {
  veredas: MockVeredaCobertura[];
}

interface FilaProyectoCobertura {
  proyectoId: string;
  nombre: string;
  estado: EstadoProyecto;
  vereda: string;
  municipio: string;
  departamento: string;
}

function veredaTieneProyectoActivo(vereda: MockVeredaCobertura): boolean {
  return vereda.proyectos.some((p) => p.estado === "ACTIVO");
}

function veredaTieneProyectoSuspendido(vereda: MockVeredaCobertura): boolean {
  return vereda.proyectos.some((p) => p.estado === "SUSPENDIDO");
}

function colorMarcadorVereda(vereda: MockVeredaCobertura): string {
  if (veredaTieneProyectoActivo(vereda)) return "#42827A";
  if (veredaTieneProyectoSuspendido(vereda)) return "#dc2626";
  return "#a1a1aa";
}

function etiquetaEstado(estado: EstadoProyecto): string {
  switch (estado) {
    case "ACTIVO":
      return "Activo";
    case "SUSPENDIDO":
      return "Suspendido";
    case "COMPLETADO":
      return "Completado";
    case "BORRADOR":
      return "Borrador";
  }
}

function claseBadgeEstado(estado: EstadoProyecto): string {
  if (estado === "ACTIVO") {
    return "border-ruralia-teal/40 bg-ruralia-teal-soft text-ruralia-teal-text";
  }
  if (estado === "SUSPENDIDO") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function estilosBadgeInfo(estado: EstadoProyecto): { bg: string; color: string } {
  if (estado === "ACTIVO") return { bg: "#eef3f2", color: "#2d524d" };
  if (estado === "SUSPENDIDO") return { bg: "#fef2f2", color: "#b91c1c" };
  return { bg: "#f4f4f5", color: "#71717a" };
}

/**
 * Mapa de cobertura territorial: veredas con proyectos activos e inactivos.
 * Fuente real: proyecto_veredas + centroide AVG(jornadas.lat/lng) por vereda.
 * Datos mock → lib/mock/dashboard-mock.ts → veredasCobertura
 */
export function MapaCoberturaVeredas({ veredas }: MapaCoberturaVeredasProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const filasProyectos = useMemo<FilaProyectoCobertura[]>(() => {
    return veredas.flatMap((vereda) =>
      vereda.proyectos.map((proyecto) => ({
        proyectoId: proyecto.proyectoId,
        nombre: proyecto.nombre,
        estado: proyecto.estado,
        vereda: vereda.nombre,
        municipio: vereda.municipio,
        departamento: vereda.departamento,
      })),
    );
  }, [veredas]);

  const conteoActivos = filasProyectos.filter((p) => p.estado === "ACTIVO").length;
  const conteoInactivos = filasProyectos.length - conteoActivos;

  useEffect(() => {
    if (!contenedorRef.current || veredas.length === 0) return;

    let cancelado = false;
    const infoWindows: google.maps.InfoWindow[] = [];
    const marcadores: google.maps.marker.AdvancedMarkerElement[] = [];

    cargarGoogleMapsDashboard()
      .then(({ Map, InfoWindow, LatLngBounds, AdvancedMarkerElement }) => {
        if (cancelado || !contenedorRef.current) return;

        const centro = {
          lat:
            veredas.reduce((sum, v) => sum + v.latitud, 0) / veredas.length,
          lng:
            veredas.reduce((sum, v) => sum + v.longitud, 0) / veredas.length,
        };

        const mapa = new Map(contenedorRef.current, {
          center: centro,
          zoom: 10,
          mapId: GOOGLE_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapaRef.current = mapa;
        const bounds = new LatLngBounds();

        veredas.forEach((vereda) => {
          const posicion = { lat: vereda.latitud, lng: vereda.longitud };
          bounds.extend(posicion);

          const marker = new AdvancedMarkerElement({
            map: mapa,
            position: posicion,
            title: vereda.nombre,
            content: crearContenidoMarcadorCircular(colorMarcadorVereda(vereda)),
          });

          marcadores.push(marker);

          const proyectosHtml = vereda.proyectos
            .map((p) => {
              const badge = estilosBadgeInfo(p.estado);
              return `<li style="margin-bottom:4px">
                <strong>${p.nombre}</strong>
                <span style="display:inline-block;margin-left:6px;font-size:10px;padding:1px 6px;border-radius:999px;background:${badge.bg};color:${badge.color}">
                  ${etiquetaEstado(p.estado)}
                </span>
                <br />
                <span style="font-size:11px;color:#666">${p.progresoPorcentaje}% · ${p.beneficiarios} benef.</span>
              </li>`;
            })
            .join("");

          const info = new InfoWindow({
            content: `
              <div style="font-family:system-ui;max-width:260px;padding:4px">
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
      marcadores.forEach((marker) => {
        marker.map = null;
      });
    };
  }, [veredas]);

  if (veredas.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No hay veredas con cobertura registrada.</p>
    );
  }

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
              JavaScript API habilitada.
            </p>
          </div>
        </div>
      ) : null}

      <div
        ref={contenedorRef}
        className="h-[320px] w-full rounded-xl border border-ruralia-teal-border bg-zinc-100 lg:h-[380px]"
        aria-label="Mapa de cobertura por veredas"
      />

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-ruralia-teal" />
          Activo ({veredas.filter(veredaTieneProyectoActivo).length})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-600" />
          Suspendido (
          {veredas.filter((v) => veredaTieneProyectoSuspendido(v) && !veredaTieneProyectoActivo(v)).length}
          )
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-ruralia-teal-border">
        <div className="border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-2.5">
          <p className="text-sm font-semibold text-zinc-900">Proyectos en el mapa</p>
          <p className="text-xs text-zinc-500">
            {conteoActivos} activos · {conteoInactivos} inactivos
          </p>
        </div>
        <ul className="divide-y divide-ruralia-teal-border">
          {filasProyectos.map((fila) => (
            <li
              key={`${fila.proyectoId}-${fila.vereda}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {fila.nombre}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {fila.vereda} · {fila.municipio}, {fila.departamento}
                </p>
              </div>
              <span
                className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${claseBadgeEstado(fila.estado)}`}
              >
                {etiquetaEstado(fila.estado)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
