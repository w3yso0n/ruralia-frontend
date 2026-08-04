"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, GitCompareArrows } from "lucide-react";
import { Modal, Spinner } from "@/components/ui/modal";
import { compararVersionesDocumento } from "@/lib/api";
import type { DocumentoJornada, DocumentoVersion } from "@/lib/types";

type CampoDiff = {
  clave: string;
  etiqueta: string;
  tipo: string;
  versionAnterior: unknown;
  versionNueva: unknown;
  cambio: boolean;
};

type ResultadoComparacion = {
  documentoId: string;
  titulo?: string;
  versionA: {
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    changeReason?: string | null;
  };
  versionB: {
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    changeReason?: string | null;
  };
  campos: CampoDiff[];
};

function formatearValorCampo(valor: unknown, tipo?: string): string {
  if (valor == null || valor === "") return "Sin dato";
  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }
  if (tipo === "SI_NO" || typeof valor === "boolean") {
    if (valor === true || valor === "true" || valor === "Sí" || valor === "si")
      return "Sí";
    if (valor === false || valor === "false" || valor === "No") return "No";
  }
  if (typeof valor === "number") {
    return Number(valor).toLocaleString("es-CO");
  }
  if (typeof valor === "string") {
    const fecha = Date.parse(valor);
    if (
      (tipo === "FECHA" || /^\d{4}-\d{2}-\d{2}/.test(valor)) &&
      !Number.isNaN(fecha)
    ) {
      return new Date(valor).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return valor;
  }
  if (Array.isArray(valor)) {
    return valor.map((v) => formatearValorCampo(v)).join(", ");
  }
  if (typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    if (Array.isArray(obj.filas)) {
      return `${obj.filas.length} fila(s)`;
    }
    return JSON.stringify(valor);
  }
  return String(valor);
}

interface ModalComparacionVersionesProps {
  abierto: boolean;
  onCerrar: () => void;
  token: string;
  documento: DocumentoJornada;
  /** Si se pasa, abre ya comparando esas dos versiones */
  versionAIdInicial?: string;
  versionBIdInicial?: string;
}

