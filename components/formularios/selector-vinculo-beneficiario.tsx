"use client";

import { useState } from "react";
import { Lock, Plus, UserCheck } from "lucide-react";
import { crearDatoAdicionalBeneficiario } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  DestinoVinculo,
  DestinosVinculo,
  TipoCampoBeneficiario,
  VinculoBeneficiario,
} from "@/lib/types";

/** Qué datos puede escribir cada tipo de pregunta. Debe coincidir con el backend (vinculo-beneficiario.ts). */
const COMPATIBLES: Partial<Record<string, Array<DestinoVinculo["tipo"]>>> = {
  TEXTO: ["texto"],
  NUMERO: ["numero", "texto"],
  FECHA: ["fecha", "texto"],
  SI_NO: ["booleano", "texto"],
  SELECCION_UNICA: ["texto"],
  SELECCION_MULTIPLE: ["texto"],
  VEREDA_PDET: ["vereda_pdet"],
};

/** Tipo de dato adicional que se crea para cada tipo de pregunta. */
const TIPO_DATO_NUEVO: Partial<Record<string, TipoCampoBeneficiario>> = {
  TEXTO: "texto",
  NUMERO: "numero",
  FECHA: "fecha",
  SI_NO: "booleano",
  SELECCION_UNICA: "texto",
  SELECCION_MULTIPLE: "texto",
};

export function admiteVinculo(tipoCampo: string): boolean {
  return Boolean(COMPATIBLES[tipoCampo]?.length);
}

export function etiquetaDestino(
  destino: string,
  destinos: DestinosVinculo | null,
): string {
  const todos = [...(destinos?.ficha ?? []), ...(destinos?.adicionales ?? [])];
  return todos.find((d) => d.destino === destino)?.etiqueta ?? destino;
}

interface SelectorVinculoBeneficiarioProps {
  tipoCampo: string;
  etiquetaPregunta: string;
  valor: VinculoBeneficiario | null | undefined;
  onChange: (valor: VinculoBeneficiario | null) => void;
  destinos: DestinosVinculo | null;
  /** Se llama con el dato recién creado para agregarlo a la lista. */
  onDatoCreado: (destino: DestinoVinculo) => void;
}

const VALOR_NUEVO = "__nuevo__";

/**
 * "Guardar en el beneficiario" (solo formularios de línea base): al aprobar
 * la jornada, la respuesta actualiza ese dato de la persona. Es lo inverso
 * de "Llenar con dato del beneficiario".
 */
export function SelectorVinculoBeneficiario({
  tipoCampo,
  etiquetaPregunta,
  valor,
  onChange,
  destinos,
  onDatoCreado,
}: SelectorVinculoBeneficiarioProps) {
  const { token } = useAuth();
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipos = COMPATIBLES[tipoCampo] ?? [];
  if (!tipos.length) return null;

  const filtrar = (lista: DestinoVinculo[] = []) =>
    lista.filter((d) => tipos.includes(d.tipo));
  const ficha = filtrar(destinos?.ficha);
  const adicionales = filtrar(destinos?.adicionales);
  const seleccionado = valor?.destino ?? "";
  const desconocido =
    seleccionado &&
    ![...ficha, ...adicionales].some((d) => d.destino === seleccionado);
  const tipoNuevo = TIPO_DATO_NUEVO[tipoCampo];
  const esPdet = tipoCampo === "VEREDA_PDET";

  async function crearDato() {
    if (!token || !tipoNuevo || !nombreNuevo.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const creado = await crearDatoAdicionalBeneficiario(
        token,
        nombreNuevo.trim(),
        tipoNuevo,
      );
      onDatoCreado(creado);
      onChange({ destino: creado.destino, permitirCambio: false });
      setCreando(false);
      setNombreNuevo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el dato");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className={`rounded-xl border p-3 ${
        seleccionado
          ? "border-ruralia-teal-border bg-ruralia-teal-soft/40"
          : "border-zinc-200 bg-white"
      }`}
    >
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        <UserCheck className="h-3.5 w-3.5 text-ruralia-teal" />
        Guardar en el beneficiario
      </label>
      <select
        value={creando ? VALOR_NUEVO : seleccionado}
        onChange={(e) => {
          if (e.target.value === VALOR_NUEVO) {
            setCreando(true);
            setNombreNuevo(etiquetaPregunta.trim());
            return;
          }
          setCreando(false);
          onChange(
            e.target.value
              ? { destino: e.target.value, permitirCambio: false }
              : null,
          );
        }}
        disabled={!destinos}
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20 disabled:opacity-60"
      >
        <option value="">
          {destinos ? "No, solo queda como respuesta de línea base" : "Cargando datos…"}
        </option>
        {desconocido ? (
          <option value={seleccionado}>{seleccionado} (ya no existe)</option>
        ) : null}
        {ficha.length ? (
          <optgroup label="Ficha del beneficiario">
            {ficha.map((d) => (
              <option key={d.destino} value={d.destino}>
                {d.etiqueta}
              </option>
            ))}
          </optgroup>
        ) : null}
        {adicionales.length ? (
          <optgroup label="Datos adicionales">
            {adicionales.map((d) => (
              <option key={d.destino} value={d.destino}>
                {d.etiqueta}
              </option>
            ))}
          </optgroup>
        ) : null}
        {tipoNuevo ? (
          <option value={VALOR_NUEVO}>Crear dato adicional nuevo…</option>
        ) : null}
      </select>

      {creando ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del dato, p. ej. Área de la finca (ha)"
            maxLength={120}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={crearDato}
              disabled={guardando || !nombreNuevo.trim()}
              className="inline-flex items-center gap-1 rounded-xl bg-ruralia-teal px-3 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {guardando ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreando(false);
                setError(null);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}

      {seleccionado && !creando ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ruralia-teal-text">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          {esPdet
            ? "Al aprobar la jornada, la vereda elegida queda como vereda PDET del beneficiario."
            : "Si la persona ya tiene el dato, llega lleno y bloqueado. Si le falta, el técnico lo captura y se guarda en su ficha al aprobar la jornada."}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-500">
          Sin vincular, la respuesta queda guardada como dato de línea base del
          beneficiario en este proyecto.
        </p>
      )}
    </div>
  );
}
