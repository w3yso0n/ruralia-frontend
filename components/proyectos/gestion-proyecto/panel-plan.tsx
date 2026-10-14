"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Alerta, Modal } from "@/components/ui/modal";
import { confirmarEliminacionSimple } from "@/lib/swal";
import {
  ArbolPlan,
  construirMigas,
  NIVEL_PLAN,
  type MigaPlan,
  type SeleccionPlan,
  type TipoNivelPlan,
} from "@/components/proyectos/gestion-proyecto/arbol-plan";
import {
  CalendarDays,
  ChevronRight,
  Download,
  Plus,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
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
  descargarExcelSeguimientoProyecto,
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
  onRecargarAvance?: () => Promise<void>;
  planActualizadoEn?: Date | null;
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
}

const MESES_COMPLETOS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
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

/** Tope vigente: un proceso admite una sola meta. Subir si el negocio lo permite. */
const MAX_METAS_POR_PROCESO = 1;

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
        En campo, cada jornada registra cuántas unidades se ejecutaron hacia la{" "}
        <strong>Meta</strong>. Ese avance se refleja en el plan en cuanto se
        guarda la cantidad desde mobile. Los formularios se vinculan al{" "}
        <strong>Proceso</strong> desde el detalle de cada proceso.
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
          <span
            key={`${miga.tipo}-${miga.seleccion.id}`}
            className="flex items-center gap-1"
          >
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
  items: {
    id: string;
    nombre: string;
    seleccion: SeleccionPlan;
    extra?: string;
  }[];
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
                <span className="shrink-0 text-xs text-zinc-400">
                  {item.extra}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buscarActividad(
  plan: PlanProyecto,
  id: string,
): ActividadPlan | undefined {
  return plan.actividades.find((a) => a.id === id);
}

function buscarSubactividad(
  plan: PlanProyecto,
  actividadId: string,
  id: string,
): SubactividadPlan | undefined {
  return buscarActividad(plan, actividadId)?.subactividades?.find(
    (s) => s.id === id,
  );
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
  return buscarProceso(
    plan,
    actividadId,
    subactividadId,
    procesoId,
  )?.metas?.find((m) => m.id === id);
}

/**
 * Estado compartido por los paneles de detalle. Se pasa por contexto para que
 * los componentes vivan a nivel de módulo: si se declaran dentro de PanelPlan
 * React los remonta en cada render y se pierde lo que el usuario escribió.
 */
interface EdicionPlan {
  token: string;
  proyectoId: string;
  puedeGestionar: boolean;
  enviando: boolean;
  ejecutar: <T>(accion: () => Promise<T>) => Promise<T | undefined>;
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
}

const EdicionPlanContext = createContext<EdicionPlan | null>(null);

function useEdicionPlan(): EdicionPlan {
  const ctx = useContext(EdicionPlanContext);
  if (!ctx) throw new Error("useEdicionPlan debe usarse dentro de PanelPlan");
  return ctx;
}

