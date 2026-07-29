"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface OpcionDesplegable {
  id: string;
  nombre: string;
  subtitulo?: string;
}

interface SelectorDesplegableProps {
  value: string;
  onChange: (id: string) => void;
  opciones: OpcionDesplegable[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Permite volver a estado vacío (opción "Seleccionar") */
  permitirVacio?: boolean;
  etiquetaVacio?: string;
  mensajeSinOpciones?: string;
  icono?: ComponentType<{ className?: string }>;
}

export function SelectorDesplegable({
  value,
  onChange,
  opciones,
  placeholder = "Seleccionar",
  disabled = false,
  required,
  permitirVacio = false,
  etiquetaVacio = "Seleccionar",
  mensajeSinOpciones = "Sin opciones disponibles",
  icono: Icono,
}: SelectorDesplegableProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  const seleccionada = opciones.find((o) => o.id === value);
  const sinOpciones = opciones.length === 0;
  const inactivo = disabled || sinOpciones;

  useEffect(() => {
    if (!abierto) return;

    function alClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }

    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  function elegir(id: string) {
    if (inactivo) return;
    onChange(id);
    setAbierto(false);
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        disabled={inactivo}
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
          abierto
            ? "border-ruralia-teal ring-2 ring-ruralia-teal/20"
            : "border-zinc-200 hover:border-ruralia-teal-border"
        } ${inactivo ? "cursor-not-allowed bg-zinc-50 opacity-60" : "bg-white"}`}
        aria-required={required}
        aria-expanded={abierto}
        aria-haspopup="listbox"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {Icono ? (
            <Icono className="h-4 w-4 shrink-0 text-ruralia-teal" />
          ) : null}
          <span className="min-w-0">
            {seleccionada ? (
              <>
                <span className="block truncate font-medium text-zinc-900">
                  {seleccionada.nombre}
                </span>
                {seleccionada.subtitulo ? (
                  <span className="block truncate text-xs text-zinc-500">
                    {seleccionada.subtitulo}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-zinc-400">
                {sinOpciones ? mensajeSinOpciones : placeholder}
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ruralia-teal-muted transition ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && !inactivo ? (
        <ul
          role="listbox"
          className="absolute z-40 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white py-1.5 shadow-lg shadow-zinc-900/10"
        >
          {permitirVacio ? (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => elegir("")}
                className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft ${
                  !value
                    ? "bg-ruralia-teal-soft/60 text-ruralia-teal-text"
                    : "text-zinc-500"
                }`}
              >
                <span>{etiquetaVacio}</span>
                {!value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            </li>
          ) : null}

          {opciones.map((opcion) => {
            const activa = opcion.id === value;
            return (
              <li key={opcion.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activa}
                  onClick={() => elegir(opcion.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft ${
                    activa ? "bg-ruralia-teal-soft/70" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block truncate font-medium ${
                        activa ? "text-ruralia-teal-text" : "text-zinc-900"
                      }`}
                    >
                      {opcion.nombre}
                    </span>
                    {opcion.subtitulo ? (
                      <span className="mt-0.5 block truncate text-xs text-zinc-500">
                        {opcion.subtitulo}
                      </span>
                    ) : null}
                  </span>
                  {activa ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-ruralia-teal" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
