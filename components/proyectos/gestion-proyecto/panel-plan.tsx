"use client";

import { useState, type ReactNode } from "react";
import { Alerta } from "@/components/ui/modal";
import {
  ArbolPlan,
  construirMigas,
  NIVEL_PLAN,
  type MigaPlan,
  type SeleccionPlan,
  type TipoNivelPlan,
} from "@/components/proyectos/gestion-proyecto/arbol-plan";
import { ChevronRight, Plus } from "lucide-react";
import { PanelAvanceGant } from "@/components/proyectos/gestion-proyecto/panel-avance-gant";
import { SeccionFormulariosProceso } from "@/components/proyectos/gestion-proyecto/seccion-formularios-proceso";
import {
  actualizarActividad,
  actualizarMeta,
  actualizarProceso,
  actualizarSubactividad,
  crearActividad,
  crearMeta,
  crearMetaPeriodo,
  crearProceso,
  crearSubactividad,
  eliminarActividad,
  eliminarMeta,
  eliminarMetaPeriodo,
  eliminarProceso,
  eliminarSubactividad,
} from "@/lib/api";
import type {
  ActividadPlan,
  MetaPlan,
  PlanProyecto,
  ProcesoPlan,
  SubactividadPlan,
} from "@/lib/types";

type SubTab = "estructura" | "avance";

