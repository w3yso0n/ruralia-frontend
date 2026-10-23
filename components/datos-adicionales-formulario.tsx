"use client";

import { Plus, X } from "lucide-react";
import type { CampoBeneficiario, TipoCampoBeneficiario } from "@/lib/types";

const claseControl =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20";

/** Definición del campo; una clave sin definición (dato antiguo) se edita como texto. */
export function campoDeClave(
  clave: string,
  campos: CampoBeneficiario[],
): Pick<CampoBeneficiario, "clave" | "etiqueta" | "tipo"> {
  return (
    campos.find((campo) => campo.clave === clave) ?? {
      clave,
      etiqueta: clave,
      tipo: "texto",
    }
  );
}

function ControlDato({
  tipo,
  valor,
  etiqueta,
  onChange,
}: {
  tipo: TipoCampoBeneficiario;
  valor: string;
  etiqueta: string;
  onChange: (valor: string) => void;
}) {
  if (tipo === "booleano") {
    return (
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        aria-label={etiqueta}
        className={claseControl}
      >
        <option value="">Sin dato</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    );
  }
  return (
    <input
      type={tipo === "fecha" && /^\d{4}-\d{2}-\d{2}$|^$/.test(valor) ? "date" : "text"}
      inputMode={tipo === "numero" ? "decimal" : undefined}
      value={valor}
      maxLength={1000}
      onChange={(e) => onChange(e.target.value)}
      aria-label={etiqueta}
      className={claseControl}
    />
  );
}

interface DatosAdicionalesFormularioProps {
  /** Definiciones del catálogo: dan etiqueta y tipo, y alimentan "Agregar dato". */
  campos: CampoBeneficiario[];
  /** Datos visibles en el formulario, como texto de input. */
  valores: Record<string, string>;
  onChange: (valores: Record<string, string>) => void;
}

/** Edición de los datos adicionales en la ficha. Dejar un dato vacío o quitarlo lo borra al guardar. */
export function DatosAdicionalesFormulario({
  campos,
  valores,
  onChange,
}: DatosAdicionalesFormularioProps) {
  const visibles = Object.keys(valores);
  const ordenadas = [
    ...campos.map((campo) => campo.clave).filter((clave) => clave in valores),
    ...visibles.filter((clave) => !campos.some((campo) => campo.clave === clave)),
  ];
  const disponibles = campos.filter((campo) => !(campo.clave in valores));

  function quitar(clave: string) {
    const siguiente = { ...valores };
    delete siguiente[clave];
    onChange(siguiente);
  }

  if (!ordenadas.length && !disponibles.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Datos adicionales</p>
        <p className="text-xs text-zinc-500">
          Llegaron en cargas por Excel. Son de la persona, así que se ven en
          todos los proyectos donde esté. Deja un dato vacío para borrarlo.
        </p>
      </div>
      {ordenadas.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ordenadas.map((clave) => {
            const campo = campoDeClave(clave, campos);
            return (
              <div key={clave}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    {campo.etiqueta}
                  </label>
                  <button
                    type="button"
                    onClick={() => quitar(clave)}
                    aria-label={`Quitar ${campo.etiqueta}`}
                    className="rounded-md p-1 text-zinc-400 transition hover:bg-white hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ControlDato
                  tipo={campo.tipo}
                  etiqueta={campo.etiqueta}
                  valor={valores[clave] ?? ""}
                  onChange={(valor) => onChange({ ...valores, [clave]: valor })}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Esta persona aún no tiene datos adicionales.</p>
      )}
      {disponibles.length ? (
        <label className="flex items-center gap-2">
          <Plus className="h-4 w-4 shrink-0 text-ruralia-teal" />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onChange({ ...valores, [e.target.value]: "" });
            }}
            aria-label="Agregar dato adicional"
            className={claseControl}
          >
            <option value="">Agregar dato adicional…</option>
            {disponibles.map((campo) => (
              <option key={campo.clave} value={campo.clave}>
                {campo.etiqueta}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
