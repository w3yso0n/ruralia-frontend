"use client";

import { useRef, useState } from "react";
import { descargarPlantillaBeneficiarios } from "@/lib/api";

interface CargaExcelBeneficiariosProps {
  token: string;
  archivo: File | null;
  onArchivo: (archivo: File | null) => void;
  disabled?: boolean;
  onImportar?: (archivo: File) => Promise<void>;
  importando?: boolean;
}

export function CargaExcelBeneficiarios({
  token,
  archivo,
  onArchivo,
  disabled,
  onImportar,
  importando,
}: CargaExcelBeneficiariosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  async function descargarPlantilla() {
    setError(null);
    setDescargando(true);
    try {
      await descargarPlantillaBeneficiarios(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo descargar la plantilla",
      );
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-ruralia-teal-border bg-ruralia-teal-soft/20 p-4">
      <p className="text-sm font-medium text-zinc-800">Carga masiva (Excel)</p>
      <p className="mt-1 text-xs text-zinc-500">
        Columnas obligatorias: <strong>nombre</strong> e{" "}
        <strong>identificador</strong> (cédula u otro ID único). Si la persona
        ya existe en la base de datos, solo se asigna al proyecto.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || descargando}
          onClick={() => void descargarPlantilla()}
          className="rounded-lg border border-ruralia-teal-border bg-white px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft disabled:opacity-50"
        >
          {descargando ? "Descargando…" : "Descargar plantilla"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
        >
          Elegir archivo
        </button>
        {archivo && onImportar ? (
          <button
            type="button"
            disabled={disabled || importando}
            onClick={() => void onImportar(archivo)}
            className="rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text disabled:opacity-50"
          >
            {importando ? "Cargando…" : "Cargar al proyecto"}
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onArchivo(file);
            e.target.value = "";
          }}
        />
      </div>
      {archivo ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
          <span className="truncate">{archivo.name}</span>
          <button
            type="button"
            onClick={() => onArchivo(null)}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
          >
            Quitar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">Ningún archivo seleccionado.</p>
      )}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
