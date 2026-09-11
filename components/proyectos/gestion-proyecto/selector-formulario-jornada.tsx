"use client";

import { ClipboardList } from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import type {
  PlantillaFormularioCatalogo,
  TipoJornada,
} from "@/lib/types";

export const CLAVE_FORMULARIO_INDIVIDUAL = "proceso:INDIVIDUAL";
export const CLAVE_FORMULARIO_GRUPAL = "proceso:GRUPAL";

export function claveDesdeJornada(jornada?: {
  tipo?: TipoJornada;
  plantillaFormulario?: { id: string } | null;
}): string {
  if (jornada?.plantillaFormulario?.id) return jornada.plantillaFormulario.id;
  return jornada?.tipo === "GRUPAL"
    ? CLAVE_FORMULARIO_GRUPAL
    : CLAVE_FORMULARIO_INDIVIDUAL;
}

export function resolverSeleccionFormulario(
  clave: string,
  plantillas: PlantillaFormularioCatalogo[],
): { tipo: TipoJornada; plantillaFormularioId: string | null } {
  if (clave === CLAVE_FORMULARIO_GRUPAL) {
    return { tipo: "GRUPAL", plantillaFormularioId: null };
  }
  if (!clave || clave === CLAVE_FORMULARIO_INDIVIDUAL) {
    return { tipo: "INDIVIDUAL", plantillaFormularioId: null };
  }
  const plantilla = plantillas.find((p) => p.id === clave);
  return {
    tipo: plantilla?.tipoPlantilla === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL",
    plantillaFormularioId: clave,
  };
}

function etiquetaTipo(tipo?: string) {
  return tipo === "GRUPAL" ? "Grupal" : "Individual";
}

export function SelectorFormularioJornada({
  value,
  onChange,
  plantillas,
  disabled,
}: {
  value: string;
  onChange: (clave: string) => void;
  plantillas: PlantillaFormularioCatalogo[];
  disabled?: boolean;
}) {
  const opciones = [
    {
      id: CLAVE_FORMULARIO_INDIVIDUAL,
      nombre: "Formulario individual del proceso",
      subtitulo: "El asignado a la meta en el plan",
    },
    {
      id: CLAVE_FORMULARIO_GRUPAL,
      nombre: "Formulario grupal del proceso",
      subtitulo: "Lista de asistencia / filas repetibles",
    },
    ...plantillas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      subtitulo: `Plantilla · ${etiquetaTipo(p.tipoPlantilla)} · v${p.version}`,
    })),
  ];

  const ayuda =
    value === CLAVE_FORMULARIO_GRUPAL
      ? "Usará el formulario grupal asignado al proceso de la meta."
      : value && value !== CLAVE_FORMULARIO_INDIVIDUAL
        ? "Usará esta plantilla publicada, aunque no esté asignada al proceso."
        : "Usará el formulario individual asignado al proceso de la meta.";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">
        Formulario *
      </label>
      <SelectorDesplegable
        value={value}
        onChange={onChange}
        opciones={opciones}
        placeholder="Seleccionar formulario"
        icono={ClipboardList}
        disabled={disabled}
      />
      <p className="mt-1 text-xs text-zinc-500">{ayuda}</p>
    </div>
  );
}
