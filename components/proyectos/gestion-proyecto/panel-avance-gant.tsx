"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  descargarExcelSeguimientoDiarioProyecto,
  obtenerAvancePeriodo,
} from "@/lib/api";
import type { AvancePeriodo } from "@/lib/types";

const MESES = [
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

interface PanelAvanceGantProps {
  token: string;
  proyectoId: string;
}

function BarraProgreso({ pct }: { pct: number }) {
  const clampado = Math.min(100, Math.max(0, pct));
  const color =
    clampado >= 100
      ? "bg-emerald-500"
      : clampado >= 60
        ? "bg-ruralia-teal"
        : clampado >= 30
          ? "bg-amber-400"
          : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clampado}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-zinc-600">
        {clampado.toFixed(0)}%
      </span>
    </div>
  );
}

export function PanelAvanceGant({ token, proyectoId }: PanelAvanceGantProps) {
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [datos, setDatos] = useState<AvancePeriodo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await obtenerAvancePeriodo(token, proyectoId, anio, mes);
      setDatos(resultado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar avance");
    } finally {
      setCargando(false);
    }
  }, [token, proyectoId, anio, mes]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      void cargar();
    }, 30_000);
    return () => clearInterval(intervalo);
  }, [cargar]);

  async function manejarDescargarDiario() {
    setDescargando(true);
    setError(null);
    try {
      const blob = await descargarExcelSeguimientoDiarioProyecto(
        token,
        proyectoId,
        anio,
        mes,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seguimiento-diario-${anio}-${String(mes).padStart(2, "0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al descargar el Excel diario",
      );
    } finally {
      setDescargando(false);
    }
  }

  const anios = Array.from({ length: 5 }, (_, i) => ahora.getFullYear() - 2 + i);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mr-2 text-sm font-medium text-zinc-700">Año</label>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm"
          >
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm font-medium text-zinc-700">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm"
          >
            {MESES.map((nombre, i) => (
              <option key={i + 1} value={i + 1}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={descargando}
          onClick={() => void manejarDescargarDiario()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {descargando ? "Generando…" : "Excel diario"}
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        El Excel diario muestra, para el mes seleccionado, en qué días se
        registraron avances de cada meta según las jornadas.
      </p>

      {error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      ) : null}

      {cargando ? (
        <div className="py-8 text-center text-sm text-zinc-400">Cargando...</div>
      ) : datos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-400">
          Sin metas definidas en el plan de este proyecto.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="pb-3 pr-4">Meta</th>
                <th className="pb-3 pr-4">Unidad</th>
                <th className="pb-3 pr-4 text-right">Planeado mes</th>
                <th className="pb-3 pr-4 text-right">Ejecutado mes</th>
                <th className="pb-3 pr-6">Avance mes</th>
                <th className="pb-3 pr-4 text-right">Total planeado</th>
                <th className="pb-3 pr-4 text-right">Acumulado</th>
                <th className="pb-3">Avance acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {datos.map((fila) => (
                <tr key={fila.metaId} className="py-3">
                  <td className="py-3 pr-4 font-medium text-zinc-900">
                    {fila.metaNombre}
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">{fila.unidadMedida}</td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {fila.cantidadPlaneada.toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {fila.ejecutado.toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 pr-6 min-w-[140px]">
                    <BarraProgreso pct={fila.progresoPorcentaje} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-500">
                    —
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-zinc-700">
                    {fila.acumuladoTotal.toLocaleString("es-CO")}
                  </td>
                  <td className="py-3 min-w-[140px]">
                    <BarraProgreso pct={fila.progresoAcumulado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
