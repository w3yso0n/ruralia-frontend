"use client";

import { useEffect, useState } from "react";
import { Alerta } from "@/components/ui/modal";
import {
  listarEquipoResumenProyecto,
  listarRoles,
  reasignarPasoRevision,
} from "@/lib/api";
import type { MiembroEquipoResumen, RolDetalle } from "@/lib/types";
import { etiquetaRol } from "@/lib/types";

/**
 * Quien edita el proyecto puede reasignarse el paso y luego aprobarlo,
 * salvo que sea el técnico de la jornada o ya haya aprobado otro nivel.
 */
export function AvisoPasoAtascado({
  token,
  jornadaId,
  proyectoId,
  orden,
  atascado = false,
  onListo,
}: {
  token: string;
  jornadaId: string;
  proyectoId: string;
  orden?: number;
  atascado?: boolean;
  onListo: () => void;
}) {
  const [tipo, setTipo] = useState<"usuario" | "rol">("usuario");
  const [destino, setDestino] = useState("");
  const [equipo, setEquipo] = useState<MiembroEquipoResumen[]>([]);
  const [roles, setRoles] = useState<RolDetalle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    void Promise.all([
      listarEquipoResumenProyecto(token, proyectoId),
      listarRoles(token),
    ])
      .then(([miembros, listaRoles]) => {
        if (cancelado) return;
        setEquipo(miembros.filter((m) => m.estaActivo));
        setRoles(
          listaRoles.filter(
            (r) =>
              r.estaActivo &&
              r.permisoClaves.includes("jornadas.aprobar") &&
              r.permisoClaves.includes("jornadas.rechazar"),
          ),
        );
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el personal del proyecto");
      });
    return () => {
      cancelado = true;
    };
  }, [token, proyectoId]);

  async function reasignar() {
    if (!destino) return;
    setOcupado(true);
    setError(null);
    try {
      await reasignarPasoRevision(
        token,
        jornadaId,
        tipo === "usuario" ? { usuarioId: destino } : { rolId: destino },
      );
      onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo reasignar el paso");
    } finally {
      setOcupado(false);
    }
  }

  const opciones = tipo === "usuario" ? equipo : roles;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">
        {atascado
          ? `Este paso${orden ? ` (nivel ${orden})` : ""} no tiene quien pueda aprobarlo.`
          : `Reasignar el nivel ${orden ?? "pendiente"}`}
      </p>
      <p className="mt-1 text-amber-900">
        {atascado
          ? "Reasigna una persona o un rol con candidatos. Puedes asignártelo y aprobarlo después, si no eres el técnico ni aprobaste otro nivel."
          : "Cambia quién debe resolver este paso. No modifica los niveles ya aprobados ni la configuración del proyecto. Queda registrado en el historial."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={tipo}
          onChange={(e) => {
            setTipo(e.target.value as "usuario" | "rol");
            setDestino("");
          }}
          className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
        >
          <option value="usuario">Persona</option>
          <option value="rol">Rol</option>
        </select>
        <select
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"
        >
          <option value="">Elegir…</option>
          {opciones.map((op) => (
            <option key={op.id} value={op.id}>
              {"permisoClaves" in op ? etiquetaRol(op.nombre) : op.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!destino || ocupado}
          onClick={() => void reasignar()}
          className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {ocupado ? "Reasignando…" : "Reasignar"}
        </button>
      </div>
      {error ? <Alerta tipo="error" mensaje={error} /> : null}
    </div>
  );
}
