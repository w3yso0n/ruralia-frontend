"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, GripVertical, Plus, Users, X } from "lucide-react";
import { REGISTRO_WIDGETS } from "@/components/dashboard/registro-widgets";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import type {
  CompatibilidadRolWidget,
  ItemPreferenciaDashboard,
  RolResumenPlantilla,
  TamanoWidgetDashboard,
  WidgetDisponible,
} from "@/lib/types";

const ETIQUETA_TAMANO: Record<TamanoWidgetDashboard, string> = {
  PEQUENO: "Pequeño",
  MEDIANO: "Mediano",
  GRANDE: "Grande",
  COMPLETO: "Ancho completo",
};

const ETIQUETA_TIPO: Record<string, string> = {
  KPI: "Indicador",
  MEDIDOR: "Medidor",
  METRICA: "Métrica",
  GRAFICA: "Gráfica",
  MAPA: "Mapa",
  TABLA: "Tabla",
  LISTA: "Lista",
};

/**
 * Mismo grid de 12 columnas que /dashboard, para que la vista previa sea
 * fiel: PEQUENO = 3/12 (1/4), MEDIANO = 4/12 (1/3), GRANDE = 8/12 (2/3,
 * llena fila junto a un Mediano), COMPLETO = 12/12 (ancho total).
 */
const CLASE_TAMANO: Record<TamanoWidgetDashboard, string> = {
  PEQUENO: "lg:col-span-3",
  MEDIANO: "lg:col-span-4",
  GRANDE: "lg:col-span-8",
  COMPLETO: "lg:col-span-12",
};

/** Alto de la ventana de previsualización, según cuánto contenido suele traer el widget real. */
const ALTO_PREVIEW: Record<TamanoWidgetDashboard, string> = {
  PEQUENO: "h-40",
  MEDIANO: "h-56",
  GRANDE: "h-72",
  COMPLETO: "h-80",
};

export interface WidgetActivo extends ItemPreferenciaDashboard {
  info?: WidgetDisponible;
}