interface PanelPlanProps {
  token: string;
  proyectoId: string;
  plan: PlanProyecto | null;
  puedeGestionar: boolean;
  onActualizar: () => Promise<void>;
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const SIGUIENTE_NIVEL: Partial<
  Record<TipoNivelPlan, { tipo: TipoNivelPlan; label: string; hint: string }>
> = {
  actividad: {
    tipo: "subactividad",
    label: "Subactividad",
    hint: "Agrupa un bloque de trabajo dentro de la actividad.",
  },
  subactividad: {
    tipo: "proceso",
    label: "Proceso",
    hint: "Tipo de visita o entrega (asistencia técnica, materiales, etc.).",
  },
  proceso: {
    tipo: "meta",
    label: "Meta",
    hint: "Cantidad medible contra la que se registran jornadas de campo.",
  },
};

function LeyendaJerarquia() {
  const niveles: TipoNivelPlan[] = [
    "actividad",
    "subactividad",
    "proceso",
    "meta",
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-zinc-500">
        Jerarquía del plan
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {niveles.map((tipo, i) => {
          const config = NIVEL_PLAN[tipo];
          const Icono = config.icon;
          return (
            <span key={tipo} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3 w-3 text-zinc-300" />
              ) : null}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}
              >
                <Icono className="h-3 w-3" />
                {config.label}
              </span>
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Las jornadas se registran contra una <strong>Meta</strong>. Los
        formularios se vinculan al <strong>Proceso</strong> desde el detalle
        de cada proceso.
      </p>
    </div>
  );
}

function MigasPlan({
  migas,
  onSeleccionar,
}: {
  migas: MigaPlan[];
  onSeleccionar: (sel: SeleccionPlan) => void;
}) {
  if (migas.length === 0) return null;

  return (
    <nav
      aria-label="Ubicación en el plan"
      className="flex flex-wrap items-center gap-1 text-xs"
    >
      {migas.map((miga, i) => {
        const config = NIVEL_PLAN[miga.tipo];
        const esUltima = i === migas.length - 1;
        return (
          <span key={`${miga.tipo}-${miga.seleccion.id}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3 text-zinc-300" /> : null}
            <button
              type="button"
              onClick={() => onSeleccionar(miga.seleccion)}
              className={`max-w-[140px] truncate rounded-full px-2 py-0.5 transition-colors ${
                esUltima
                  ? `${config.badge} font-semibold`
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              }`}
              title={miga.nombre}
            >
              {miga.nombre}
            </button>
          </span>
        );
      })}
    </nav>
  );
}

function EncabezadoDetalle({
  tipo,
  migas,
  onSeleccionar,
}: {
  tipo: TipoNivelPlan;
  migas: MigaPlan[];
  onSeleccionar: (sel: SeleccionPlan) => void;
}) {
  const config = NIVEL_PLAN[tipo];
  const Icono = config.icon;

  return (
    <div className="mb-5 space-y-2 border-b border-zinc-100 pb-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${config.badge}`}
        >
          <Icono className="h-3.5 w-3.5" />
          {config.label}
        </span>
      </div>
      <MigasPlan migas={migas} onSeleccionar={onSeleccionar} />
    </div>
  );
}

function TarjetaSeccion({
  titulo,
  descripcion,
  variante = "editar",
  children,
}: {
  titulo: string;
  descripcion?: string;
  variante?: "editar" | "agregar";
  children: ReactNode;
}) {
  const esAgregar = variante === "agregar";

  return (
    <div
      className={`rounded-xl border p-4 ${
        esAgregar
          ? "border-dashed border-ruralia-teal-border bg-ruralia-teal-soft/40"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="mb-3">
        <h4
          className={`text-sm font-semibold ${
            esAgregar ? "text-ruralia-teal-text" : "text-zinc-900"
          }`}
        >
          {esAgregar ? (
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              {titulo}
            </span>
          ) : (
            titulo
          )}
        </h4>
        {descripcion ? (
          <p className="mt-1 text-xs text-zinc-500">{descripcion}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ListaHijos({
  titulo,
  items,
  tipoHijo,
  onSeleccionar,
}: {
  titulo: string;
  items: { id: string; nombre: string; seleccion: SeleccionPlan; extra?: string }[];
  tipoHijo: TipoNivelPlan;
  onSeleccionar: (sel: SeleccionPlan) => void;
}) {
  if (items.length === 0) return null;

  const config = NIVEL_PLAN[tipoHijo];

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
      <p className="mb-2 text-xs font-medium text-zinc-500">{titulo}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSeleccionar(item.seleccion)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-white hover:shadow-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${config.badge}`}
                >
                  {config.label.slice(0, 3)}
                </span>
                <span className="truncate">{item.nombre}</span>
              </span>
              {item.extra ? (
                <span className="shrink-0 text-xs text-zinc-400">{item.extra}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buscarActividad(plan: PlanProyecto, id: string): ActividadPlan | undefined {
  return plan.actividades.find((a) => a.id === id);
}

function buscarSubactividad(
  plan: PlanProyecto,
  actividadId: string,
  id: string,
): SubactividadPlan | undefined {
  return buscarActividad(plan, actividadId)?.subactividades?.find((s) => s.id === id);
}

function buscarProceso(
  plan: PlanProyecto,
  actividadId: string,
  subactividadId: string,
  id: string,
): ProcesoPlan | undefined {
  return buscarSubactividad(plan, actividadId, subactividadId)?.procesos?.find(
    (p) => p.id === id,
  );
}

function buscarMeta(
  plan: PlanProyecto,
  actividadId: string,
  subactividadId: string,
  procesoId: string,
  id: string,
): MetaPlan | undefined {
  return buscarProceso(plan, actividadId, subactividadId, procesoId)?.metas?.find(
    (m) => m.id === id,
  );
}

export function PanelPlan({
  token,
  proyectoId,
  plan,
  puedeGestionar,
  onActualizar,
}: PanelPlanProps) {
  const [subTab, setSubTab] = useState<SubTab>("estructura");
  const [seleccion, setSeleccion] = useState<SeleccionPlan | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividades = plan?.actividades ?? [];

  async function ejecutar(accion: () => Promise<unknown>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      await onActualizar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  function FormularioNuevaActividad() {
    const [nombre, setNombre] = useState("");

    return (
      <TarjetaSeccion
        titulo="Nueva actividad"
        descripcion="Es el nivel más alto del plan. Agrupa bloques de trabajo relacionados."
        variante="agregar"
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nombre.trim()) return;
            void ejecutar(async () => {
              await crearActividad(token, proyectoId, { nombre: nombre.trim() });
              setNombre("");
            });
          }}
        >
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la actividad macro"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !nombre.trim()}
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Crear actividad
          </button>
        </form>
      </TarjetaSeccion>
    );
  }

  function DetalleActividad({
    actividad,
    migas,
    onNavegar,
  }: {
    actividad: ActividadPlan;
    migas: MigaPlan[];
    onNavegar: (sel: SeleccionPlan) => void;
  }) {
    const [nombre, setNombre] = useState(actividad.nombre);
    const [nuevaSub, setNuevaSub] = useState("");
    const subs = actividad.subactividades ?? [];
    const siguiente = SIGUIENTE_NIVEL.actividad;

    return (
      <div className="space-y-4">
        <EncabezadoDetalle
          tipo="actividad"
          migas={migas}
          onSeleccionar={onNavegar}
        />

        <TarjetaSeccion titulo="Datos de la actividad">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={!puedeGestionar}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium"
          />
          {puedeGestionar ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  void ejecutar(() =>
                    actualizarActividad(token, actividad.id, { nombre }),
                  )
                }
                className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-xs font-semibold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  if (!confirm("¿Desactivar esta actividad?")) return;
                  void ejecutar(() => eliminarActividad(token, actividad.id));
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Desactivar
              </button>
            </div>
          ) : null}
        </TarjetaSeccion>

        <ListaHijos
          titulo={`${subs.length} subactividad${subs.length !== 1 ? "es" : ""} en esta actividad`}
          tipoHijo="subactividad"
          items={subs.map((sub) => ({
            id: sub.id,
            nombre: sub.nombre,
            extra: `${sub.progresoPorcentaje}%`,
            seleccion: {
              tipo: "subactividad",
              id: sub.id,
              actividadId: actividad.id,
            },
          }))}
          onSeleccionar={onNavegar}
        />

        {puedeGestionar && siguiente ? (
          <TarjetaSeccion
            titulo={`Agregar ${siguiente.label.toLowerCase()}`}
            descripcion={siguiente.hint}
            variante="agregar"
          >
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevaSub.trim()) return;
                void ejecutar(async () => {
                  await crearSubactividad(token, actividad.id, {
                    nombre: nuevaSub.trim(),
                  });
                  setNuevaSub("");
                });
              }}
            >
              <input
                value={nuevaSub}
                onChange={(e) => setNuevaSub(e.target.value)}
                placeholder="Ej: Implementar mejoramiento técnico"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={enviando || !nuevaSub.trim()}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Crear subactividad
              </button>
            </form>
          </TarjetaSeccion>
        ) : null}
      </div>
    );
  }

  function DetalleSubactividad({
    sub,
    actividadId,
    migas,
    onNavegar,
  }: {
    sub: SubactividadPlan;
    actividadId: string;
    migas: MigaPlan[];
    onNavegar: (sel: SeleccionPlan) => void;
  }) {
    const [nombre, setNombre] = useState(sub.nombre);
    const [objetivo, setObjetivo] = useState(sub.objetivo ?? "");
    const [nuevoProceso, setNuevoProceso] = useState("");
    const procesos = sub.procesos ?? [];
    const siguiente = SIGUIENTE_NIVEL.subactividad;

    return (
      <div className="space-y-4">
        <EncabezadoDetalle
          tipo="subactividad"
          migas={migas}
          onSeleccionar={onNavegar}
        />

        <TarjetaSeccion titulo="Datos de la subactividad">
          <div className="space-y-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={!puedeGestionar}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <textarea
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              disabled={!puedeGestionar}
              placeholder="Objetivo (opcional)"
              rows={2}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          {puedeGestionar ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  void ejecutar(() =>
                    actualizarSubactividad(token, sub.id, { nombre, objetivo }),
                  )
                }
                className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-xs font-semibold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  if (!confirm("¿Desactivar esta subactividad?")) return;
                  void ejecutar(() => eliminarSubactividad(token, sub.id));
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Desactivar
              </button>
            </div>
          ) : null}
        </TarjetaSeccion>

        <ListaHijos
          titulo={`${procesos.length} proceso${procesos.length !== 1 ? "s" : ""} en esta subactividad`}
          tipoHijo="proceso"
          items={procesos.map((proceso) => ({
            id: proceso.id,
            nombre: proceso.nombre,
            extra: `${proceso.progresoPorcentaje}%`,
            seleccion: {
              tipo: "proceso",
              id: proceso.id,
              subactividadId: sub.id,
              actividadId,
            },
          }))}
          onSeleccionar={onNavegar}
        />

        {puedeGestionar && siguiente ? (
          <TarjetaSeccion
            titulo={`Agregar ${siguiente.label.toLowerCase()}`}
            descripcion={siguiente.hint}
            variante="agregar"
          >
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nuevoProceso.trim()) return;
                void ejecutar(async () => {
                  await crearProceso(token, sub.id, { nombre: nuevoProceso.trim() });
                  setNuevoProceso("");
                });
              }}
            >
              <input
                value={nuevoProceso}
                onChange={(e) => setNuevoProceso(e.target.value)}
                placeholder="Ej: Asistencia técnica en campo"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={enviando || !nuevoProceso.trim()}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Crear proceso
              </button>
            </form>
          </TarjetaSeccion>
        ) : null}
      </div>
    );
  }

  function DetalleProceso({
    proceso,
    subactividadId,
    actividadId,
    migas,
    onNavegar,
  }: {
    proceso: ProcesoPlan;
    subactividadId: string;
    actividadId: string;
    migas: MigaPlan[];
    onNavegar: (sel: SeleccionPlan) => void;
  }) {
    const [nombre, setNombre] = useState(proceso.nombre);
    const [descripcion, setDescripcion] = useState(proceso.descripcion ?? "");
    const [nuevaMetaNombre, setNuevaMetaNombre] = useState("");
    const [nuevaMetaUnidad, setNuevaMetaUnidad] = useState("visitas");
    const [nuevaMetaCantidad, setNuevaMetaCantidad] = useState("");
    const metas = proceso.metas ?? [];
    const siguiente = SIGUIENTE_NIVEL.proceso;

    return (
      <div className="space-y-4">
        <EncabezadoDetalle
          tipo="proceso"
          migas={migas}
          onSeleccionar={onNavegar}
        />

        <TarjetaSeccion titulo="Datos del proceso">
          <div className="space-y-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={!puedeGestionar}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={!puedeGestionar}
              placeholder="Descripción (opcional)"
              rows={2}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          {puedeGestionar ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  void ejecutar(() =>
                    actualizarProceso(token, proceso.id, { nombre, descripcion }),
                  )
                }
                className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-xs font-semibold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  if (!confirm("¿Desactivar este proceso?")) return;
                  void ejecutar(() => eliminarProceso(token, proceso.id));
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Desactivar
              </button>
            </div>
          ) : null}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Formularios del proceso"
          descripcion="Plantillas disponibles en jornadas de campo vinculadas a este proceso."
        >
          <SeccionFormulariosProceso
            token={token}
            procesoId={proceso.id}
            puedeGestionar={puedeGestionar}
          />
        </TarjetaSeccion>

        <ListaHijos
          titulo={`${metas.length} meta${metas.length !== 1 ? "s" : ""} en este proceso`}
          tipoHijo="meta"
          items={metas.map((meta) => ({
            id: meta.id,
            nombre: meta.nombre,
            extra: `${meta.ejecutadoTotal}/${meta.cantidadTotal}`,
            seleccion: {
              tipo: "meta",
              id: meta.id,
              procesoId: proceso.id,
              subactividadId,
              actividadId,
            },
          }))}
          onSeleccionar={onNavegar}
        />

        {puedeGestionar && siguiente ? (
          <TarjetaSeccion
            titulo={`Agregar ${siguiente.label.toLowerCase()}`}
            descripcion={siguiente.hint}
            variante="agregar"
          >
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const cantidad = Number(nuevaMetaCantidad);
                if (!nuevaMetaNombre.trim() || !cantidad || cantidad < 0) return;
                void ejecutar(async () => {
                  await crearMeta(token, proceso.id, {
                    nombre: nuevaMetaNombre.trim(),
                    unidadMedida: nuevaMetaUnidad.trim(),
                    cantidadTotal: cantidad,
                  });
                  setNuevaMetaNombre("");
                  setNuevaMetaCantidad("");
                });
              }}
            >
              <input
                value={nuevaMetaNombre}
                onChange={(e) => setNuevaMetaNombre(e.target.value)}
                placeholder="Ej: Visitas de asistencia técnica"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={nuevaMetaUnidad}
                  onChange={(e) => setNuevaMetaUnidad(e.target.value)}
                  placeholder="Unidad (visitas, entregas...)"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={nuevaMetaCantidad}
                  onChange={(e) => setNuevaMetaCantidad(e.target.value)}
                  placeholder="Cantidad total"
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={enviando || !nuevaMetaNombre.trim()}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Crear meta
              </button>
            </form>
          </TarjetaSeccion>
        ) : null}
      </div>
    );
  }

  function DetalleMeta({
    meta,
    migas,
    onNavegar,
  }: {
    meta: MetaPlan;
    migas: MigaPlan[];
    onNavegar: (sel: SeleccionPlan) => void;
  }) {
    const [nombre, setNombre] = useState(meta.nombre);
    const [unidadMedida, setUnidadMedida] = useState(meta.unidadMedida);
    const [cantidadTotal, setCantidadTotal] = useState(String(meta.cantidadTotal));
    const [periodoAnio, setPeriodoAnio] = useState(String(new Date().getFullYear()));
    const [periodoMes, setPeriodoMes] = useState(String(new Date().getMonth() + 1));
    const [periodoCantidad, setPeriodoCantidad] = useState("");

    return (
      <div className="space-y-4">
        <EncabezadoDetalle
          tipo="meta"
          migas={migas}
          onSeleccionar={onNavegar}
        />

        <TarjetaSeccion titulo="Datos de la meta">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={!puedeGestionar}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-400">
                Unidad
              </label>
              <input
                value={unidadMedida}
                onChange={(e) => setUnidadMedida(e.target.value)}
                disabled={!puedeGestionar}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-zinc-400">
                Cantidad total
              </label>
              <input
                type="number"
                min={0}
                value={cantidadTotal}
                onChange={(e) => setCantidadTotal(e.target.value)}
                disabled={!puedeGestionar}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-violet-50 px-3 py-2">
            <p className="text-sm text-violet-900">
              Avance:{" "}
              <strong>
                {meta.ejecutadoTotal} / {meta.cantidadTotal} {meta.unidadMedida}
              </strong>
            </p>
            <div className="mt-1.5 h-2 rounded-full bg-violet-100">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(meta.progresoPorcentaje, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-violet-700">
              {meta.progresoPorcentaje}% completado
            </p>
          </div>
          {puedeGestionar ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enviando}
                onClick={() =>
                  void ejecutar(() =>
                    actualizarMeta(token, meta.id, {
                      nombre,
                      unidadMedida,
                      cantidadTotal: Number(cantidadTotal),
                    }),
                  )
                }
                className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-xs font-semibold text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  if (!confirm("¿Desactivar esta meta?")) return;
                  void ejecutar(() => eliminarMeta(token, meta.id));
                }}
                className="text-xs text-red-600 hover:underline"
              >
                Desactivar
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-zinc-500">
            Cada jornada de campo registrada contra esta meta suma 1 unidad al avance.
          </p>
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Desglose mensual"
          descripcion="Distribuye la meta planeada por mes."
        >
          {!meta.periodos?.length ? (
            <p className="text-xs text-zinc-500">Sin períodos definidos</p>
          ) : (
            <ul className="mb-4 space-y-1 text-sm">
              {meta.periodos.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
                >
                  <span>
                    {MESES[p.mes - 1]} {p.anio}: {p.cantidadPlaneada}{" "}
                    {meta.unidadMedida}
                  </span>
                  {puedeGestionar ? (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => {
                        if (!confirm("¿Eliminar este período?")) return;
                        void ejecutar(() => eliminarMetaPeriodo(token, p.id));
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {puedeGestionar ? (
            <form
              className="grid grid-cols-3 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const cantidad = Number(periodoCantidad);
                if (!cantidad || cantidad < 0) return;
                void ejecutar(async () => {
                  await crearMetaPeriodo(token, meta.id, {
                    anio: Number(periodoAnio),
                    mes: Number(periodoMes),
                    cantidadPlaneada: cantidad,
                  });
                  setPeriodoCantidad("");
                });
              }}
            >
              <input
                type="number"
                value={periodoAnio}
                onChange={(e) => setPeriodoAnio(e.target.value)}
                className="rounded-xl border border-zinc-200 px-2 py-1.5 text-sm"
                placeholder="Año"
              />
              <select
                value={periodoMes}
                onChange={(e) => setPeriodoMes(e.target.value)}
                className="rounded-xl border border-zinc-200 px-2 py-1.5 text-sm"
              >
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={periodoCantidad}
                onChange={(e) => setPeriodoCantidad(e.target.value)}
                placeholder="Planeado"
                className="rounded-xl border border-zinc-200 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={enviando}
                className="col-span-3 rounded-xl border border-zinc-200 py-1.5 text-xs font-semibold text-zinc-700"
              >
                + Período mensual
              </button>
            </form>
          ) : null}
        </TarjetaSeccion>
      </div>
    );
  }

  function renderDetalle() {
    if (!plan) {
      return <p className="text-sm text-zinc-500">Cargando plan...</p>;
    }

    const migas = construirMigas(plan, seleccion);
    const onNavegar = setSeleccion;

    if (!seleccion) {
      return puedeGestionar ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-zinc-700">
              Comienza creando la primera actividad del plan
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Después podrás agregar subactividades, procesos y metas.
            </p>
          </div>
          <FormularioNuevaActividad />
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Selecciona un elemento del árbol para ver detalles.
        </p>
      );
    }

    switch (seleccion.tipo) {
      case "actividad": {
        const act = buscarActividad(plan, seleccion.id);
        return act ? (
          <DetalleActividad
            key={act.id}
            actividad={act}
            migas={migas}
            onNavegar={onNavegar}
          />
        ) : null;
      }
      case "subactividad": {
        const sub = buscarSubactividad(plan, seleccion.actividadId, seleccion.id);
        return sub ? (
          <DetalleSubactividad
            key={sub.id}
            sub={sub}
            actividadId={seleccion.actividadId}
            migas={migas}
            onNavegar={onNavegar}
          />
        ) : null;
      }
      case "proceso": {
        const proceso = buscarProceso(
          plan,
          seleccion.actividadId,
          seleccion.subactividadId,
          seleccion.id,
        );
        return proceso ? (
          <DetalleProceso
            key={proceso.id}
            proceso={proceso}
            subactividadId={seleccion.subactividadId}
            actividadId={seleccion.actividadId}
            migas={migas}
            onNavegar={onNavegar}
          />
        ) : null;
      }
      case "meta": {
        const meta = buscarMeta(
          plan,
          seleccion.actividadId,
          seleccion.subactividadId,
          seleccion.procesoId,
          seleccion.id,
        );
        return meta ? (
          <DetalleMeta
            key={meta.id}
            meta={meta}
            migas={migas}
            onNavegar={onNavegar}
          />
        ) : null;
      }
      default:
        return null;
    }
  }

  return (
    <div className="space-y-4">
      <LeyendaJerarquia />

      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setSubTab("estructura")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            subTab === "estructura"
              ? "border-ruralia-teal text-ruralia-teal-text"
              : "border-transparent text-zinc-500"
          }`}
        >
          Estructura del plan
        </button>
        <button
          type="button"
          onClick={() => setSubTab("avance")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            subTab === "avance"
              ? "border-ruralia-teal text-ruralia-teal-text"
              : "border-transparent text-zinc-500"
          }`}
        >
          Avance mensual
        </button>
      </div>

      {subTab === "avance" ? (
        <PanelAvanceGant token={token} proyectoId={proyectoId} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,340px)_1fr]">
          <aside className="flex max-h-[calc(100vh-280px)] flex-col rounded-2xl border border-ruralia-teal-border bg-white">
            <div className="border-b border-zinc-100 px-4 py-3">
              <h3 className="font-semibold text-zinc-900">Árbol del plan</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Haz clic en un elemento para editarlo
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {actividades.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Sin actividades. Agrega la primera en el panel derecho.
                </p>
              ) : (
                <ArbolPlan
                  actividades={actividades}
                  seleccion={seleccion}
                  onSeleccionar={setSeleccion}
                />
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-ruralia-teal-border bg-white p-6">
            {renderDetalle()}
          </section>
        </div>
      )}
    </div>
  );
}
