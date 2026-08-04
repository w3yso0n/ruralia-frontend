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

function esDataUrlImagen(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    /^data:image\/[\w+.-]+(;base64)?,/i.test(valor.trim())
  );
}

function esUrlHttp(valor: unknown): valor is string {
  return (
    typeof valor === "string" &&
    (/^https?:\/\//i.test(valor) || valor.startsWith("/"))
  );
}

function formatearValorCampo(valor: unknown, tipo?: string): string {
  if (valor == null || valor === "") return "Sin dato";
  if (
    tipo === "FIRMA" ||
    esDataUrlImagen(valor) ||
    (typeof valor === "object" &&
      valor !== null &&
      "firma" in (valor as object))
  ) {
    if (
      typeof valor === "object" &&
      valor !== null &&
      (valor as { presente?: boolean }).presente
    ) {
      return "Firma capturada";
    }
    if (esDataUrlImagen(valor) || esUrlHttp(valor)) return "Firma capturada";
    return "Sin firma";
  }
  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }
  if (tipo === "SI_NO") {
    if (valor === true || valor === "true" || valor === "Sí" || valor === "si")
      return "Sí";
    if (valor === false || valor === "false" || valor === "No") return "No";
  }
  if (typeof valor === "number") {
    return Number(valor).toLocaleString("es-CO");
  }
  if (typeof valor === "string") {
    if (esDataUrlImagen(valor)) return "Firma capturada";
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
      return obj.filas.length === 0
        ? "Sin registros"
        : `${obj.filas.length} registro(s)`;
    }
    return "Dato estructurado";
  }
  return String(valor);
}

function MiniFirma({
  src,
  variante,
}: {
  src: string;
  variante: "anterior" | "nuevo" | "igual";
}) {
  return (
    <div
      className={`inline-flex min-h-[56px] min-w-[96px] items-center justify-center rounded-lg border border-dashed px-2 py-1.5 ${
        variante === "anterior"
          ? "border-rose-200 bg-rose-50/50"
          : variante === "nuevo"
            ? "border-emerald-200 bg-emerald-50/40"
            : "border-zinc-200 bg-zinc-50"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Firma"
        className={`max-h-16 max-w-[140px] object-contain ${
          variante === "anterior" ? "opacity-70" : ""
        }`}
      />
    </div>
  );
}

function VistaTablaDiff({
  valor,
  variante,
}: {
  valor: unknown;
  variante: "anterior" | "nuevo" | "igual";
}) {
  const filas =
    valor &&
    typeof valor === "object" &&
    Array.isArray((valor as { filas?: unknown }).filas)
      ? ((valor as { filas: Record<string, unknown>[] }).filas ?? [])
      : [];

  if (filas.length === 0) {
    return (
      <p
        className={
          variante === "anterior"
            ? "text-sm text-rose-700/90 line-through"
            : variante === "nuevo"
              ? "text-base font-semibold text-emerald-700"
              : "text-sm font-medium text-stone-800"
        }
      >
        Sin registros
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {filas.map((fila, indice) => (
        <div
          key={indice}
          className={`rounded-xl border px-3 py-2 ${
            variante === "anterior"
              ? "border-rose-100 bg-rose-50/40"
              : variante === "nuevo"
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-zinc-100 bg-zinc-50/50"
          }`}
        >
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Registro {indice + 1}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(fila).map(([clave, celda]) => {
              const etiqueta = clave.replaceAll("_", " ");
              return (
                <div key={clave} className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                    {etiqueta}
                  </p>
                  {esDataUrlImagen(celda) || esUrlHttp(celda) ? (
                    <div className="mt-1">
                      <MiniFirma src={String(celda)} variante={variante} />
                    </div>
                  ) : (
                    <p
                      className={`mt-0.5 break-words text-sm ${
                        variante === "anterior"
                          ? "text-rose-800 line-through"
                          : "font-medium text-zinc-900"
                      }`}
                    >
                      {formatearValorCampo(celda)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function VistaValorDiff({
  valor,
  tipo,
  variante,
}: {
  valor: unknown;
  tipo?: string;
  variante: "anterior" | "nuevo" | "igual";
}) {
  const esTabla =
    tipo === "TABLA" ||
    (valor != null &&
      typeof valor === "object" &&
      Array.isArray((valor as { filas?: unknown }).filas));

  if (esTabla) {
    return <VistaTablaDiff valor={valor} variante={variante} />;
  }

  const esFirma =
    tipo === "FIRMA" || esDataUrlImagen(valor) || esUrlHttp(valor);
  const texto = formatearValorCampo(valor, tipo);
  const claseTexto =
    variante === "anterior"
      ? "text-sm text-rose-700/90 line-through decoration-rose-400/80 decoration-2"
      : variante === "nuevo"
        ? "text-base font-semibold text-emerald-700"
        : "text-sm font-medium text-stone-800";

  if (esFirma && (esDataUrlImagen(valor) || esUrlHttp(valor))) {
    return <MiniFirma src={String(valor)} variante={variante} />;
  }

  if (esFirma) {
    return <p className={claseTexto}>{texto}</p>;
  }

  return <p className={`${claseTexto} break-words`}>{texto}</p>;
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-600/80">
              Antes
            </p>
            <VistaValorDiff
              valor={campo.versionAnterior}
              tipo={campo.tipo}
              variante="anterior"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80">
              Después
            </p>
            <VistaValorDiff
              valor={campo.versionNueva}
              tipo={campo.tipo}
              variante="nuevo"
            />
          </div>
        </div>
      ) : (
        <VistaValorDiff
          valor={campo.versionNueva}
          tipo={campo.tipo}
          variante="igual"
        />
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
