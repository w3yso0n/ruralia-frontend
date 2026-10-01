"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  listarAlcanceUsuario,
  listarDepartamentos,
  listarMunicipios,
  listarRegiones,
  listarVeredas,
  type AlcanceTerritorialItem,
  type TipoAlcanceTerritorial,
} from "@/lib/api";

export const TIPOS_ALCANCE: Array<{ id: TipoAlcanceTerritorial; nombre: string }> =
  [
    { id: "REGION", nombre: "Región" },
    { id: "DEPARTAMENTO", nombre: "Departamento" },
    { id: "MUNICIPIO", nombre: "Municipio" },
    { id: "VEREDA", nombre: "Vereda" },
  ];

type Opcion = { id: string; nombre: string; subtitulo?: string };

function etiquetaTipo(tipo: TipoAlcanceTerritorial): string {
  return TIPOS_ALCANCE.find((t) => t.id === tipo)?.nombre ?? tipo;
}

export function PillsAlcance({
  items,
  onQuitar,
}: {
  items: AlcanceTerritorialItem[];
  onQuitar?: (item: AlcanceTerritorialItem) => void;
}) {
  if (!items.length) {
    return <p className="text-sm text-zinc-500">Sin territorio asignado.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={`${item.tipo}-${item.referenciaId}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ruralia-teal-border bg-white py-1 pl-3 pr-1.5 text-sm text-zinc-800"
        >
          <span className="text-xs font-semibold text-ruralia-teal-text">
            {etiquetaTipo(item.tipo)}
          </span>
          <span className="truncate">{item.nombre ?? item.referenciaId}</span>
          {onQuitar ? (
            <button
              type="button"
              onClick={() => onQuitar(item)}
              className="shrink-0 rounded-full p-0.5 text-zinc-500 transition hover:bg-ruralia-teal-soft hover:text-zinc-800"
              aria-label="Quitar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}

interface EditorAlcanceTerritorialProps {
  token: string;
  usuarioId: string;
  /** Solo se llama después de leer el territorio guardado. */
  onChange?: (items: AlcanceTerritorialItem[]) => void;
}

export function EditorAlcanceTerritorial({
  token,
  usuarioId,
  onChange,
}: EditorAlcanceTerritorialProps) {
  const [items, setItems] = useState<AlcanceTerritorialItem[]>([]);
  const [cargado, setCargado] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoAlcanceTerritorial>("DEPARTAMENTO");
  const [catalogo, setCatalogo] = useState<Opcion[]>([]);
  const [departamentos, setDepartamentos] = useState<Opcion[]>([]);
  const [departamento, setDepartamento] = useState<Opcion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargandoOpciones, setCargandoOpciones] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargado(false);
    setErrorCarga(null);
    void listarAlcanceUsuario(token, usuarioId)
      .then((datos) => {
        if (cancelado) return;
        setItems(datos);
        setCargado(true);
      })
      .catch(() => {
        if (!cancelado) {
          setErrorCarga("No se pudo leer el territorio guardado");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [token, usuarioId]);

  useEffect(() => {
    if (cargado) onChange?.(items);
  }, [cargado, items, onChange]);

  useEffect(() => {
    setBusqueda("");
    setCatalogo([]);
    setDepartamento(null);
    if (tipo === "VEREDA") return;
    setCargandoOpciones(true);
    const cargar =
      tipo === "REGION"
        ? listarRegiones(token, false)
        : listarDepartamentos(token, { incluirInactivos: false });
    void cargar
      .then((datos) => {
        const opciones = datos.map((n) => ({ id: n.id, nombre: n.nombre }));
        if (tipo === "MUNICIPIO") setDepartamentos(opciones);
        else setCatalogo(opciones);
      })
      .catch(() => setCatalogo([]))
      .finally(() => setCargandoOpciones(false));
  }, [tipo, token]);

  useEffect(() => {
    if (tipo !== "MUNICIPIO" || !departamento) return;
    setCargandoOpciones(true);
    void listarMunicipios(token, departamento.id, false)
      .then((datos) =>
        setCatalogo(
          datos.map((n) => ({
            id: n.id,
            nombre: n.nombre,
            subtitulo: departamento.nombre,
          })),
        ),
      )
      .catch(() => setCatalogo([]))
      .finally(() => setCargandoOpciones(false));
  }, [departamento, tipo, token]);

  useEffect(() => {
    if (tipo !== "VEREDA") return;
    const termino = busqueda.trim();
    if (termino.length < 2) {
      setCatalogo([]);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(() => {
      setCargandoOpciones(true);
      void listarVeredas(token, { busqueda: termino, soloDane: true, limite: 30 })
        .then((respuesta) => {
          if (cancelado) return;
          setCatalogo(
            respuesta.datos.map((vereda) => ({
              id: vereda.id,
              nombre: vereda.nombre,
              subtitulo: [vereda.municipioNombre, vereda.departamentoNombre]
                .filter(Boolean)
                .join(", "),
            })),
          );
        })
        .catch(() => {
          if (!cancelado) setCatalogo([]);
        })
        .finally(() => {
          if (!cancelado) setCargandoOpciones(false);
        });
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [busqueda, tipo, token]);

  const termino = busqueda.trim().toLowerCase();
  const eligiendoDepartamento = tipo === "MUNICIPIO" && !departamento;
  const fuente = eligiendoDepartamento ? departamentos : catalogo;
  const visibles = useMemo(() => {
    const filtradas =
      tipo === "VEREDA" || !termino
        ? fuente
        : fuente.filter((opcion) => opcion.nombre.toLowerCase().includes(termino));
    if (eligiendoDepartamento) return filtradas;
    return filtradas.filter(
      (opcion) =>
        !items.some(
          (item) => item.tipo === tipo && item.referenciaId === opcion.id,
        ),
    );
  }, [eligiendoDepartamento, fuente, items, termino, tipo]);

  function elegir(opcion: Opcion) {
    if (eligiendoDepartamento) {
      setDepartamento(opcion);
      setBusqueda("");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        tipo,
        referenciaId: opcion.id,
        nombre: opcion.subtitulo
          ? `${opcion.nombre} (${opcion.subtitulo})`
          : opcion.nombre,
      },
    ]);
  }

  function quitar(item: AlcanceTerritorialItem) {
    setItems((prev) =>
      prev.filter(
        (actual) =>
          !(actual.tipo === item.tipo && actual.referenciaId === item.referenciaId),
      ),
    );
  }

  const placeholder =
    tipo === "VEREDA"
      ? "Buscar vereda DANE (mínimo 2 letras)"
      : eligiendoDepartamento
        ? "Buscar departamento"
        : `Buscar ${etiquetaTipo(tipo).toLowerCase()}`;

  return (
    <div className="rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-4">
      <p className="text-sm font-medium text-zinc-800">Territorio del coordinador</p>
      <p className="mt-1 text-xs text-zinc-500">
        Solo verá proyectos con veredas dentro de estas zonas. Antioquia y los
        demás departamentos se eligen en Departamento. Se guarda al pulsar
        Guardar del usuario.
      </p>

      <div className="mt-3">
        {errorCarga ? (
          <p className="text-sm text-red-600">{errorCarga}</p>
        ) : !cargado ? (
          <p className="text-sm text-zinc-500">Cargando territorio…</p>
        ) : (
          <PillsAlcance items={items} onQuitar={quitar} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TIPOS_ALCANCE.map((opcion) => (
          <button
            key={opcion.id}
            type="button"
            onClick={() => setTipo(opcion.id)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
              tipo === opcion.id
                ? "bg-ruralia-teal text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {opcion.nombre}
          </button>
        ))}
      </div>

      {tipo === "MUNICIPIO" && departamento ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
          <span>
            Municipios de <strong>{departamento.nombre}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setDepartamento(null);
              setCatalogo([]);
              setBusqueda("");
            }}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
          >
            Cambiar departamento
          </button>
        </div>
      ) : null}

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
      />

      <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-white">
        {cargandoOpciones ? (
          <li className="px-4 py-2.5 text-sm text-zinc-500">Cargando…</li>
        ) : visibles.length === 0 ? (
          <li className="px-4 py-2.5 text-sm text-zinc-400">
            {tipo === "VEREDA" && termino.length < 2
              ? "Escribe al menos 2 letras"
              : "Sin resultados"}
          </li>
        ) : (
          visibles.map((opcion) => (
            <li key={opcion.id}>
              <button
                type="button"
                disabled={!cargado}
                onClick={() => elegir(opcion)}
                className="flex w-full flex-col px-4 py-2.5 text-left text-sm transition hover:bg-ruralia-teal-soft disabled:opacity-50"
              >
                <span className="font-medium text-zinc-900">{opcion.nombre}</span>
                {opcion.subtitulo ? (
                  <span className="text-xs text-zinc-500">{opcion.subtitulo}</span>
                ) : null}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
