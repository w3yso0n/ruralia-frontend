"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";

const PILLS_VISIBLES = 6;

export interface OpcionCatalogo {
  id: string;
  nombre: string;
  subtitulo?: string;
}

interface BaseProps {
  opciones: OpcionCatalogo[];
  placeholder?: string;
  mensajeVacio?: string;
  /** Si está, la lista se pide al escribir al menos 2 letras. `opciones` solo etiqueta lo ya elegido. */
  buscar?: (termino: string) => Promise<OpcionCatalogo[]>;
  /** Avisa la opción elegida para que el padre conserve el nombre si el selector se desmonta. */
  alElegir?: (opcion: OpcionCatalogo) => void;
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

function ListaRemota({
  buscando,
  remoto,
  termino,
  opciones,
  onElegir,
  seleccionadoId,
}: {
  buscando: boolean;
  remoto: boolean;
  termino: string;
  opciones: OpcionCatalogo[];
  onElegir: (opcion: OpcionCatalogo) => void;
  seleccionadoId?: string;
}) {
  if (buscando) {
    return <li className="px-3 py-2 text-sm text-zinc-500">Buscando…</li>;
  }
  if (remoto && termino.length < 2) {
    return (
      <li className="px-3 py-2 text-sm text-zinc-500">
        Escribe al menos 2 letras
      </li>
    );
  }
  return (
    <ListaOpciones
      opciones={opciones}
      onElegir={onElegir}
      seleccionadoId={seleccionadoId}
    />
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
            className={`w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft ${
              seleccionadoId === opcion.id ? "bg-ruralia-teal-soft/70" : ""
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
    buscar,
    alElegir,
  } = props;

  const contenedorRef = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarLista, setMostrarLista] = useState(false);
  const [verSeleccion, setVerSeleccion] = useState(false);
  const [resultados, setResultados] = useState<OpcionCatalogo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [elegidas, setElegidas] = useState<OpcionCatalogo[]>([]);

  useEffect(() => {
    if (!buscar) return;
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setResultados([]);
      setBuscando(false);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(() => {
      setBuscando(true);
      void buscar(termino)
        .then((datos) => {
          if (!cancelado) setResultados(datos);
        })
        .catch(() => {
          if (!cancelado) setResultados([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [buscar, busqueda]);

  const catalogo = useMemo(() => {
    const mapa = new Map<string, OpcionCatalogo>();
    for (const opcion of [...opciones, ...elegidas, ...resultados]) {
      mapa.set(opcion.id, opcion);
    }
    return mapa;
  }, [opciones, elegidas, resultados]);

  const opcionesFiltradas = useMemo(
    () =>
      buscar
        ? resultados
        : opciones.filter((o) => coincideBusqueda(o, busqueda.trim())),
    [buscar, opciones, resultados, busqueda],
  );

  function recordar(opcion: OpcionCatalogo) {
    setElegidas((prev) =>
      prev.some((item) => item.id === opcion.id) ? prev : [...prev, opcion],
    );
  }

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
      recordar(opcion);
      alElegir?.(opcion);
      onChange([...value, opcion.id]);
      setBusqueda("");
    }

    function quitar(id: string) {
      onChange(value.filter((x) => x !== id));
    }

    const idsVisibles = value.slice(0, PILLS_VISIBLES);
    const hayMasPills = value.length > PILLS_VISIBLES;

    return (
      <div ref={contenedorRef} className="space-y-3">
        {value.length > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {idsVisibles.map((id) => {
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
            {hayMasPills ? (
              <button
                type="button"
                onClick={() => setVerSeleccion(true)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
              >
                Ver todos ({value.length})
              </button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{mensajeVacio}</p>
        )}

        <Modal
          abierto={verSeleccion}
          onCerrar={() => setVerSeleccion(false)}
          titulo={`Seleccionados (${value.length})`}
          ancho="lg"
        >
          {value.length === 0 ? (
            <p className="text-sm text-zinc-500">No queda nadie seleccionado.</p>
          ) : (
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {value.map((id) => {
                const opcion = catalogo.get(id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-zinc-900">
                        {opcion?.nombre ?? "Seleccionado"}
                      </span>
                      {opcion?.subtitulo ? (
                        <span className="block truncate text-xs text-zinc-500">
                          {opcion.subtitulo}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitar(id)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Modal>

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
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
          />

          {mostrarLista ? (
            <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white py-1.5 shadow-lg shadow-zinc-900/10">
              <ListaRemota
                buscando={buscando}
                remoto={!!buscar}
                termino={busqueda.trim()}
                opciones={disponibles}
                onElegir={agregar}
              />
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  const { value, onChange } = props;
  const seleccionada = value ? catalogo.get(value) : undefined;

  function elegir(opcion: OpcionCatalogo) {
    recordar(opcion);
    alElegir?.(opcion);
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
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />

        {mostrarLista ? (
          <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white py-1.5 shadow-lg shadow-zinc-900/10">
            <ListaRemota
              buscando={buscando}
              remoto={!!buscar}
              termino={busqueda.trim()}
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
