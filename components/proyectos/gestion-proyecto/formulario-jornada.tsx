"use client";

import { useState } from "react";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import type { ActividadPlan, TipoJornada, VeredaResumen } from "@/lib/types";
import { SelectorMetaPlan } from "./selector-meta-plan";

interface AgenteOpcion {
  id: string;
  nombre: string;
}

interface FormularioJornadaProps {
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  agentes: AgenteOpcion[];
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    nombre?: string;
    observaciones?: string;
    metaId: string;
    tipo: TipoJornada;
    tecnicoResponsableIds: string[];
  }) => Promise<void>;
}

export function FormularioJornada({
  veredas,
  actividadesPlan,
  agentes,
  enviando,
  onSubmit,
}: FormularioJornadaProps) {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [veredaId, setVeredaId] = useState(veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [metaId, setMetaId] = useState("");
  const [esGrupal, setEsGrupal] = useState(false);
  const [agenteIds, setAgenteIds] = useState<string[]>([]);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha || !veredaId) {
      setErrorLocal("Fecha y vereda son obligatorias");
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
      tipo: esGrupal ? "GRUPAL" : "INDIVIDUAL",
      tecnicoResponsableIds: agenteIds,
    });

    setNombre("");
    setFecha("");
    setObservaciones("");
    setMetaId("");
    setEsGrupal(false);
    setAgenteIds([]);
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      <p className="text-sm text-zinc-600">
        {esGrupal
          ? "Actividad grupal: usará el formulario grupal asignado al proceso de la meta (lista de asistencia con filas repetibles)."
          : "Registra la jornada de campo seleccionando la meta del plan a la que aporta esta visita. La meta define qué formularios estarán disponibles en el celular."}
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
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Opcional. Ayuda a distinguir esta jornada en el panel y en la app.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Fecha *
          </label>
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Vereda *
          </label>
          <select
            required
            value={veredaId}
            onChange={(e) => setVeredaId(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          >
            {veredas.length === 0 ? (
              <option value="">Sin veredas asignadas al proyecto</option>
            ) : (
              veredas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-100 p-4">
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
          className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        />
      </div>

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
          esGrupal
            ? "border-ruralia-teal bg-ruralia-teal-soft/50"
            : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300"
        }`}
      >
        <input
          type="checkbox"
          checked={esGrupal}
          onChange={(e) => setEsGrupal(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-ruralia-teal focus:ring-ruralia-teal/30"
        />
        <span>
          <span className="block text-sm font-semibold text-zinc-800">
            Actividad grupal
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Usa el formulario grupal del proceso (campos repetibles por asistente)
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
