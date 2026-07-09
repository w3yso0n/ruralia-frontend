"use client";

import { useState } from "react";

interface MarcarCompletadaProps {
  completada: boolean;
  puedeEditar: boolean;
  enviando: boolean;
  onCompletar: (nota: string) => void;
  onReabrir: () => void;
}

export function MarcarCompletada({
  completada,
  puedeEditar,
  enviando,
  onCompletar,
  onReabrir,
}: MarcarCompletadaProps) {
  const [nota, setNota] = useState("");

  if (!puedeEditar) return null;

  if (completada) {
    return (
      <button
        type="button"
        disabled={enviando}
        onClick={onReabrir}
        className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
      >
        Reabrir
      </button>
    );
  }

  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <label className="block text-sm font-medium text-zinc-700">
        Nota al completar (opcional)
      </label>
      <textarea
        rows={2}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={enviando}
        onClick={() => onCompletar(nota)}
        className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Marcar completada"}
      </button>
    </div>
  );
}
