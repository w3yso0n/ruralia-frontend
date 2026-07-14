"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  GitBranch,
  Workflow,
  Target,
} from "lucide-react";
import type {
  ActividadPlan,
  MetaPlan,
  ProcesoPlan,
  SubactividadPlan,
} from "@/lib/types";

export type SeleccionPlan =
  | { tipo: "actividad"; id: string }
  | { tipo: "subactividad"; id: string; actividadId: string }
  | { tipo: "proceso"; id: string; subactividadId: string; actividadId: string }
  | {
      tipo: "meta";
      id: string;
      procesoId: string;
      subactividadId: string;
      actividadId: string;
    };

export type TipoNivelPlan = SeleccionPlan["tipo"];

export const NIVEL_PLAN = {
  actividad: {
    label: "Actividad",
    icon: Layers,
    badge: "bg-teal-100 text-teal-800",
    activo: "bg-teal-50 ring-1 ring-teal-200",
    punto: "bg-teal-500",
  },
  subactividad: {
    label: "Subactividad",
    icon: GitBranch,
    badge: "bg-sky-100 text-sky-800",
    activo: "bg-sky-50 ring-1 ring-sky-200",
    punto: "bg-sky-500",
  },
  proceso: {
    label: "Proceso",
    icon: Workflow,
    badge: "bg-amber-100 text-amber-800",
    activo: "bg-amber-50 ring-1 ring-amber-200",
    punto: "bg-amber-500",
  },
  meta: {
    label: "Meta",
    icon: Target,
    badge: "bg-violet-100 text-violet-800",
    activo: "bg-violet-50 ring-1 ring-violet-200",
    punto: "bg-violet-500",
  },
} as const;

export interface MigaPlan {
  seleccion: SeleccionPlan;
  nombre: string;
  tipo: TipoNivelPlan;
}

interface ArbolPlanProps {
  actividades: ActividadPlan[];
  seleccion: SeleccionPlan | null;
  onSeleccionar: (sel: SeleccionPlan) => void;
}

function idsAncestros(seleccion: SeleccionPlan | null): string[] {
  if (!seleccion) return [];
  switch (seleccion.tipo) {
    case "actividad":
      return [];
    case "subactividad":
      return [seleccion.actividadId];
    case "proceso":
      return [seleccion.actividadId, seleccion.subactividadId];
    case "meta":
      return [
        seleccion.actividadId,
        seleccion.subactividadId,
        seleccion.procesoId,
      ];
    default:
      return [];
  }
}

