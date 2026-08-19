"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Eye,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { REGISTRO_WIDGETS } from "@/components/dashboard/registro-widgets";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  actualizarMiConfiguracionDashboard,
  obtenerMiConfiguracionDashboard,
  obtenerWidgetsDisponiblesDashboard,
  restablecerMiConfiguracionDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ItemPreferenciaDashboard,
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

interface WidgetActivo extends ItemPreferenciaDashboard {
  info?: WidgetDisponible;
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

export function ConfiguracionDashboard() {
  const { token } = useAuth();
  const [disponibles, setDisponibles] = useState<WidgetDisponible[]>([]);
  const [activos, setActivos] = useState<WidgetActivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!token) return;
    let vivo = true;
    Promise.all([
      obtenerWidgetsDisponiblesDashboard(token),
      obtenerMiConfiguracionDashboard(token),
    ])
      .then(([widgets, config]) => {
        if (!vivo) return;
        setDisponibles(widgets);
        const porClave = new Map(widgets.map((w) => [w.clave, w]));
        setActivos(
          config.items
            .filter((i) => i.visible)
            .sort((a, b) => a.posicion - b.posicion)
            .map((i) => ({ ...i, info: porClave.get(i.widgetClave) })),
        );
      })
      .catch((err) => {
        if (vivo) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la configuración del dashboard",
          );
        }
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  const clavesActivas = useMemo(
    () => new Set(activos.map((a) => a.widgetClave)),
    [activos],
  );

  const catalogoParaAgregar = disponibles.filter(
    (w) => !clavesActivas.has(w.clave),
  );

  function agregarWidget(widget: WidgetDisponible) {
    setMensajeExito(null);
    setActivos((prev) => [
      ...prev,
      {
        widgetClave: widget.clave,
        posicion: prev.length,
        tamano: widget.tamanoPorDefecto,
        visible: true,
        info: widget,
      },
    ]);
  }

  function quitarWidget(clave: string) {
    setMensajeExito(null);
    setActivos((prev) =>
      prev
        .filter((a) => a.widgetClave !== clave)
        .map((a, i) => ({ ...a, posicion: i })),
    );
  }

  function cambiarTamano(clave: string, tamano: TamanoWidgetDashboard) {
    setMensajeExito(null);
    setActivos((prev) =>
      prev.map((a) => (a.widgetClave === clave ? { ...a, tamano } : a)),
    );
  }

  function manejarDragEnd(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    setMensajeExito(null);
    setActivos((prev) => {
      const oldIndex = prev.findIndex((a) => a.widgetClave === active.id);
      const newIndex = prev.findIndex((a) => a.widgetClave === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((a, i) => ({
        ...a,
        posicion: i,
      }));
    });
  }

  async function guardar() {
    if (!token) return;
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      await actualizarMiConfiguracionDashboard(
        token,
        activos.map(({ widgetClave, posicion, tamano, visible }) => ({
          widgetClave,
          posicion,
          tamano,
          visible,
        })),
      );
      setMensajeExito("Dashboard actualizado.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la configuración",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function restablecer() {
    if (!token) return;
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const config = await restablecerMiConfiguracionDashboard(token);
      const porClave = new Map(disponibles.map((w) => [w.clave, w]));
      setActivos(
        config.items
          .filter((i) => i.visible)
          .sort((a, b) => a.posicion - b.posicion)
          .map((i) => ({ ...i, info: porClave.get(i.widgetClave) })),
      );
      setMensajeExito("Dashboard restablecido al diseño de fábrica.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al restablecer el dashboard",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Personalizar dashboard
          </h2>
          <p className="mt-1 text-zinc-600">
            Elige qué widgets ver, en qué orden y con qué tamaño. Se guarda solo para tu usuario.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={restablecer}
            disabled={guardando || cargando}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || cargando}
            className="flex items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {mensajeExito ? (
        <div className="mb-6 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-4 py-3 text-sm font-medium text-ruralia-teal-text">
          {mensajeExito}
        </div>
      ) : null}

      {cargando ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ruralia-teal-soft text-ruralia-teal-text">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">
                  Widgets disponibles
                </h3>
                <p className="text-xs text-zinc-500">
                  Según tus permisos. Haz clic para agregarlos a tu dashboard.
                </p>
              </div>
            </div>

            {catalogoParaAgregar.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ya agregaste todos los widgets disponibles para tu rol.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {catalogoParaAgregar.map((widget) => {
                  const Widget = REGISTRO_WIDGETS[widget.clave];
                  return (
                    <button
                      key={widget.clave}
                      type="button"
                      onClick={() => agregarWidget(widget)}
                      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-left transition hover:border-ruralia-teal-border"
                    >
                      <div className="relative h-28 overflow-hidden bg-zinc-50 p-3">
                        <div className="pointer-events-none h-full w-full scale-90 overflow-hidden">
                          {Widget ? <Widget /> : null}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-ruralia-navy/0 opacity-0 transition group-hover:bg-ruralia-navy/40 group-hover:opacity-100">
                          <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ruralia-teal-text">
                            <Plus className="h-3.5 w-3.5" />
                            Agregar
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start justify-between gap-2 border-t border-zinc-100 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {widget.titulo}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-zinc-500">
                            {ETIQUETA_TIPO[widget.tipo] ?? widget.tipo}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 shrink-0 text-zinc-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ruralia-teal-soft text-ruralia-teal-text">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Tu dashboard</h3>
                <p className="text-xs text-zinc-500">
                  Arrastra para reordenar. Elige el tamaño de cada widget.
                </p>
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
                        onCambiarTamano={(t) =>
                          cambiarTamano(item.widgetClave, t)
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>
      )}
    </>
  );
}