function FormularioNuevaActividad({
  onCreada,
}: {
  onCreada: (actividad: ActividadPlan) => void;
}) {
  const { token, proyectoId, enviando, ejecutar } = useEdicionPlan();
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
          void ejecutar(() =>
            crearActividad(token, proyectoId, { nombre: nombre.trim() }),
          ).then((creada) => {
            if (!creada) return;
            setNombre("");
            onCreada(creada);
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
  const { token, puedeGestionar, enviando, ejecutar } = useEdicionPlan();
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
              onClick={async () => {
                const confirmado = await confirmarEliminacionSimple({
                  titulo: "Desactivar actividad",
                  texto:
                    "¿Desactivar esta actividad? Dejará de mostrarse en el plan.",
                  textoConfirmar: "Sí, desactivar",
                });
                if (!confirmado) return;
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
  const { token, puedeGestionar, enviando, ejecutar } = useEdicionPlan();
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
              onClick={async () => {
                const confirmado = await confirmarEliminacionSimple({
                  titulo: "Desactivar subactividad",
                  texto:
                    "¿Desactivar esta subactividad? Dejará de mostrarse en el plan.",
                  textoConfirmar: "Sí, desactivar",
                });
                if (!confirmado) return;
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
                await crearProceso(token, sub.id, {
                  nombre: nuevoProceso.trim(),
                });
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
  const { token, puedeGestionar, enviando, ejecutar } = useEdicionPlan();
  const [nombre, setNombre] = useState(proceso.nombre);
  const [descripcion, setDescripcion] = useState(proceso.descripcion ?? "");
  const [nuevaMetaNombre, setNuevaMetaNombre] = useState("");
  const [nuevaMetaUnidad, setNuevaMetaUnidad] = useState("visitas");
  const [nuevaMetaCantidad, setNuevaMetaCantidad] = useState("");
  const metas = proceso.metas ?? [];
  const siguiente = SIGUIENTE_NIVEL.proceso;
  const puedeAgregarMeta = metas.length < MAX_METAS_POR_PROCESO;

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
              onClick={async () => {
                const confirmado = await confirmarEliminacionSimple({
                  titulo: "Desactivar proceso",
                  texto:
                    "¿Desactivar este proceso? Dejará de mostrarse en el plan.",
                  textoConfirmar: "Sí, desactivar",
                });
                if (!confirmado) return;
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

      {puedeGestionar && siguiente && puedeAgregarMeta ? (
        <TarjetaSeccion
          titulo={`Agregar ${siguiente.label.toLowerCase()}`}
          descripcion={`${siguiente.hint} Solo se puede agregar una meta por proceso.`}
          variante="agregar"
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (metas.length >= MAX_METAS_POR_PROCESO) return;
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

      {puedeGestionar && !puedeAgregarMeta ? (
        <p className="text-xs text-zinc-500">
          Este proceso ya tiene su meta. Solo se permite una meta por proceso.
        </p>
      ) : null}
    </div>
  );
}

interface PeriodoPropuesto {
  anio: number;
  mes: number;
  cantidad: number;
}

/** Lee año y mes de una fecha ISO sin pasar por Date (evita corrimientos de zona horaria). */
function anioMesDeFecha(fecha?: string): { anio: number; mes: number } | null {
  const coincidencia = fecha?.match(/^(\d{4})-(\d{2})/);
  if (!coincidencia) return null;
  return { anio: Number(coincidencia[1]), mes: Number(coincidencia[2]) };
}

/**
 * Reparte lo que falta de la meta entre los meses del proyecto que aún no tienen
 * cantidad planeada. Los meses existentes se respetan. El residuo de la división
 * se suma de uno en uno a los primeros meses para que el total cuadre exacto.
 */
function calcularRepartoEquitativo(
  inicio: { anio: number; mes: number },
  fin: { anio: number; mes: number },
  ocupados: Set<string>,
  restante: number,
): PeriodoPropuesto[] {
  const libres: { anio: number; mes: number }[] = [];
  let anio = inicio.anio;
  let mes = inicio.mes;
  while (anio < fin.anio || (anio === fin.anio && mes <= fin.mes)) {
    if (!ocupados.has(`${anio}-${mes}`)) libres.push({ anio, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  // Se reparten unidades enteras; un sobrante decimal se queda sin asignar.
  const unidades = Math.floor(restante);
  if (libres.length === 0 || unidades <= 0) return [];

  const base = Math.floor(unidades / libres.length);
  const residuo = unidades % libres.length;
  return libres
    .map((m, i) => ({ ...m, cantidad: base + (i < residuo ? 1 : 0) }))
    .filter((m) => m.cantidad > 0);
}

function DesgloseMensual({ meta }: { meta: MetaPlan }) {
  const {
    token,
    puedeGestionar,
    enviando,
    ejecutar,
    fechaInicioProyecto,
    fechaFinProyecto,
  } = useEdicionPlan();
  const [confirmandoReparto, setConfirmandoReparto] = useState(false);
  const anioActual = new Date().getFullYear();
  const [agregando, setAgregando] = useState(false);
  const [anio, setAnio] = useState(String(anioActual));
  const [mes, setMes] = useState("");
  const [cantidad, setCantidad] = useState("");

  const periodos = [...(meta.periodos ?? [])].sort(
    (a, b) => a.anio - b.anio || a.mes - b.mes,
  );
  const totalPlaneado = periodos.reduce(
    (suma, p) => suma + Number(p.cantidadPlaneada),
    0,
  );
  const restante = meta.cantidadTotal - totalPlaneado;

  const aniosDisponibles = Array.from(
    new Set([
      ...periodos.map((p) => p.anio),
      ...Array.from({ length: 5 }, (_, i) => anioActual - 1 + i),
    ]),
  ).sort((a, b) => a - b);

  // Un mes solo puede planearse una vez por año.
  const mesesOcupados = new Set(
    periodos.filter((p) => String(p.anio) === anio).map((p) => p.mes),
  );
  const opcionesMes = MESES_COMPLETOS.map((nombre, i) => ({
    id: String(i + 1),
    nombre,
  })).filter((o) => !mesesOcupados.has(Number(o.id)));

  const inicioProyecto = anioMesDeFecha(fechaInicioProyecto);
  const finProyecto = anioMesDeFecha(fechaFinProyecto);
  const propuesta =
    inicioProyecto && finProyecto
      ? calcularRepartoEquitativo(
          inicioProyecto,
          finProyecto,
          new Set(periodos.map((p) => `${p.anio}-${p.mes}`)),
          restante,
        )
      : [];
  const motivoSinReparto =
    !inicioProyecto || !finProyecto
      ? "El proyecto necesita fecha de inicio y de fin para sugerir el reparto."
      : restante <= 0
        ? "La meta ya está distribuida por completo."
        : propuesta.length === 0
          ? "Todos los meses del proyecto ya tienen cantidad planeada."
          : null;
  const etiquetaMes = (p: { anio: number; mes: number }) =>
    `${MESES_COMPLETOS[p.mes - 1]} ${p.anio}`;

  const cantidadNumero = Number(cantidad);
  const formularioValido = Boolean(mes) && cantidadNumero > 0;

  function cerrarFormulario() {
    setAgregando(false);
    setMes("");
    setCantidad("");
  }

  return (
    <TarjetaSeccion
      titulo="Desglose mensual"
      descripcion="Reparte la cantidad total de la meta entre los meses en que se ejecutará."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 font-semibold text-ruralia-teal-text">
          {totalPlaneado} de {meta.cantidadTotal} {meta.unidadMedida}{" "}
          distribuidos
        </span>
        {restante > 0 ? (
          <span className="text-zinc-500">
            Faltan {restante} por asignar a un mes
          </span>
        ) : null}
        {restante < 0 ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
            Excede la meta por {Math.abs(restante)}
          </span>
        ) : null}
      </div>

      {periodos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">
          Aún no hay meses planeados para esta meta.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {periodos.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-ruralia-teal-muted" />
                <span className="font-medium text-zinc-900">
                  {MESES_COMPLETOS[p.mes - 1]} {p.anio}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-sm text-zinc-700">
                  {p.cantidadPlaneada} {meta.unidadMedida}
                </span>
                {puedeGestionar ? (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={async () => {
                      const confirmado = await confirmarEliminacionSimple({
                        titulo: "Quitar mes del desglose",
                        texto: `¿Quitar ${MESES_COMPLETOS[p.mes - 1]} ${p.anio} con ${p.cantidadPlaneada} ${meta.unidadMedida} planeados? Esa cantidad volverá a quedar pendiente de asignar.`,
                        textoConfirmar: "Sí, quitar",
                      });
                      if (!confirmado) return;
                      void ejecutar(() => eliminarMetaPeriodo(token, p.id));
                    }}
                    aria-label={`Quitar ${MESES_COMPLETOS[p.mes - 1]} ${p.anio}`}
                    className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      {puedeGestionar && !agregando ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAgregando(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4 text-ruralia-teal" />
            Agregar mes
          </button>
          <button
            type="button"
            disabled={enviando || motivoSinReparto !== null}
            onClick={() => setConfirmandoReparto(true)}
            title={motivoSinReparto ?? undefined}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <WandSparkles className="h-4 w-4 text-ruralia-teal" />
            Reparto equitativo
          </button>
          {motivoSinReparto ? (
            <span className="text-xs text-zinc-500">{motivoSinReparto}</span>
          ) : null}
        </div>
      ) : null}

      <Modal
        titulo="Reparto equitativo de la meta"
        abierto={confirmandoReparto && propuesta.length > 0}
        onCerrar={() => setConfirmandoReparto(false)}
      >
        {propuesta.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              Se añadirá un reparto equitativo de{" "}
              <strong>{etiquetaMes(propuesta[0])}</strong> a{" "}
              <strong>{etiquetaMes(propuesta[propuesta.length - 1])}</strong>:
              se repartirán{" "}
              <strong>
                {restante} {meta.unidadMedida}
              </strong>{" "}
              entre {propuesta.length}{" "}
              {propuesta.length === 1 ? "mes" : "meses"}.
            </p>
            {periodos.length > 0 ? (
              <p className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-3 py-2 text-xs text-ruralia-teal-text">
                Los {periodos.length}{" "}
                {periodos.length === 1
                  ? "mes ya planeado se conserva"
                  : "meses ya planeados se conservan"}{" "}
                sin cambios. Solo se agregan los meses que faltan.
              </p>
            ) : null}
            <ul className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
              {propuesta.map((p) => (
                <li
                  key={`${p.anio}-${p.mes}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="text-zinc-700">{etiquetaMes(p)}</span>
                  <span className="font-semibold text-zinc-900">
                    {p.cantidad}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500">
              Si la división no es exacta, los primeros meses reciben una unidad
              más para que el total coincida con la meta. Después puedes quitar
              cualquier mes y volver a ajustarlo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoReparto(false)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => {
                  void ejecutar(async () => {
                    for (const p of propuesta) {
                      await crearMetaPeriodo(token, meta.id, {
                        anio: p.anio,
                        mes: p.mes,
                        cantidadPlaneada: p.cantidad,
                      });
                    }
                    return true;
                  }).finally(() => setConfirmandoReparto(false));
                }}
                className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                {enviando
                  ? "Aplicando..."
                  : `Agregar ${propuesta.length} ${propuesta.length === 1 ? "mes" : "meses"}`}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {puedeGestionar && agregando ? (
        <form
          className="mt-3 space-y-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!formularioValido) return;
            void ejecutar(() =>
              crearMetaPeriodo(token, meta.id, {
                anio: Number(anio),
                mes: Number(mes),
                cantidadPlaneada: cantidadNumero,
              }),
            ).then((creado) => {
              if (creado) cerrarFormulario();
            });
          }}
        >
          <p className="text-sm font-semibold text-zinc-900">
            Nuevo mes en el desglose
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Año
              </label>
              <SelectorDesplegable
                value={anio}
                onChange={(valor) => {
                  setAnio(valor);
                  setMes("");
                }}
                opciones={aniosDisponibles.map((a) => ({
                  id: String(a),
                  nombre: String(a),
                }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Mes
              </label>
              <SelectorDesplegable
                value={mes}
                onChange={setMes}
                opciones={opcionesMes}
                placeholder="Elige un mes"
                mensajeSinOpciones="Todos los meses ya están planeados"
                icono={CalendarDays}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Cantidad planeada
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder={restante > 0 ? String(restante) : "0"}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 pr-20 text-sm hover:border-ruralia-teal-border focus:border-ruralia-teal focus:outline-none focus:ring-2 focus:ring-ruralia-teal/20"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 max-w-[64px] -translate-y-1/2 truncate text-xs text-zinc-400">
                  {meta.unidadMedida}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {formularioValido
              ? `Se planearán ${cantidadNumero} ${meta.unidadMedida} para ${
                  MESES_COMPLETOS[Number(mes) - 1]
                } ${anio}.`
              : "Elige el mes y la cantidad que se espera ejecutar en él."}
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={enviando || !formularioValido}
              className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              Guardar mes
            </button>
            <button
              type="button"
              onClick={cerrarFormulario}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </TarjetaSeccion>
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
  const { token, puedeGestionar, enviando, ejecutar } = useEdicionPlan();
  const [nombre, setNombre] = useState(meta.nombre);
  const [unidadMedida, setUnidadMedida] = useState(meta.unidadMedida);
  const [cantidadTotal, setCantidadTotal] = useState(
    String(meta.cantidadTotal),
  );

  return (
    <div className="space-y-4">
      <EncabezadoDetalle tipo="meta" migas={migas} onSeleccionar={onNavegar} />

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
          <p className="mt-2 text-xs text-violet-600">
            Suma las unidades registradas en jornadas de campo (app mobile). Se
            refleja aquí en cuanto guardes la cantidad, sin esperar a cerrar la
            jornada.
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
              onClick={async () => {
                const confirmado = await confirmarEliminacionSimple({
                  titulo: "Desactivar meta",
                  texto:
                    "¿Desactivar esta meta? Dejará de mostrarse en el plan.",
                  textoConfirmar: "Sí, desactivar",
                });
                if (!confirmado) return;
                void ejecutar(() => eliminarMeta(token, meta.id));
              }}
              className="text-xs text-red-600 hover:underline"
            >
              Desactivar
            </button>
          </div>
        ) : null}
        <p className="mt-3 text-xs text-zinc-500">
          Las unidades guardadas en cada jornada desde la app de campo suman al
          avance de esta meta.
        </p>
      </TarjetaSeccion>

      <DesgloseMensual meta={meta} />
    </div>
  );
}

export function PanelPlan({
  token,
  proyectoId,
  plan,
  puedeGestionar,
  onActualizar,
  onRecargarAvance,
  planActualizadoEn,
  fechaInicioProyecto,
  fechaFinProyecto,
}: PanelPlanProps) {
  const [subTab, setSubTab] = useState<SubTab>("estructura");
  const [seleccion, setSeleccion] = useState<SeleccionPlan | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [recargandoAvance, setRecargandoAvance] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actividades = plan?.actividades ?? [];

  async function manejarRecargarAvance() {
    setRecargandoAvance(true);
    try {
      if (onRecargarAvance) {
        await onRecargarAvance();
      } else {
        await onActualizar();
      }
    } finally {
      setRecargandoAvance(false);
    }
  }

  async function manejarDescargarExcel() {
    setDescargandoExcel(true);
    setError(null);
    try {
      const blob = await descargarExcelSeguimientoProyecto(token, proyectoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seguimiento-${proyectoId.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el Excel",
      );
    } finally {
      setDescargandoExcel(false);
    }
  }

  async function ejecutar<T>(accion: () => Promise<T>): Promise<T | undefined> {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await accion();
      await onActualizar();
      return resultado;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      return undefined;
    } finally {
      setEnviando(false);
    }
  }

  const edicion: EdicionPlan = {
    token,
    proyectoId,
    puedeGestionar,
    enviando,
    ejecutar,
    fechaInicioProyecto,
    fechaFinProyecto,
  };

  function renderDetalle() {
    if (!plan) {
      return <p className="text-sm text-zinc-500">Cargando plan...</p>;
    }

    const migas = construirMigas(plan, seleccion);
    const onNavegar = setSeleccion;

    if (!seleccion) {
      const sinActividades = actividades.length === 0;
      return puedeGestionar ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
            <p className="text-sm font-medium text-zinc-700">
              {sinActividades
                ? "Comienza creando la primera actividad del plan"
                : "Agrega una nueva actividad al plan"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {sinActividades
                ? "Después podrás agregar subactividades, procesos y metas."
                : "O selecciona un elemento del árbol para editarlo."}
            </p>
          </div>
          <FormularioNuevaActividad
            onCreada={(act) => setSeleccion({ tipo: "actividad", id: act.id })}
          />
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
        const sub = buscarSubactividad(
          plan,
          seleccion.actividadId,
          seleccion.id,
        );
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
    <EdicionPlanContext.Provider value={edicion}>
      <div className="space-y-4">
        <LeyendaJerarquia />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5">
          <p className="text-xs text-zinc-600">
            Avance calculado desde jornadas de campo. Actualización automática
            cada 30 s
            {planActualizadoEn
              ? ` · última sync ${planActualizadoEn.toLocaleTimeString(
                  "es-CO",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}`
              : ""}
            .
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={descargandoExcel}
              onClick={() => void manejarDescargarExcel()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {descargandoExcel ? "Generando…" : "Excel mensual"}
            </button>
            <button
              type="button"
              disabled={recargandoAvance}
              onClick={() => void manejarRecargarAvance()}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              {recargandoAvance ? "Actualizando..." : "Actualizar avance"}
            </button>
          </div>
        </div>

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
              <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-4 py-3">
                <div>
                  <h3 className="font-semibold text-zinc-900">
                    Árbol del plan
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Haz clic en un elemento para editarlo
                  </p>
                </div>
                {puedeGestionar ? (
                  <button
                    type="button"
                    onClick={() => setSeleccion(null)}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text transition-colors hover:bg-ruralia-teal-soft ${
                      seleccion === null ? "bg-ruralia-teal-soft" : ""
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Actividad
                  </button>
                ) : null}
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
    </EdicionPlanContext.Provider>
  );
}