function PopoverCompatibilidadRoles({
  compatibilidad,
  onCerrar,
}: {
  compatibilidad: CompatibilidadRolWidget;
  onCerrar: () => void;
}) {
  const { rolesCompatibles, rolesIncompatibles } = compatibilidad;
  return (
    <div
      className="absolute right-0 top-full z-10 mt-2 w-64 rounded-2xl border border-ruralia-teal-border bg-white p-4 text-left shadow-lg shadow-zinc-900/10"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-zinc-700">
          Roles que ven este widget hoy
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="shrink-0 rounded-lg p-0.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {rolesCompatibles.length === 0 ? (
        <p className="text-xs text-zinc-500">Ningún rol lo ve todavía.</p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1">
          {rolesCompatibles.map((r) => (
            <span
              key={r.id}
              className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text"
            >
              {r.nombre}
            </span>
          ))}
        </div>
      )}

      {rolesIncompatibles.length > 0 ? (
        <>
          <p className="mb-1 text-[11px] text-zinc-400">
            Sin el permiso requerido:
          </p>
          <div className="flex flex-wrap gap-1">
            {rolesIncompatibles.map((r) => (
              <span
                key={r.id}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-400"
              >
                {r.nombre}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function TarjetaWidgetOrdenable({
  item,
  onQuitar,
  onCambiarTamano,
}: {
  item: WidgetActivo;
  onQuitar: () => void;
  onCambiarTamano: (tamano: TamanoWidgetDashboard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.widgetClave });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Widget = REGISTRO_WIDGETS[item.widgetClave];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white ${
        CLASE_TAMANO[item.tamano]
      } ${isDragging ? "opacity-60 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Arrastrar para reordenar"
            className="shrink-0 cursor-grab touch-none rounded-lg p-1 text-zinc-400 hover:bg-white hover:text-ruralia-teal-text active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="truncate text-xs font-semibold text-zinc-700">
            {item.info?.titulo ?? item.widgetClave}
          </p>
        </div>
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar widget"
          className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`relative overflow-hidden bg-white p-4 ${ALTO_PREVIEW[item.tamano]}`}
      >
        {/* Vista previa real del widget, no interactiva: es solo para ver cómo se verá. */}
        <div className="pointer-events-none h-full w-full overflow-hidden">
          {Widget ? <Widget /> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 px-3 py-2">
        {item.info && item.info.tamanosPermitidos.length > 1 ? (
          item.info.tamanosPermitidos.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onCambiarTamano(t)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                item.tamano === t
                  ? "bg-ruralia-teal text-white"
                  : "bg-ruralia-teal-soft text-ruralia-teal-text hover:bg-ruralia-teal-border/60"
              }`}
            >
              {ETIQUETA_TAMANO[t]}
            </button>
          ))
        ) : (
          <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-[11px] font-semibold text-ruralia-teal-text">
            {item.info ? ETIQUETA_TAMANO[item.tamano] : ""}
          </span>
        )}
      </div>
    </div>
  );
}

function TarjetaWidgetCatalogo({
  widget,
  compatibilidad,
  popoverAbierto,
  onAbrirPopover,
  onCerrarPopover,
  onAgregar,
}: {
  widget: WidgetDisponible;
  compatibilidad?: CompatibilidadRolWidget;
  popoverAbierto: boolean;
  onAbrirPopover: () => void;
  onCerrarPopover: () => void;
  onAgregar: () => void;
}) {
  const Widget = REGISTRO_WIDGETS[widget.clave];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-ruralia-teal-border">
      <button
        type="button"
        onClick={onAgregar}
        className="relative h-28 overflow-hidden bg-zinc-50 p-3 text-left"
      >
        <div className="pointer-events-none h-full w-full scale-90 overflow-hidden">
          {Widget ? <Widget /> : null}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-ruralia-navy/0 opacity-0 transition group-hover:bg-ruralia-navy/40 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ruralia-teal-text">
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </span>
        </div>
      </button>
      <div className="flex items-start justify-between gap-2 border-t border-zinc-100 p-3">
        <button
          type="button"
          onClick={onAgregar}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-zinc-900">
            {widget.titulo}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {ETIQUETA_TIPO[widget.tipo] ?? widget.tipo}
          </p>
        </button>
        {compatibilidad ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (popoverAbierto) onCerrarPopover();
                else onAbrirPopover();
              }}
              aria-label={`Ver qué roles ven ${widget.titulo}`}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-ruralia-teal-soft hover:text-ruralia-teal-text"
            >
              <Users className="h-4 w-4" />
            </button>
            {popoverAbierto ? (
              <PopoverCompatibilidadRoles
                compatibilidad={compatibilidad}
                onCerrar={onCerrarPopover}
              />
            ) : null}
          </div>
        ) : (
          <Eye className="mt-1.5 h-4 w-4 shrink-0 text-zinc-300" />
        )}
      </div>
    </div>
  );
}

interface EditorWidgetsDashboardProps {
  disponibles: WidgetDisponible[];
  activos: WidgetActivo[];
  onCambiarActivos: (activos: WidgetActivo[]) => void;
  /** Si se pasa, habilita el botón de "qué roles ven este widget" y el filtro por rol. */
  compatibilidadPorWidget?: Map<string, CompatibilidadRolWidget>;
  /** Roles disponibles para el filtro (mismo listado que se usa para asignar la plantilla). */
  rolesParaFiltro?: RolResumenPlantilla[];
  tituloDisponibles?: string;
  descripcionDisponibles?: string;
  tituloActivos?: string;
  descripcionActivos?: string;
}

export function EditorWidgetsDashboard({
  disponibles,
  activos,
  onCambiarActivos,
  compatibilidadPorWidget,
  rolesParaFiltro,
  tituloDisponibles = "Widgets disponibles",
  descripcionDisponibles = "Haz clic para agregarlos.",
  tituloActivos = "Layout",
  descripcionActivos = "Arrastra para reordenar. Elige el tamaño de cada widget.",
}: EditorWidgetsDashboardProps) {
  const [popoverAbierto, setPopoverAbierto] = useState<string | null>(null);
  const [filtroRolId, setFiltroRolId] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const clavesActivas = new Set(activos.map((a) => a.widgetClave));
  let catalogoParaAgregar = disponibles.filter(
    (w) => !clavesActivas.has(w.clave),
  );

  if (filtroRolId && compatibilidadPorWidget) {
    catalogoParaAgregar = catalogoParaAgregar.filter((w) => {
      const compat = compatibilidadPorWidget.get(w.clave);
      if (!compat) return true;
      return compat.rolesCompatibles.some((r) => r.id === filtroRolId);
    });
  }

  function agregarWidget(widget: WidgetDisponible) {
    onCambiarActivos([
      ...activos,
      {
        widgetClave: widget.clave,
        posicion: activos.length,
        tamano: widget.tamanoPorDefecto,
        visible: true,
        info: widget,
      },
    ]);
  }

  function quitarWidget(clave: string) {
    onCambiarActivos(
      activos
        .filter((a) => a.widgetClave !== clave)
        .map((a, i) => ({ ...a, posicion: i })),
    );
  }

  function cambiarTamano(clave: string, tamano: TamanoWidgetDashboard) {
    onCambiarActivos(
      activos.map((a) => (a.widgetClave === clave ? { ...a, tamano } : a)),
    );
  }

  function manejarDragEnd(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const oldIndex = activos.findIndex((a) => a.widgetClave === active.id);
    const newIndex = activos.findIndex((a) => a.widgetClave === over.id);
    onCambiarActivos(
      arrayMove(activos, oldIndex, newIndex).map((a, i) => ({
        ...a,
        posicion: i,
      })),
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ruralia-teal-soft text-ruralia-teal-text">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">{tituloDisponibles}</h3>
              <p className="text-xs text-zinc-500">{descripcionDisponibles}</p>
            </div>
          </div>

          {rolesParaFiltro && rolesParaFiltro.length > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-zinc-600">Qué ve el rol</span>
              <div className="w-72">
                <SelectorDesplegable
                  value={filtroRolId}
                  onChange={setFiltroRolId}
                  opciones={rolesParaFiltro.map((r) => ({
                    id: r.id,
                    nombre: r.nombre,
                  }))}
                  permitirVacio
                  etiquetaVacio="Todos los widgets"
                  placeholder="Todos los widgets"
                />
              </div>
            </div>
          ) : null}
        </div>

        {catalogoParaAgregar.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {filtroRolId
              ? "Ese rol no tiene permiso para ver ningún widget que todavía no esté en la plantilla."
              : "Ya agregaste todos los widgets disponibles."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogoParaAgregar.map((widget) => (
              <TarjetaWidgetCatalogo
                key={widget.clave}
                widget={widget}
                compatibilidad={compatibilidadPorWidget?.get(widget.clave)}
                popoverAbierto={popoverAbierto === widget.clave}
                onAbrirPopover={() => setPopoverAbierto(widget.clave)}
                onCerrarPopover={() => setPopoverAbierto(null)}
                onAgregar={() => agregarWidget(widget)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-zinc-900">{tituloActivos}</h3>
            <p className="text-xs text-zinc-500">{descripcionActivos}</p>
          </div>
        </div>

        {activos.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no agregaste widgets. Elige alguno del catálogo de arriba.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={manejarDragEnd}
          >
            <SortableContext
              items={activos.map((a) => a.widgetClave)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
                {activos.map((item) => (
                  <TarjetaWidgetOrdenable
                    key={item.widgetClave}
                    item={item}
                    onQuitar={() => quitarWidget(item.widgetClave)}
                    onCambiarTamano={(t) => cambiarTamano(item.widgetClave, t)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </div>
  );
}
