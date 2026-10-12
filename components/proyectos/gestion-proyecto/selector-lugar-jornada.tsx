"use client";

import { MapPin, Pentagon } from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { PreviewLugarJornada } from "./preview-lugar-jornada";
import type { Geocerca, MunicipioResumen, VeredaResumen } from "@/lib/types";

export type TipoLugarJornada = "municipio" | "vereda" | "geocerca";

export function nombreLugarJornada(jornada: {
  vereda?: { nombre: string } | null;
  municipio?: { nombre: string } | null;
  geocerca?: { nombre: string } | null;
}): string {
  if (jornada.geocerca?.nombre) return jornada.geocerca.nombre;
  const partes = [jornada.vereda?.nombre, jornada.municipio?.nombre].filter(
    Boolean,
  );
  return partes.join(" · ") || "Sin lugar";
}

interface SelectorLugarJornadaProps {
  tipo: TipoLugarJornada;
  onTipo: (tipo: TipoLugarJornada) => void;
  municipios: MunicipioResumen[];
  veredas: VeredaResumen[];
  geocercas: Geocerca[];
  municipioId: string;
  veredaId: string;
  geocercaId: string;
  onMunicipioId: (id: string) => void;
  onVeredaId: (id: string) => void;
  onGeocercaId: (id: string) => void;
  disabled?: boolean;
}

export function SelectorLugarJornada({
  tipo,
  onTipo,
  municipios,
  veredas,
  geocercas,
  municipioId,
  veredaId,
  geocercaId,
  onMunicipioId,
  onVeredaId,
  onGeocercaId,
  disabled,
}: SelectorLugarJornadaProps) {
  const municipio = municipios.find((item) => item.id === municipioId);
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
          onClick={() => onTipo("municipio")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            tipo === "municipio"
              ? "bg-ruralia-teal text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Municipio
        </button>
        {veredas.length ? (
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
        ) : null}
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
      {tipo === "municipio" ? (
        <div className="space-y-3">
          <SelectorDesplegable
            required
            value={municipioId}
            onChange={onMunicipioId}
            opciones={municipios.map((item) => ({
              id: item.id,
              nombre: item.departamentoNombre
                ? `${item.nombre}, ${item.departamentoNombre}`
                : item.nombre,
            }))}
            placeholder="Seleccionar municipio"
            mensajeSinOpciones="Sin municipios asignados al proyecto"
            icono={MapPin}
            disabled={disabled}
          />
          {veredas.length ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">
                Vereda (opcional)
              </span>
              <SelectorDesplegable
                value={veredaId}
                onChange={onVeredaId}
                opciones={veredas.map((item) => ({
                  id: item.id,
                  nombre: item.nombre,
                }))}
                placeholder="Sin vereda"
                permitirVacio
                etiquetaVacio="Sin vereda"
                icono={MapPin}
                disabled={disabled}
              />
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Este proyecto no tiene veredas. El municipio basta como lugar.
            </p>
          )}
        </div>
      ) : null}
      {tipo === "vereda" ? (
        <SelectorDesplegable
          required
          value={veredaId}
          onChange={onVeredaId}
          opciones={veredas.map((item) => ({
            id: item.id,
            nombre: item.nombre,
          }))}
          placeholder="Seleccionar vereda"
          mensajeSinOpciones="Sin veredas asignadas al proyecto"
          icono={MapPin}
          disabled={disabled}
        />
      ) : null}
      {tipo === "geocerca" ? (
        <SelectorDesplegable
          required
          value={geocercaId}
          onChange={onGeocercaId}
          opciones={geocercas.map((item) => ({
            id: item.id,
            nombre: item.nombre,
          }))}
          placeholder="Seleccionar geocerca"
          mensajeSinOpciones="No hay geocercas. Créalas en Territorio."
          icono={Pentagon}
          disabled={disabled}
        />
      ) : null}
      {tipo !== "geocerca" && vereda ? (
        veredaConPunto ? (
          <PreviewLugarJornada
            modo="vereda"
            titulo={vereda.nombre}
            detalle={
              municipio
                ? `Vereda en ${municipio.nombre}`
                : "Ubicación de la vereda"
            }
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
