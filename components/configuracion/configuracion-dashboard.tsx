"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  EditorWidgetsDashboard,
  type WidgetActivo,
} from "@/components/configuracion/editor-widgets-dashboard";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  actualizarMiConfiguracionDashboard,
  obtenerMiConfiguracionDashboard,
  obtenerWidgetsDisponiblesDashboard,
  restablecerMiConfiguracionDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { WidgetDisponible } from "@/lib/types";

const ETIQUETA_ORIGEN: Record<string, string> = {
  PROPIA: "Tu configuración personalizada",
  PLANTILLA: "Punto de partida: plantilla asignada por tu administrador",
  FABRICA: "Diseño de fábrica",
};

export function ConfiguracionDashboard() {
  const { token } = useAuth();
  const [disponibles, setDisponibles] = useState<WidgetDisponible[]>([]);
  const [activos, setActivos] = useState<WidgetActivo[]>([]);
  const [origen, setOrigen] = useState<string>("FABRICA");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

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
        setOrigen(config.origen);
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

  async function guardar() {
    if (!token) return;
    setGuardando(true);
    setError(null);
    setMensajeExito(null);
    try {
      const config = await actualizarMiConfiguracionDashboard(
        token,
        activos.map(({ widgetClave, posicion, tamano, visible }) => ({
          widgetClave,
          posicion,
          tamano,
          visible,
        })),
      );
      setOrigen(config.origen);
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
      setOrigen(config.origen);
      setActivos(
        config.items
          .filter((i) => i.visible)
          .sort((a, b) => a.posicion - b.posicion)
          .map((i) => ({ ...i, info: porClave.get(i.widgetClave) })),
      );
      setMensajeExito(
        config.origen === "PLANTILLA"
          ? "Dashboard restablecido a la plantilla de tu rol."
          : "Dashboard restablecido al diseño de fábrica.",
      );
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
          {!cargando ? (
            <p className="mt-1 text-xs font-medium text-ruralia-teal-text">
              {ETIQUETA_ORIGEN[origen] ?? ""}
            </p>
          ) : null}
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
        <EditorWidgetsDashboard
          disponibles={disponibles}
          activos={activos}
          onCambiarActivos={setActivos}
          descripcionDisponibles="Según tus permisos. Haz clic para agregarlos a tu dashboard."
          tituloActivos="Tu dashboard"
        />
      )}
    </>
  );
}
