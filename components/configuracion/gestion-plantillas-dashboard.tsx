"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutTemplate,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  EditorWidgetsDashboard,
  type WidgetActivo,
} from "@/components/configuracion/editor-widgets-dashboard";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  actualizarPlantillaDashboard,
  asignarPlantillaDashboardARol,
  crearPlantillaDashboard,
  eliminarPlantillaDashboard,
  listarPlantillasDashboard,
  listarRoles,
  obtenerCompatibilidadRolesDashboard,
  obtenerWidgetsDisponiblesDashboard,
  quitarAsignacionPlantillaDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  CompatibilidadRolWidget,
  PlantillaDashboard,
  RolDetalle,
  WidgetDisponible,
} from "@/lib/types";

type Vista = { modo: "galeria" } | { modo: "editor"; plantillaId: string | null };

function TarjetaPlantilla({
  plantilla,
  onEditar,
  onEliminar,
}: {
  plantilla: PlantillaDashboard;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ruralia-teal-border bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-zinc-900">
            {plantilla.nombre}
          </p>
          {plantilla.descripcion ? (
            <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">
              {plantilla.descripcion}
            </p>
          ) : null}
        </div>
        <LayoutTemplate className="h-5 w-5 shrink-0 text-ruralia-teal-muted" />
      </div>

      <p className="text-xs text-zinc-500">
        {plantilla.items.length} widget{plantilla.items.length === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-zinc-400" />
        {plantilla.rolesAsignados.length === 0 ? (
          <span className="text-xs text-zinc-400">Sin roles asignados</span>
        ) : (
          plantilla.rolesAsignados.map((r) => (
            <span
              key={r.id}
              className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text"
            >
              {r.nombre}
            </span>
          ))
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onEditar}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={onEliminar}
          className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SelectorRolesAsignados({
  roles,
  asignadosIds,
  onAsignar,
  onQuitar,
}: {
  roles: RolDetalle[];
  asignadosIds: Set<string>;
  onAsignar: (rolId: string) => void;
  onQuitar: (rolId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((rol) => {
        const asignado = asignadosIds.has(rol.id);
        return (
          <button
            key={rol.id}
            type="button"
            onClick={() => (asignado ? onQuitar(rol.id) : onAsignar(rol.id))}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              asignado
                ? "border-ruralia-teal bg-ruralia-teal text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-ruralia-teal-border hover:bg-ruralia-teal-soft"
            }`}
          >
            {rol.nombre}
            {asignado ? <X className="h-3 w-3" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function GestionPlantillasDashboard() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const tienePermiso = puede("configuracion.gestionar_plantillas");
  const [vista, setVista] = useState<Vista>({ modo: "galeria" });
  const [plantillas, setPlantillas] = useState<PlantillaDashboard[]>([]);
  const [roles, setRoles] = useState<RolDetalle[]>([]);
  const [disponibles, setDisponibles] = useState<WidgetDisponible[]>([]);
  const [compatibilidad, setCompatibilidad] = useState<CompatibilidadRolWidget[]>(
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sin este permiso no hay nada que cargar: el layout de /configuracion
    // ya redirige, esto solo evita el parpadeo de un fetch condenado a 403.
    if (!token || !tienePermiso) return;
    let vivo = true;
    Promise.all([
      listarPlantillasDashboard(token),
      listarRoles(token),
      obtenerWidgetsDisponiblesDashboard(token),
      obtenerCompatibilidadRolesDashboard(token),
    ])
      .then(([p, r, w, c]) => {
        if (!vivo) return;
        setPlantillas(p);
        setRoles(r);
        setDisponibles(w);
        setCompatibilidad(c);
        setError(null);
      })
      .catch((err) => {
        if (vivo) {
          setError(
            err instanceof Error ? err.message : "Error al cargar plantillas",
          );
        }
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, [token, tienePermiso, vista.modo]);

  const compatibilidadPorWidget = useMemo(
    () => new Map(compatibilidad.map((c) => [c.widgetClave, c])),
    [compatibilidad],
  );

  // El layout de /configuracion ya redirige a quien no tiene el permiso;
  // esto solo evita mostrar la pantalla un instante antes del redirect.
  if (!tienePermiso) return null;

  async function eliminar(id: string) {
    if (!token) return;
    if (!confirm("¿Eliminar esta plantilla? Los roles que la tengan asignada volverán al diseño de fábrica.")) {
      return;
    }
    try {
      await eliminarPlantillaDashboard(token, id);
      setPlantillas((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la plantilla");
    }
  }

  if (vista.modo === "editor") {
    return (
      <EditorPlantilla
        plantillaId={vista.plantillaId}
        plantillaInicial={
          vista.plantillaId
            ? plantillas.find((p) => p.id === vista.plantillaId)
            : undefined
        }
        disponibles={disponibles}
        roles={roles}
        compatibilidadPorWidget={compatibilidadPorWidget}
        onVolver={() => setVista({ modo: "galeria" })}
      />
    );
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Plantillas de dashboard
          </h2>
          <p className="mt-1 text-zinc-600">
            Diseña dashboards para los roles que no pueden personalizar el propio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setVista({ modo: "editor", plantillaId: null })}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
        >
          <Plus className="h-4 w-4" />
          Diseñar plantilla
        </button>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      {cargando ? (
        <Spinner />
      ) : plantillas.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Todavía no hay plantillas. Crea una para asignarla a los roles que no
          pueden personalizar su propio dashboard.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plantillas.map((p) => (
            <TarjetaPlantilla
              key={p.id}
              plantilla={p}
              onEditar={() => setVista({ modo: "editor", plantillaId: p.id })}
              onEliminar={() => eliminar(p.id)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function EditorPlantilla({
  plantillaId,
  plantillaInicial,
  disponibles,
  roles,
  compatibilidadPorWidget,
  onVolver,
}: {
  plantillaId: string | null;
  plantillaInicial?: PlantillaDashboard;
  disponibles: WidgetDisponible[];
  roles: RolDetalle[];
  compatibilidadPorWidget: Map<string, CompatibilidadRolWidget>;
  onVolver: () => void;
}) {
  const { token } = useAuth();
  const [nombre, setNombre] = useState(plantillaInicial?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(
    plantillaInicial?.descripcion ?? "",
  );
  const [activos, setActivos] = useState<WidgetActivo[]>(() => {
    const porClave = new Map(disponibles.map((w) => [w.clave, w]));
    return (plantillaInicial?.items ?? [])
      .sort((a, b) => a.posicion - b.posicion)
      .map((i) => ({ ...i, info: porClave.get(i.widgetClave) }));
  });
  const [rolesAsignados, setRolesAsignados] = useState<Set<string>>(
    () => new Set((plantillaInicial?.rolesAsignados ?? []).map((r) => r.id)),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!token) return;
    if (!nombre.trim()) {
      setError("Ponle un nombre a la plantilla.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        items: activos.map(({ widgetClave, posicion, tamano, visible }) => ({
          widgetClave,
          posicion,
          tamano,
          visible,
        })),
      };

      const plantilla = plantillaId
        ? await actualizarPlantillaDashboard(token, plantillaId, payload)
        : await crearPlantillaDashboard(token, payload);

      const asignadosPrevios = new Set(
        (plantillaInicial?.rolesAsignados ?? []).map((r) => r.id),
      );
      const porAsignar = [...rolesAsignados].filter(
        (id) => !asignadosPrevios.has(id),
      );
      const porQuitar = [...asignadosPrevios].filter(
        (id) => !rolesAsignados.has(id),
      );

      await Promise.all([
        ...porAsignar.map((rolId) =>
          asignarPlantillaDashboardARol(token, plantilla.id, rolId),
        ),
        ...porQuitar.map((rolId) =>
          quitarAsignacionPlantillaDashboard(token, rolId),
        ),
      ]);

      onVolver();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la plantilla",
      );
    } finally {
      setGuardando(false);
    }
  }

  function alternarRol(rolId: string) {
    setRolesAsignados((prev) => {
      const next = new Set(prev);
      if (next.has(rolId)) next.delete(rolId);
      else next.add(rolId);
      return next;
    });
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onVolver}
            className="mb-2 text-xs font-semibold text-ruralia-teal-text hover:underline"
          >
            ← Volver a plantillas
          </button>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {plantillaId ? "Editar plantilla" : "Diseñar plantilla"}
          </h2>
          <p className="mt-1 text-zinc-600">
            Este dashboard se aplicará a todos los usuarios de los roles que asignes.
          </p>
        </div>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {guardando ? "Guardando…" : "Guardar plantilla"}
        </button>
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="mb-6 grid gap-4 rounded-2xl border border-ruralia-teal-border bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Dashboard de campo"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-ruralia-teal focus:outline-none focus:ring-2 focus:ring-ruralia-teal/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Descripción
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-ruralia-teal focus:outline-none focus:ring-2 focus:ring-ruralia-teal/20"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Asignar a roles
          </label>
          <SelectorRolesAsignados
            roles={roles}
            asignadosIds={rolesAsignados}
            onAsignar={alternarRol}
            onQuitar={alternarRol}
          />
          <p className="mt-2 text-xs text-zinc-500">
            Los usuarios de estos roles verán este dashboard si no pueden
            personalizar el propio. Si un usuario tiene varios roles con
            plantilla asignada, se usa la del rol de mayor jerarquía.
          </p>
        </div>
      </div>

      <EditorWidgetsDashboard
        disponibles={disponibles}
        activos={activos}
        onCambiarActivos={setActivos}
        compatibilidadPorWidget={compatibilidadPorWidget}
        rolesParaFiltro={roles.map((r) => ({ id: r.id, nombre: r.nombre }))}
        descripcionDisponibles="Haz clic para agregarlos a la plantilla, o usa el ícono de roles para ver quién ve cada widget hoy."
        tituloActivos="Layout de la plantilla"
      />
    </>
  );
}
