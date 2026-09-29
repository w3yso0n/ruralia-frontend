"use client";

import { MapPin, Pentagon } from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { PreviewLugarJornada } from "./preview-lugar-jornada";
import type { Geocerca, VeredaResumen } from "@/lib/types";

export type TipoLugarJornada = "vereda" | "geocerca";

export function nombreLugarJornada(jornada: {
  vereda?: { nombre: string } | null;
  geocerca?: { nombre: string } | null;
}): string {
  return jornada.geocerca?.nombre ?? jornada.vereda?.nombre ?? "Sin lugar";
}

interface SelectorLugarJornadaProps {
  tipo: TipoLugarJornada;
  onTipo: (tipo: TipoLugarJornada) => void;
  veredas: VeredaResumen[];
  geocercas: Geocerca[];
  veredaId: string;
  geocercaId: string;
  onVeredaId: (id: string) => void;
  onGeocercaId: (id: string) => void;
  disabled?: boolean;
}

export function SelectorLugarJornada({
  tipo,
  onTipo,
  veredas,
  geocercas,
  veredaId,
  geocercaId,
  onVeredaId,
  onGeocercaId,
  disabled,
}: SelectorLugarJornadaProps) {
  const vereda = veredas.find((item) => item.id === veredaId);
  const geocerca = geocercas.find((item) => item.id === geocercaId);
  const veredaConPunto =
    vereda?.latitud != null &&
    vereda.longitud != null &&
    Number.isFinite(Number(vereda.latitud)) &&
    Number.isFinite(Number(vereda.longitud));

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">
        Lugar *
      </span>
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTipo("vereda")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            tipo === "vereda"
              ? "bg-ruralia-teal text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Vereda
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onTipo("geocerca")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            tipo === "geocerca"
              ? "bg-ruralia-teal text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Geocerca
        </button>
      </div>
      {tipo === "vereda" ? (
        <SelectorDesplegable
          required
          value={veredaId}
          onChange={onVeredaId}
          opciones={veredas.map((vereda) => ({
            id: vereda.id,
            nombre: vereda.nombre,
          }))}
          placeholder="Seleccionar vereda"
          mensajeSinOpciones="Sin veredas asignadas al proyecto"
          icono={MapPin}
          disabled={disabled}
        />
      ) : (
        <SelectorDesplegable
          required
          value={geocercaId}
          onChange={onGeocercaId}
          opciones={geocercas.map((geocerca) => ({
            id: geocerca.id,
            nombre: geocerca.nombre,
          }))}
          placeholder="Seleccionar geocerca"
          mensajeSinOpciones="No hay geocercas. Créalas en Territorio."
          icono={Pentagon}
          disabled={disabled}
        />
      )}
      {tipo === "vereda" && vereda ? (
        veredaConPunto ? (
          <PreviewLugarJornada
            modo="vereda"
            titulo={vereda.nombre}
            detalle="Ubicación de la vereda"
            latitud={vereda.latitud}
            longitud={vereda.longitud}
          />
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Esta vereda no tiene un punto en el mapa. Solo se guarda por nombre.
          </p>
        )
      ) : null}
      {tipo === "geocerca" && geocerca ? (
        <PreviewLugarJornada
          modo="geocerca"
          titulo={geocerca.nombre}
          detalle="Zona trazada en Territorio"
          puntos={geocerca.puntos}
          color={geocerca.color}
        />
      ) : null}
    </div>
  );
}
