"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

function partirOpciones(texto: string): string[] {
  return texto
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function opcionesDesdeTexto(texto: string): string[] {
  return partirOpciones(texto);
}

export function textoDesdeOpciones(valores: string[]): string {
  return valores.join("\n");
}

interface EditorOpcionesProps {
  valores: string[];
  onChange: (valores: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Opciones como fichas: se escribe y se confirma con Enter o el botón.
 * Sin “una por línea”. Acepta pegar listas separadas por coma o salto.
 */
export function EditorOpciones({
  valores,
  onChange,
  placeholder = "Escribe una opción",
  disabled = false,
}: EditorOpcionesProps) {
  const [texto, setTexto] = useState("");

  function agregar(raw: string) {
    const nuevas = partirOpciones(raw);
    if (nuevas.length === 0) return;
    const existentes = new Set(valores.map((v) => v.toLowerCase()));
    const filtradas = nuevas.filter((v) => !existentes.has(v.toLowerCase()));
    if (filtradas.length === 0) {
      setTexto("");
      return;
    }
    onChange([...valores, ...filtradas]);
    setTexto("");
  }

  function quitar(indice: number) {
    onChange(valores.filter((_, i) => i !== indice));
  }

  return (
    <div>
      {valores.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {valores.map((valor, indice) => (
            <span
              key={`${valor}-${indice}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-ruralia-teal-soft py-1 pl-3 pr-1.5 text-sm text-ruralia-teal-text"
            >
              <span className="truncate">{valor}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => quitar(indice)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ruralia-teal-text/70 hover:bg-white/80 hover:text-ruralia-teal-text disabled:opacity-40"
                aria-label={`Quitar ${valor}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-2 text-xs text-zinc-500">
          Aún no hay opciones. Escribe cada una y pulsa Añadir.
        </p>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={texto}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar(texto);
            }
            if (e.key === "Backspace" && texto === "" && valores.length > 0) {
              quitar(valores.length - 1);
            }
          }}
          onPaste={(e) => {
            const pegado = e.clipboardData.getData("text");
            if (/[\n,;]/.test(pegado)) {
              e.preventDefault();
              agregar(pegado);
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20 disabled:bg-zinc-50"
        />
        <button
          type="button"
          disabled={disabled || !texto.trim()}
          onClick={() => agregar(texto)}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-ruralia-teal-soft px-3 py-2 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal hover:text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Añadir
        </button>
      </div>
    </div>
  );
}