function BarraProgreso({ pct }: { pct: number }) {
  const valor = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <div className="h-1 min-w-[28px] flex-1 rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-ruralia-teal transition-all"
          style={{ width: `${valor}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-zinc-400">
        {pct}%
      </span>
    </div>
  );
}

function NodoArbol({
  nombre,
  tipo,
  progreso,
  activo,
  tieneHijos,
  expandido,
  onToggle,
  onSeleccionar,
  detalle,
  nivel,
}: {
  nombre: string;
  tipo: TipoNivelPlan;
  progreso: number;
  activo: boolean;
  tieneHijos: boolean;
  expandido: boolean;
  onToggle: () => void;
  onSeleccionar: () => void;
  detalle?: string;
  nivel: number;
}) {
  const config = NIVEL_PLAN[tipo];
  const Icono = config.icon;

  return (
    <div style={{ paddingLeft: `${nivel * 12}px` }}>
      <div
        className={`group flex items-start gap-1 rounded-lg p-1 transition-colors ${
          activo ? config.activo : "hover:bg-zinc-50"
        }`}
      >
        <button
          type="button"
          onClick={tieneHijos ? onToggle : undefined}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 ${
            tieneHijos ? "hover:bg-zinc-100 hover:text-zinc-600" : "invisible"
          }`}
          tabIndex={tieneHijos ? 0 : -1}
          aria-label={expandido ? "Contraer" : "Expandir"}
        >
          {expandido ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onSeleccionar}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide ${config.badge}`}
            >
              <Icono className="h-2.5 w-2.5" />
            </span>
            <span
              className={`truncate text-sm leading-tight ${
                activo ? "font-semibold text-zinc-900" : "text-zinc-700"
              }`}
            >
              {nombre}
            </span>
          </div>
          {detalle ? (
            <p className="mt-0.5 truncate pl-0.5 text-[10px] text-zinc-400">
              {detalle}
            </p>
          ) : null}
          <BarraProgreso pct={progreso} />
        </button>
      </div>
    </div>
  );
}

function RamaMeta({
  meta,
  procesoId,
  subactividadId,
  actividadId,
  seleccion,
  onSeleccionar,
  nivel,
}: {
  meta: MetaPlan;
  procesoId: string;
  subactividadId: string;
  actividadId: string;
  seleccion: SeleccionPlan | null;
  onSeleccionar: (sel: SeleccionPlan) => void;
  nivel: number;
}) {
  const activa = seleccion?.tipo === "meta" && seleccion.id === meta.id;

  return (
    <NodoArbol
      nombre={meta.nombre}
      tipo="meta"
      progreso={meta.progresoPorcentaje}
      activo={activa}
      tieneHijos={false}
      expandido={false}
      onToggle={() => {}}
      onSeleccionar={() =>
        onSeleccionar({
          tipo: "meta",
          id: meta.id,
          procesoId,
          subactividadId,
          actividadId,
        })
      }
      detalle={`${meta.ejecutadoTotal}/${meta.cantidadTotal} ${meta.unidadMedida}`}
      nivel={nivel}
    />
  );
}

function RamaProceso({
  proceso,
  subactividadId,
  actividadId,
  seleccion,
  onSeleccionar,
  expandido,
  onToggle,
  nivel,
}: {
  proceso: ProcesoPlan;
  subactividadId: string;
  actividadId: string;
  seleccion: SeleccionPlan | null;
  onSeleccionar: (sel: SeleccionPlan) => void;
  expandido: boolean;
  onToggle: () => void;
  nivel: number;
}) {
  const activo = seleccion?.tipo === "proceso" && seleccion.id === proceso.id;
  const metas = proceso.metas ?? [];
  const tieneHijos = metas.length > 0;

  return (
    <div>
      <NodoArbol
        nombre={proceso.nombre}
        tipo="proceso"
        progreso={proceso.progresoPorcentaje}
        activo={activo}
        tieneHijos={tieneHijos}
        expandido={expandido}
        onToggle={onToggle}
        onSeleccionar={() =>
          onSeleccionar({
            tipo: "proceso",
            id: proceso.id,
            subactividadId,
            actividadId,
          })
        }
        detalle={
          metas.length > 0
            ? `${metas.length} meta${metas.length !== 1 ? "s" : ""}`
            : "Sin metas"
        }
        nivel={nivel}
      />
      {expandido
        ? metas.map((meta) => (
            <RamaMeta
              key={meta.id}
              meta={meta}
              procesoId={proceso.id}
              subactividadId={subactividadId}
              actividadId={actividadId}
              seleccion={seleccion}
              onSeleccionar={onSeleccionar}
              nivel={nivel + 1}
            />
          ))
        : null}
    </div>
  );
}

export function construirMigas(
  plan: { actividades: ActividadPlan[] },
  seleccion: SeleccionPlan | null,
): MigaPlan[] {
  if (!seleccion) return [];

  const migas: MigaPlan[] = [];

  const actividadId =
    seleccion.tipo === "actividad"
      ? seleccion.id
      : "actividadId" in seleccion
        ? seleccion.actividadId
        : null;

  if (!actividadId) return migas;

  const act = plan.actividades.find((a) => a.id === actividadId);
  if (!act) return migas;

  migas.push({
    tipo: "actividad",
    nombre: act.nombre,
    seleccion: { tipo: "actividad", id: act.id },
  });

  if (seleccion.tipo === "actividad") return migas;

  const subId =
    seleccion.tipo === "subactividad" ? seleccion.id : seleccion.subactividadId;
  const sub = act.subactividades?.find((s) => s.id === subId);
  if (!sub) return migas;

  migas.push({
    tipo: "subactividad",
    nombre: sub.nombre,
    seleccion: { tipo: "subactividad", id: sub.id, actividadId: act.id },
  });

  if (seleccion.tipo === "subactividad") return migas;

  const procesoId =
    seleccion.tipo === "proceso" ? seleccion.id : seleccion.procesoId;
  const proceso = sub.procesos?.find((p) => p.id === procesoId);
  if (!proceso) return migas;

  migas.push({
    tipo: "proceso",
    nombre: proceso.nombre,
    seleccion: {
      tipo: "proceso",
      id: proceso.id,
      subactividadId: sub.id,
      actividadId: act.id,
    },
  });

  if (seleccion.tipo === "proceso") return migas;

  const meta = proceso.metas?.find((m) => m.id === seleccion.id);
  if (!meta) return migas;

  migas.push({
    tipo: "meta",
    nombre: meta.nombre,
    seleccion: {
      tipo: "meta",
      id: meta.id,
      procesoId: proceso.id,
      subactividadId: sub.id,
      actividadId: act.id,
    },
  });

  return migas;
}

export function ArbolPlan({
  actividades,
  seleccion,
  onSeleccionar,
}: ArbolPlanProps) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setExpandidas((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function estaExpandido(id: string) {
    return expandidas[id] ?? true;
  }

  useEffect(() => {
    const ancestros = idsAncestros(seleccion);
    if (ancestros.length === 0) return;
    setExpandidas((prev) => {
      const next = { ...prev };
      for (const id of ancestros) next[id] = true;
      return next;
    });
  }, [seleccion]);

  return (
    <div className="space-y-0.5 text-sm">
      {actividades.length === 0 ? (
        <p className="p-2 text-zinc-500">Sin actividades en el plan</p>
      ) : (
        actividades.map((actividad) => {
          const subs = actividad.subactividades ?? [];
          const tieneHijos = subs.length > 0;
          const expandida = estaExpandido(actividad.id);
          const activa =
            seleccion?.tipo === "actividad" && seleccion.id === actividad.id;

          return (
            <div key={actividad.id}>
              <NodoArbol
                nombre={actividad.nombre}
                tipo="actividad"
                progreso={actividad.progresoPorcentaje}
                activo={activa}
                tieneHijos={tieneHijos}
                expandido={expandida}
                onToggle={() => toggle(actividad.id)}
                onSeleccionar={() =>
                  onSeleccionar({ tipo: "actividad", id: actividad.id })
                }
                detalle={
                  subs.length > 0
                    ? `${subs.length} subactividad${subs.length !== 1 ? "es" : ""}`
                    : "Sin subactividades"
                }
                nivel={0}
              />
              {expandida
                ? subs.map((sub) => (
                    <RamaSubactividadWrapper
                      key={sub.id}
                      sub={sub}
                      actividadId={actividad.id}
                      seleccion={seleccion}
                      onSeleccionar={onSeleccionar}
                      expandido={estaExpandido(sub.id)}
                      onToggle={() => toggle(sub.id)}
                      estaExpandido={estaExpandido}
                      toggle={toggle}
                    />
                  ))
                : null}
            </div>
          );
        })
      )}
    </div>
  );
}

function RamaSubactividadWrapper({
  sub,
  actividadId,
  seleccion,
  onSeleccionar,
  expandido,
  onToggle,
  estaExpandido,
  toggle,
}: {
  sub: SubactividadPlan;
  actividadId: string;
  seleccion: SeleccionPlan | null;
  onSeleccionar: (sel: SeleccionPlan) => void;
  expandido: boolean;
  onToggle: () => void;
  estaExpandido: (id: string) => boolean;
  toggle: (id: string) => void;
}) {
  const activa =
    seleccion?.tipo === "subactividad" && seleccion.id === sub.id;
  const procesos = sub.procesos ?? [];
  const tieneHijos = procesos.length > 0;

  return (
    <div>
      <NodoArbol
        nombre={sub.nombre}
        tipo="subactividad"
        progreso={sub.progresoPorcentaje}
        activo={activa}
        tieneHijos={tieneHijos}
        expandido={expandido}
        onToggle={onToggle}
        onSeleccionar={() =>
          onSeleccionar({
            tipo: "subactividad",
            id: sub.id,
            actividadId,
          })
        }
        detalle={
          procesos.length > 0
            ? `${procesos.length} proceso${procesos.length !== 1 ? "s" : ""}`
            : "Sin procesos"
        }
        nivel={1}
      />
      {expandido
        ? procesos.map((proceso) => (
            <RamaProceso
              key={proceso.id}
              proceso={proceso}
              subactividadId={sub.id}
              actividadId={actividadId}
              seleccion={seleccion}
              onSeleccionar={onSeleccionar}
              expandido={estaExpandido(proceso.id)}
              onToggle={() => toggle(proceso.id)}
              nivel={2}
            />
          ))
        : null}
    </div>
  );
}
