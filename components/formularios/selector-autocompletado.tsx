"use client";

import { Link2, Lock } from "lucide-react";
import type {
  ConfigAutocompletado,
  OrigenAutocompletado,
  OrigenesAutocompletado,
  TipoCampoBeneficiario,
} from "@/lib/types";

/** Qué tipos de dato acepta cada tipo de pregunta. Debe coincidir con el backend. */
const COMPATIBLES: Partial<Record<string, TipoCampoBeneficiario[]>> = {
  TEXTO: ["texto", "numero", "fecha", "booleano"],
  NUMERO: ["numero"],
  FECHA: ["fecha"],
  SI_NO: ["booleano"],
  SELECCION_UNICA: ["texto", "booleano"],
};

export function admiteAutocompletado(tipoCampo: string): boolean {
  return Boolean(COMPATIBLES[tipoCampo]?.length);
}

export function etiquetaOrigen(
  origen: string,
  origenes: OrigenesAutocompletado | null,
): string {
  const todos = [...(origenes?.ficha ?? []), ...(origenes?.adicionales ?? [])];
  return todos.find((o) => o.origen === origen)?.etiqueta ?? origen;
}

interface SelectorAutocompletadoProps {
  tipoCampo: string;
  valor: ConfigAutocompletado | null | undefined;
  onChange: (valor: ConfigAutocompletado | null) => void;
  origenes: OrigenesAutocompletado | null;
  compacto?: boolean;
}

/** "Llenar con dato del beneficiario": la pregunta llega llena y bloqueada al técnico. */
export function SelectorAutocompletado({
  tipoCampo,
  valor,
  onChange,
  origenes,
  compacto = false,
}: SelectorAutocompletadoProps) {
  const tipos = COMPATIBLES[tipoCampo] ?? [];
  if (!tipos.length) return null;

  const filtrar = (lista: OrigenAutocompletado[] = []) =>
    lista.filter((origen) => tipos.includes(origen.tipo));
  const ficha = filtrar(origenes?.ficha);
  const adicionales = filtrar(origenes?.adicionales);
  const seleccionado = valor?.origen ?? "";
  const desconocido =
    seleccionado &&
    ![...ficha, ...adicionales].some((o) => o.origen === seleccionado);

  return (
    <div
      className={`rounded-xl border ${
        seleccionado
          ? "border-ruralia-teal-border bg-ruralia-teal-soft/40"
          : "border-zinc-200 bg-white"
      } ${compacto ? "p-2.5" : "p-3"}`}
    >
      <label
        className={`mb-1.5 flex items-center gap-1.5 font-medium text-zinc-700 ${
          compacto ? "text-xs" : "text-sm"
        }`}
      >
        <Link2 className="h-3.5 w-3.5 text-ruralia-teal" />
        Llenar con dato del beneficiario
      </label>
      <select
        value={seleccionado}
        onChange={(e) =>
          onChange(e.target.value ? { origen: e.target.value } : null)
        }
        disabled={!origenes}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20 disabled:opacity-60"
      >
        <option value="">{origenes ? "No, se llena a mano" : "Cargando datos…"}</option>
        {desconocido ? (
          <option value={seleccionado}>{seleccionado} (ya no existe)</option>
        ) : null}
        {ficha.length ? (
          <optgroup label="Ficha del beneficiario">
            {ficha.map((origen) => (
              <option key={origen.origen} value={origen.origen}>
                {origen.etiqueta}
              </option>
            ))}
          </optgroup>
        ) : null}
        {adicionales.length ? (
          <optgroup label="Datos adicionales (cargas por Excel)">
            {adicionales.map((origen) => (
              <option key={origen.origen} value={origen.origen}>
                {origen.etiqueta}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {seleccionado ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ruralia-teal-text">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          Llega lleno y bloqueado: el técnico no lo puede cambiar. Si a la
          persona le falta el dato, se llena a mano como cualquier pregunta.
        </p>
      ) : null}
    </div>
  );
}
