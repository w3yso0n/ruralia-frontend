"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GitBranch,
  Layers,
  ListTree,
  Target,
} from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import type { ActividadPlan, ProcesoPlan } from "@/lib/types";

interface SelectorMetaPlanProps {
  actividadesPlan: ActividadPlan[];
  metaId: string;
  onChange: (metaId: string) => void;
  disabled?: boolean;
}

function encontrarRutaMeta(actividadesPlan: ActividadPlan[], metaId: string) {
  if (!metaId) return null;

  for (const act of actividadesPlan) {
    for (const sub of act.subactividades ?? []) {
      for (const proc of sub.procesos ?? []) {
        if (proc.metas?.some((m) => m.id === metaId)) {
          return {
            actividadId: act.id,
            subactividadId: sub.id,
            procesoId: proc.id,
          };
        }
      }
    }
  }

  return null;
}

export function SelectorMetaPlan({
  actividadesPlan,
  metaId,
  onChange,
  disabled = false,
}: SelectorMetaPlanProps) {
  const [actividadId, setActividadId] = useState("");
  const [subactividadId, setSubactividadId] = useState("");
  const [procesoId, setProcesoId] = useState("");

  useEffect(() => {
    if (!metaId) {
      setActividadId("");
      setSubactividadId("");
      setProcesoId("");
      return;
    }

    const ruta = encontrarRutaMeta(actividadesPlan, metaId);
    if (ruta) {
      setActividadId(ruta.actividadId);
      setSubactividadId(ruta.subactividadId);
      setProcesoId(ruta.procesoId);
    }
  }, [metaId, actividadesPlan]);

  const actividadSel = actividadesPlan.find((a) => a.id === actividadId);
  const subactividadSel = actividadSel?.subactividades?.find(
    (s) => s.id === subactividadId,
  );
  const procesoSel: ProcesoPlan | undefined = subactividadSel?.procesos?.find(
    (p) => p.id === procesoId,
  );

  const opcionesActividad = useMemo(
    () => actividadesPlan.map((a) => ({ id: a.id, nombre: a.nombre })),
    [actividadesPlan],
  );

  const opcionesSubactividad = useMemo(
    () =>
      (actividadSel?.subactividades ?? []).map((s) => ({
        id: s.id,
        nombre: s.nombre,
      })),
    [actividadSel],
  );

  const opcionesProceso = useMemo(
    () =>
      (subactividadSel?.procesos ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
      })),
    [subactividadSel],
  );

  const opcionesMeta = useMemo(
    () =>
      (procesoSel?.metas ?? []).map((m) => ({
        id: m.id,
        nombre: m.nombre,
        subtitulo: m.unidadMedida,
      })),
    [procesoSel],
  );

  function resetCascada(nivel: "actividad" | "subactividad" | "proceso") {
    onChange("");
    if (nivel === "actividad") {
      setSubactividadId("");
      setProcesoId("");
    } else if (nivel === "subactividad") {
      setProcesoId("");
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600">
          Actividad
        </label>
        <SelectorDesplegable
          value={actividadId}
          disabled={disabled}
          opciones={opcionesActividad}
          placeholder="Seleccionar actividad"
          permitirVacio
          etiquetaVacio="Seleccionar actividad"
          mensajeSinOpciones="Sin actividades en el plan"
          icono={Layers}
          onChange={(id) => {
            setActividadId(id);
            resetCascada("actividad");
          }}
        />
      </div>

      {actividadSel ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Subactividad
          </label>
          <SelectorDesplegable
            value={subactividadId}
            disabled={disabled}
            opciones={opcionesSubactividad}
            placeholder="Seleccionar subactividad"
            permitirVacio
            etiquetaVacio="Seleccionar subactividad"
            mensajeSinOpciones="Sin subactividades"
            icono={ListTree}
            onChange={(id) => {
              setSubactividadId(id);
              resetCascada("subactividad");
            }}
          />
        </div>
      ) : null}

      {subactividadSel && (subactividadSel.procesos?.length ?? 0) > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Proceso
          </label>
          <SelectorDesplegable
            value={procesoId}
            disabled={disabled}
            opciones={opcionesProceso}
            placeholder="Seleccionar proceso"
            permitirVacio
            etiquetaVacio="Seleccionar proceso"
            icono={GitBranch}
            onChange={(id) => {
              setProcesoId(id);
              resetCascada("proceso");
            }}
          />
        </div>
      ) : null}

      {procesoSel && (procesoSel.metas?.length ?? 0) > 0 ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">
            Meta *
          </label>
          <SelectorDesplegable
            value={metaId}
            disabled={disabled}
            required
            opciones={opcionesMeta}
            placeholder="Seleccionar meta"
            permitirVacio
            etiquetaVacio="Seleccionar meta"
            icono={Target}
            onChange={onChange}
          />
        </div>
      ) : null}

      {subactividadSel && (subactividadSel.procesos?.length ?? 0) === 0 ? (
        <p className="text-xs text-zinc-400">
          Esta subactividad aún no tiene procesos definidos.
        </p>
      ) : null}
    </div>
  );
}
