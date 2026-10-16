"use client";

import { useCallback, useEffect, useState } from "react";
import { Alerta } from "@/components/ui/modal";
import {
  guardarNivelesAprobacion,
  listarEquipoResumenProyecto,
  listarNivelesAprobacion,
  listarRoles,
} from "@/lib/api";
import type { MiembroEquipoResumen, RolDetalle } from "@/lib/types";
import { etiquetaRol } from "@/lib/types";

interface Fila {
  orden: number;
  tipo: "usuario" | "rol";
  destino: string;
}

export function CadenaAprobacionProyecto({
  token,
  proyectoId,
  puedeGestionar,
}: {
  token: string;
  proyectoId: string;
  puedeGestionar: boolean;
}) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [equipo, setEquipo] = useState<MiembroEquipoResumen[]>([]);
  const [roles, setRoles] = useState<RolDetalle[]>([]);
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [niveles, miembros, listaRoles] = await Promise.all([
      listarNivelesAprobacion(token, proyectoId),
      listarEquipoResumenProyecto(token, proyectoId),
      listarRoles(token),
    ]);
    setEquipo(miembros.filter((m) => m.estaActivo));
    setRoles(
      listaRoles.filter(
        (r) =>
          r.estaActivo &&
          r.permisoClaves.includes("jornadas.aprobar") &&
          r.permisoClaves.includes("jornadas.rechazar"),
      ),
    );
    setFilas(
      niveles.map((nivel) => ({
        orden: nivel.orden,
        tipo: nivel.usuarioId ? "usuario" : "rol",
        destino: nivel.usuarioId ?? nivel.rolId ?? "",
      })),
    );
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar().catch(() => setError("No se pudo cargar la cadena de aprobación"));
  }, [cargar]);

  function actualizar(indice: number, parcial: Partial<Fila>) {
    setFilas((prev) =>
      prev.map((fila, i) => (i === indice ? { ...fila, ...parcial } : fila)),
    );
  }

  async function guardar() {
    setOcupado(true);
    setError(null);
    setOk(null);
    try {
      const resultado = await guardarNivelesAprobacion(
        token,
        proyectoId,
        filas.map((fila, indice) => ({
          orden: indice + 1,
          ...(fila.tipo === "usuario"
            ? { usuarioId: fila.destino }
            : { rolId: fila.destino }),
        })),
      );
      setAdvertencias(resultado.advertencias);
      setOk(
        resultado.advertencias.length
          ? "Cadena guardada, con avisos."
          : "Cadena guardada. Las jornadas ya enviadas no cambian de modo.",
      );
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la cadena");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-ruralia-teal-border bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Cadena de aprobación</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Cada nivel es una persona o un rol, hasta cuatro. La persona y el rol
        tienen que poder aprobar y rechazar. Si la misma persona queda en dos
        niveles, se guarda igual y verás un aviso: esa jornada puede atorarse
        y habrá que reasignar el paso. Guardar no cambia las jornadas que ya
        se enviaron.
      </p>
      <div className="mt-4 space-y-2">
        {filas.map((fila, indice) => {
          const opciones = fila.tipo === "usuario" ? equipo : roles;
          return (
            <div key={indice} className="flex flex-col gap-2 sm:flex-row">
              <span className="w-16 shrink-0 pt-2 text-sm text-zinc-500">
                Nivel {indice + 1}
              </span>
              <select
                disabled={!puedeGestionar}
                value={fila.tipo}
                onChange={(e) =>
                  actualizar(indice, {
                    tipo: e.target.value as "usuario" | "rol",
                    destino: "",
                  })
                }
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="usuario">Persona</option>
                <option value="rol">Rol</option>
              </select>
              <select
                disabled={!puedeGestionar}
                value={fila.destino}
                onChange={(e) => actualizar(indice, { destino: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="">Elegir…</option>
                {opciones.map((op) => (
                  <option key={op.id} value={op.id}>
                    {"permisoClaves" in op ? etiquetaRol(op.nombre) : op.nombre}
                  </option>
                ))}
              </select>
              {puedeGestionar ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilas((prev) => prev.filter((_, i) => i !== indice))
                  }
                  className="text-sm text-red-700"
                >
                  Quitar
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {puedeGestionar ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={filas.length >= 4}
            onClick={() =>
              setFilas((prev) => [
                ...prev,
                { orden: prev.length + 1, tipo: "rol", destino: "" },
              ])
            }
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            Agregar nivel
          </button>
          <button
            type="button"
            disabled={ocupado || filas.some((f) => !f.destino)}
            onClick={() => void guardar()}
            className="rounded-lg bg-ruralia-teal px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {ocupado ? "Guardando…" : "Guardar cadena"}
          </button>
        </div>
      ) : null}
      {advertencias.map((aviso) => (
        <p key={aviso} className="mt-2 text-sm text-amber-800">
          {aviso}
        </p>
      ))}
      {error ? <Alerta tipo="error" mensaje={error} /> : null}
      {ok ? <Alerta tipo="exito" mensaje={ok} /> : null}
    </section>
  );
}
