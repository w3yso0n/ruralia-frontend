"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  fechaFueraDeProyecto,
  SelectorFechaJornada,
} from "@/components/ui/selector-fecha-jornada";
import { listarCatalogoFormulariosJornada } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ActividadPlan,
  Jornada,
  PlantillaFormularioCatalogo,
  TipoJornada,
  VeredaResumen,
} from "@/lib/types";
import { SelectorMetaPlan } from "./selector-meta-plan";
import {
  claveDesdeJornada,
  resolverSeleccionFormulario,
  SelectorFormularioJornada,
} from "./selector-formulario-jornada";

interface FormularioEditarJornadaProps {
  jornada: Jornada;
  veredas: VeredaResumen[];
  actividadesPlan: ActividadPlan[];
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
  enviando: boolean;
  tamanoGrupo?: number;
  onSubmit: (datos: {
    fecha: string;
    veredaId: string;
    nombre?: string;
    observaciones?: string;
    metaId: string;
    tipo: TipoJornada;
    plantillaFormularioId?: string | null;
  }) => Promise<void>;
  onCancelar: () => void;
}

function fechaParaInput(fecha: string) {
  return fecha.slice(0, 10);
}

export function FormularioEditarJornada({
  jornada,
  veredas,
  actividadesPlan,
  fechaInicioProyecto,
  fechaFinProyecto,
  enviando,
  tamanoGrupo = 1,
  onSubmit,
  onCancelar,
}: FormularioEditarJornadaProps) {
  const { token } = useAuth();
  const [nombre, setNombre] = useState(jornada.nombre ?? "");
  const [fecha, setFecha] = useState(fechaParaInput(jornada.fecha));
  const [veredaId, setVeredaId] = useState(jornada.vereda?.id ?? veredas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState(jornada.observaciones ?? "");
  const [metaId, setMetaId] = useState(jornada.meta?.id ?? "");
  const [claveFormulario, setClaveFormulario] = useState(
    claveDesdeJornada(jornada),
  );
  const [plantillas, setPlantillas] = useState<PlantillaFormularioCatalogo[]>(
    [],
  );
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void listarCatalogoFormulariosJornada(token)
      .then((lista) => {
        if (
          jornada.plantillaFormulario &&
          !lista.some((p) => p.id === jornada.plantillaFormulario?.id)
        ) {
          setPlantillas([
            {
              id: jornada.plantillaFormulario.id,
              nombre: jornada.plantillaFormulario.nombre,
              tipoPlantilla:
                jornada.plantillaFormulario.tipoPlantilla ?? "INDIVIDUAL",
              version: jornada.plantillaFormulario.version ?? 1,
            },
            ...lista,
          ]);
          return;
        }
        setPlantillas(lista);
      })
      .catch(() => setPlantillas([]));
  }, [token, jornada.plantillaFormulario]);

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

    const seleccion = resolverSeleccionFormulario(claveFormulario, plantillas);
    await onSubmit({
      fecha,
      veredaId,
      nombre: nombre.trim(),
      observaciones: observaciones.trim() || undefined,
      metaId,
      tipo: seleccion.tipo,
      plantillaFormularioId: seleccion.plantillaFormularioId,
    });
  }

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="mt-4 space-y-4">
      {tamanoGrupo > 1 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Esta jornada pertenece a un grupo de {tamanoGrupo} agentes. Los
          cambios de fecha, meta, vereda, nombre, formulario y observaciones se
          aplicarán a todos.
        </p>
      ) : null}

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
          Opcional. Déjalo vacío para quitar el nombre.
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

      {errorLocal ? (
        <p className="text-sm text-red-600">{errorLocal}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {enviando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          type="button"
          disabled={enviando}
          onClick={onCancelar}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
        >
          Cancelar edición
        </button>
      </div>
    </form>
  );
}