export function ModalComparacionVersiones({
  abierto,
  onCerrar,
  token,
  documento,
  versionAIdInicial,
  versionBIdInicial,
}: ModalComparacionVersionesProps) {
  const versiones = useMemo(() => {
    const lista = [...(documento.versiones ?? [])];
    lista.sort((a, b) => a.versionNumber - b.versionNumber);
    return lista;
  }, [documento.versiones]);

  const [versionAId, setVersionAId] = useState("");
  const [versionBId, setVersionBId] = useState("");
  const [soloCambios, setSoloCambios] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<ResultadoComparacion | null>(null);

  useEffect(() => {
    if (!abierto || versiones.length < 2) return;
    const a =
      versionAIdInicial ??
      versiones[Math.max(0, versiones.length - 2)]?.id ??
      "";
    const b =
      versionBIdInicial ?? versiones[versiones.length - 1]?.id ?? "";
    setVersionAId(a);
    setVersionBId(b);
  }, [abierto, versiones, versionAIdInicial, versionBIdInicial]);

  useEffect(() => {
    if (!abierto || !versionAId || !versionBId || versionAId === versionBId) {
      setDiff(null);
      return;
    }
    let vivo = true;
    setCargando(true);
    setError(null);
    void (async () => {
      try {
        const data = await compararVersionesDocumento(
          token,
          documento.id,
          versionAId,
          versionBId,
        );
        if (vivo) setDiff(data as ResultadoComparacion);
      } catch (e) {
        if (vivo) {
          setDiff(null);
          setError(
            e instanceof Error ? e.message : "No se pudo comparar versiones",
          );
        }
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [abierto, token, documento.id, versionAId, versionBId]);

  const camposVisibles = useMemo(() => {
    if (!diff) return [];
    return soloCambios ? diff.campos.filter((c) => c.cambio) : diff.campos;
  }, [diff, soloCambios]);

  function irPar(indiceA: number) {
    if (indiceA < 0 || indiceA >= versiones.length - 1) return;
    setVersionAId(versiones[indiceA].id);
    setVersionBId(versiones[indiceA + 1].id);
  }

  const indiceA = versiones.findIndex((v) => v.id === versionAId);

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Comparar versiones del formulario"
      ancho="xl"
    >
      {versiones.length < 2 ? (
        <p className="text-sm text-stone-600">
          Este documento aún no tiene suficientes versiones para comparar.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-medium text-stone-600">
              Versión anterior
              <select
                value={versionAId}
                onChange={(e) => setVersionAId(e.target.value)}
                className="mt-1 block w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {versiones.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </option>
                ))}
              </select>
            </label>
            <ArrowLeftRight className="mb-2.5 h-4 w-4 text-stone-400" />
            <label className="text-xs font-medium text-stone-600">
              Versión nueva
              <select
                value={versionBId}
                onChange={(e) => setVersionBId(e.target.value)}
                className="mt-1 block w-40 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {versiones.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex flex-wrap gap-2">
              {versiones.slice(0, -1).map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => irPar(i)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    indiceA === i
                      ? "bg-ruralia-teal text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  v{v.versionNumber} → v{versiones[i + 1].versionNumber}
                </button>
              ))}
            </div>
          </div>

          {diff && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-xs text-stone-600">
              <span>
                v{diff.versionA.versionNumber} → v{diff.versionB.versionNumber}
              </span>
              {diff.versionB.changeReason ? (
                <span className="font-medium text-stone-800">
                  Motivo: {diff.versionB.changeReason}
                </span>
              ) : null}
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={soloCambios}
                  onChange={(e) => setSoloCambios(e.target.checked)}
                  className="rounded border-stone-300"
                />
                Solo campos modificados
              </label>
            </div>
          )}

          {cargando ? (
            <Spinner className="py-10" />
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          ) : (
            <div className="space-y-3">
              {camposVisibles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
                  {soloCambios
                    ? "No hay diferencias entre estas versiones."
                    : "Sin campos en el snapshot."}
                </p>
              ) : (
                camposVisibles.map((campo) => (
                  <CampoDiffVista key={campo.clave} campo={campo} />
                ))
              )}
            </div>
          )}

          <div className="flex items-center gap-4 border-t border-stone-100 pt-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              Valor anterior (tachado)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Valor nuevo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-stone-400" />
              Sin cambios
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CampoDiffVista({ campo }: { campo: CampoDiff }) {
  const anterior = formatearValorCampo(campo.versionAnterior, campo.tipo);
  const nuevo = formatearValorCampo(campo.versionNueva, campo.tipo);

  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition ${
        campo.cambio
          ? "border-amber-200 bg-gradient-to-br from-rose-50/40 via-white to-emerald-50/50"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {campo.etiqueta}
        </p>
        {campo.cambio ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
            Modificado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
            <Check className="h-3 w-3" /> Igual
          </span>
        )}
      </div>

      {campo.cambio ? (
        <div className="space-y-2">
          <p className="text-sm text-rose-700/90 line-through decoration-rose-400/80 decoration-2">
            {anterior}
          </p>
          <p className="text-base font-semibold text-emerald-700">{nuevo}</p>
        </div>
      ) : (
        <p className="text-sm font-medium text-stone-800">{nuevo}</p>
      )}
    </div>
  );
}

/** Botón compacto para abrir el modal desde la lista de documentos. */
export function BotonCompararVersiones({
  onClick,
  deshabilitado,
}: {
  onClick: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ruralia-teal-border bg-white px-2.5 py-1.5 text-xs font-semibold text-ruralia-teal transition hover:bg-ruralia-teal-soft disabled:opacity-40"
    >
      <GitCompareArrows className="h-3.5 w-3.5" />
      Comparar versiones
    </button>
  );
}

export function versionesOrdenadas(
  doc: DocumentoJornada,
): DocumentoVersion[] {
  return [...(doc.versiones ?? [])].sort(
    (a, b) => a.versionNumber - b.versionNumber,
  );
}
