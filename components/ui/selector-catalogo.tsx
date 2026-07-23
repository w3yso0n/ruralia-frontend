"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface OpcionCatalogo {
  id: string;
  nombre: string;
  subtitulo?: string;
}

interface BaseProps {
  opciones: OpcionCatalogo[];
  placeholder?: string;
  mensajeVacio?: string;
}

interface SelectorCatalogoMultipleProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

interface SelectorCatalogoUnicoProps extends BaseProps {
  multiple?: false;
  value: string;
  onChange: (id: string) => void;
}

type SelectorCatalogoProps =
  | SelectorCatalogoMultipleProps
  | SelectorCatalogoUnicoProps;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function coincideBusqueda(opcion: OpcionCatalogo, termino: string): boolean {
  if (!termino) return true;
  const clave = normalizar(termino);
  return (
    normalizar(opcion.nombre).includes(clave) ||
    (opcion.subtitulo ? normalizar(opcion.subtitulo).includes(clave) : false)
  );
}

function Pill({
  etiqueta,
  onQuitar,
}: {
  etiqueta: string;
  onQuitar?: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 py-1 pl-3 pr-1.5 text-sm text-zinc-800">
      <span className="truncate">{etiqueta}</span>
      {onQuitar ? (
        <button
          type="button"
          onClick={onQuitar}
          className="shrink-0 rounded-full p-0.5 text-zinc-500 transition hover:bg-white hover:text-zinc-800"
          aria-label="Quitar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </span>
  );
}

function ListaOpciones({
  opciones,
  onElegir,
  seleccionadoId,
}: {
  opciones: OpcionCatalogo[];
  onElegir: (opcion: OpcionCatalogo) => void;
  seleccionadoId?: string;
}) {
  if (!opciones.length) {
    return (
      <li className="px-3 py-2 text-sm text-zinc-500">Sin coincidencias</li>
    );
  }

  return (
    <>
      {opciones.map((opcion) => (
        <li key={opcion.id}>
          <button
            type="button"
            onClick={() => onElegir(opcion)}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-ruralia-teal-soft ${
              seleccionadoId === opcion.id ? "bg-ruralia-teal-soft/60" : ""
            }`}
          >
            <span className="font-medium text-zinc-900">{opcion.nombre}</span>
            {opcion.subtitulo ? (
              <span className="mt-0.5 block text-xs text-zinc-500">
                {opcion.subtitulo}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </>
  );
}

export function SelectorCatalogo(props: SelectorCatalogoProps) {
  const {
    opciones,
    placeholder = "Buscar o seleccionar…",
    mensajeVacio = "Nada seleccionado. Haz clic para ver la lista.",
  } = props;

  const contenedorRef = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);

  const catalogo = useMemo(
    () => new Map(opciones.map((o) => [o.id, o])),
    [opciones],
  );

  const opcionesFiltradas = useMemo(
    () => opciones.filter((o) => coincideBusqueda(o, busqueda.trim())),
    [opciones, busqueda],
  );

  useEffect(() => {
    function cerrarSiClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setMostrarLista(false);
      }
    }
    document.addEventListener("mousedown", cerrarSiClickFuera);
    return () => document.removeEventListener("mousedown", cerrarSiClickFuera);
  }, []);

  if (props.multiple) {
    const { value, onChange } = props;
    const disponibles = opcionesFiltradas.filter((o) => !value.includes(o.id));

    function agregar(opcion: OpcionCatalogo) {
      if (value.includes(opcion.id)) return;
      onChange([...value, opcion.id]);
      setBusqueda("");
    }

    function quitar(id: string) {
      onChange(value.filter((x) => x !== id));
    }

    return (
      <div ref={contenedorRef} className="space-y-3">
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {value.map((id) => {
              const opcion = catalogo.get(id);
              return (
                <Pill
                  key={id}
                  etiqueta={opcion?.nombre ?? "Seleccionado"}
                  onQuitar={() => quitar(id)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{mensajeVacio}</p>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarLista(true);
            }}
            onFocus={() => setMostrarLista(true)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
          />

          {mostrarLista ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
              <ListaOpciones opciones={disponibles} onElegir={agregar} />
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  const { value, onChange } = props;
  const seleccionada = value ? catalogo.get(value) : undefined;

  function elegir(opcion: OpcionCatalogo) {
    onChange(opcion.id);
    setBusqueda("");
    setMostrarLista(false);
  }

  function limpiar() {
    onChange("");
    setBusqueda("");
  }

  return (
    <div ref={contenedorRef} className="space-y-3">
      {seleccionada ? (
        <Pill etiqueta={seleccionada.nombre} onQuitar={limpiar} />
      ) : (
        <p className="text-sm text-zinc-500">{mensajeVacio}</p>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setMostrarLista(true);
          }}
          onFocus={() => setMostrarLista(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
        />

        {mostrarLista ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
            <ListaOpciones
              opciones={opcionesFiltradas}
              onElegir={elegir}
              seleccionadoId={value}
            />
          </ul>
        ) : null}
      </div>
    </div>
  );
}
