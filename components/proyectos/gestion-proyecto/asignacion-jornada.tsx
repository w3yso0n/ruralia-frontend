"use client";

import { Building2, UserRound } from "lucide-react";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";

export type DestinoAsignacionJornada = "beneficiario" | "asociacion";

interface OpcionAsignacion {
  id: string;
  nombre: string;
  subtitulo?: string;
}

export function destinoInicialAsignacion(
  beneficiarioIds: string[],
  asociacionIds: string[],
): DestinoAsignacionJornada {
  if (!beneficiarioIds.length && asociacionIds.length) return "asociacion";
  return "beneficiario";
}

export function errorAsignacionJornada(
  destino: DestinoAsignacionJornada,
  beneficiarioIds: string[],
  asociacionIds: string[],
): string | null {
  if (destino === "beneficiario" && !beneficiarioIds.length) {
    return "Debes asignar la jornada al menos a un beneficiario del proyecto";
  }
  if (destino === "asociacion" && !asociacionIds.length) {
    return "Debes asignar la jornada al menos a una asociación del proyecto";
  }
  return null;
}

interface AsignacionJornadaProps {
  beneficiarios: OpcionAsignacion[];
  asociaciones: OpcionAsignacion[];
  destino: DestinoAsignacionJornada;
  beneficiarioIds: string[];
  asociacionIds: string[];
  disabled?: boolean;
  onDestino: (destino: DestinoAsignacionJornada) => void;
  onBeneficiarioIds: (ids: string[]) => void;
  onAsociacionIds: (ids: string[]) => void;
}

export function AsignacionJornada({
  beneficiarios,
  asociaciones,
  destino,
  beneficiarioIds,
  asociacionIds,
  disabled = false,
  onDestino,
  onBeneficiarioIds,
  onAsociacionIds,
}: AsignacionJornadaProps) {
  const sinCatalogo =
    destino === "beneficiario"
      ? beneficiarios.length === 0
      : asociaciones.length === 0;

  return (
    <div className="space-y-3 rounded-2xl border border-ruralia-teal-border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-zinc-800">Asignar jornada a *</p>
        <p className="mt-1 text-xs text-zinc-500">
          Elige beneficiarios del proyecto o asociaciones. La jornada queda
          ligada a uno de los dos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDestino("beneficiario")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
            destino === "beneficiario"
              ? "border-ruralia-teal bg-ruralia-teal-soft text-ruralia-teal-text"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-ruralia-teal-border"
          }`}
        >
          <UserRound className="h-4 w-4 text-ruralia-teal" />
          Beneficiario
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDestino("asociacion")}
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
            destino === "asociacion"
              ? "border-ruralia-teal bg-ruralia-teal-soft text-ruralia-teal-text"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-ruralia-teal-border"
          }`}
        >
          <Building2 className="h-4 w-4 text-ruralia-teal" />
          Asociación
        </button>
      </div>

      {destino === "beneficiario" ? (
        <SelectorCatalogo
          multiple
          opciones={beneficiarios}
          value={beneficiarioIds}
          onChange={onBeneficiarioIds}
          placeholder="Buscar beneficiario del proyecto..."
          mensajeVacio={
            sinCatalogo
              ? "No hay beneficiarios vinculados al proyecto. Agrégalos en Equipo y contraparte."
              : "Selecciona al menos un beneficiario."
          }
        />
      ) : (
        <SelectorCatalogo
          multiple
          opciones={asociaciones}
          value={asociacionIds}
          onChange={onAsociacionIds}
          placeholder="Buscar asociación del proyecto..."
          mensajeVacio={
            sinCatalogo
              ? "No hay asociaciones vinculadas al proyecto. Agrégalas en Equipo y contraparte."
              : "Selecciona al menos una asociación."
          }
        />
      )}
    </div>
  );
}
