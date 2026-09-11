"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  fechaFueraDeProyecto,
  SelectorFechaJornada,
} from "@/components/ui/selector-fecha-jornada";
import { listarCatalogoFormulariosJornada } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ActividadPlan,
  PlantillaFormularioCatalogo,
  TipoJornada,
  VeredaResumen,
} from "@/lib/types";
import { SelectorMetaPlan } from "./selector-meta-plan";
import {
  CLAVE_FORMULARIO_INDIVIDUAL,
  resolverSeleccionFormulario,
  SelectorFormularioJornada,
} from "./selector-formulario-jornada";

interface AgenteOpcion {
  id: string;
  nombre: string;
}

interface FormularioJornadaProps {
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  agentes: AgenteOpcion[];
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    nombre?: string;
    observaciones?: string;
    metaId: string;
    tipo: TipoJornada;
    plantillaFormularioId?: string | null;
    tecnicoResponsableIds: string[];
    requiereRevision: boolean;
  }) => Promise<void>;
}

export function FormularioJornada({
  veredas,
  actividadesPlan,
  agentes,
  fechaInicioProyecto,
  fechaFinProyecto,
  enviando,
  onSubmit,
}: FormularioJornadaProps) {
  const { token } = useAuth();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [veredaId, setVeredaId] = useState(veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [metaId, setMetaId] = useState("");
  const [claveFormulario, setClaveFormulario] = useState(
    CLAVE_FORMULARIO_INDIVIDUAL,
  );
  const [plantillas, setPlantillas] = useState<PlantillaFormularioCatalogo[]>(
    [],
  );
  const [requiereRevision, setRequiereRevision] = useState(true);
  const [agenteIds, setAgenteIds] = useState<string[]>([]);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void listarCatalogoFormulariosJornada(token)
      .then(setPlantillas)
      .catch(() => setPlantillas([]));
  }, [token]);

  const seleccion = resolverSeleccionFormulario(claveFormulario, plantillas);
  const esGrupal = seleccion.tipo === "GRUPAL";

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha || !veredaId) {
      setErrorLocal("Fecha y vereda son obligatorias");
      return;
    }

    const errorFecha = fechaFueraDeProyecto(
      fecha,
      fechaInicioProyecto,
      fechaFinProyecto,
    );
    if (errorFecha) {
      setErrorLocal(errorFecha);
      return;
    }

    if (!metaId) {
      setErrorLocal(
        "Debes seleccionar la meta del plan (Actividad → Subactividad → Proceso → Meta)",
      );
      return;
    }

    if (!agenteIds.length) {
      setErrorLocal(
        "Debes asignar al menos un agente del equipo del proyecto",
      );
      return;
    }

    await onSubmit({
      fecha,
      veredaId,
      nombre: nombre.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      metaId,
      tipo: seleccion.tipo,
      plantillaFormularioId: seleccion.plantillaFormularioId,
      tecnicoResponsableIds: agenteIds,
      requiereRevision,
    });

    setNombre("");
    setFecha("");
    setObservaciones("");
    setMetaId("");
    setClaveFormulario(CLAVE_FORMULARIO_INDIVIDUAL);
    setRequiereRevision(true);
    setAgenteIds([]);
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        Elige la meta del plan y el formulario: el individual o grupal del
        proceso, o cualquier plantilla publicada del catálogo.
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Agentes de campo *
        </label>
        <SelectorCatalogo
          multiple
          opciones={agentes}
          value={agenteIds}
          onChange={setAgenteIds}
          placeholder="Buscar y asignar agentes del equipo..."
          mensajeVacio="No hay personal asignado al proyecto. Configúralo en Equipo y contraparte."
        />
        <p className="mt-1 text-xs text-zinc-500">
          Si asignas varios, se crea una jornada independiente por agente (mismo
          plan y fecha), ligadas para editar o cancelar en conjunto.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Nombre de identificación
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={200}
          placeholder="Ej: Jornada 1"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Opcional. Ayuda a distinguir esta jornada en el panel y en la app.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Fecha *
        </label>
        <SelectorFechaJornada
          required
          value={fecha}
          onChange={setFecha}
          fechaInicioProyecto={fechaInicioProyecto}
          fechaFinProyecto={fechaFinProyecto}
          disabled={enviando}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Vereda *
        </label>
        <SelectorDesplegable
          required
          value={veredaId}
          onChange={setVeredaId}
          opciones={veredas.map((v) => ({ id: v.id, nombre: v.nombre }))}
          placeholder="Seleccionar vereda"
          mensajeSinOpciones="Sin veredas asignadas al proyecto"
          icono={MapPin}
          disabled={enviando}
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-ruralia-teal-border bg-white p-4">
        <p className="text-sm font-medium text-zinc-800">Meta del plan *</p>
        <SelectorMetaPlan
          actividadesPlan={actividadesPlan}
          metaId={metaId}
          onChange={setMetaId}
          disabled={enviando}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Observaciones
        </label>
        <textarea
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />
      </div>

      <SelectorFormularioJornada
        value={claveFormulario}
        onChange={setClaveFormulario}
        plantillas={plantillas}
        disabled={enviando}
      />

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
          requiereRevision
            ? "border-ruralia-teal bg-ruralia-teal-soft/50"
            : "border-zinc-200 bg-white hover:border-ruralia-teal-border"
        }`}
      >
        <input
          type="checkbox"
          checked={requiereRevision}
          onChange={(e) => setRequiereRevision(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-ruralia-teal focus:ring-ruralia-teal/30"
        />
        <span>
          <span className="block text-sm font-semibold text-zinc-800">
            Requiere revisión
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {requiereRevision
              ? "El técnico envía a revisión y el avance solo cuenta cuando un supervisor aprueba"
              : "El técnico sube al proyecto y el avance cuenta al confirmarse, sin paso por revisión"}
          </span>
        </span>
      </label>

      {errorLocal ? (
        <p className="text-sm text-red-600">{errorLocal}</p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || !veredas.length || !agentes.length}
        className="w-full rounded-xl bg-ruralia-teal py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {enviando
          ? "Guardando..."
          : esGrupal
            ? "Crear actividad grupal"
            : "Crear jornada"}
      </button>
    </form>
  );
}
