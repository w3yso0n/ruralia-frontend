"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ClipboardList,
  Hash,
  MapPin,
  Paperclip,
  PenLine,
  Plus,
  Table2,
  ToggleLeft,
  Trash2,
  Type,
  User,
  Users,
} from "lucide-react";
import {
  EditorOpciones,
  opcionesDesdeTexto,
  textoDesdeOpciones,
} from "@/components/formularios/editor-opciones";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  actualizarPlantillaFormulario,
  crearPlantillaFormulario,
  listarProyectos,
  listarUsuarios,
  obtenerPlanProyecto,
  obtenerPlantillaFormulario,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  CampoFormularioPayload,
  ColumnaCampoTabla,
  Proyecto,
  TipoCampoColumnaTabla,
  TipoCampoFormulario,
  TipoPlantillaFormulario,
  Usuario,
} from "@/lib/types";

interface EditorPlantillaFormularioProps {
  plantillaId?: string;
}

interface OpcionProceso {
  id: string;
  etiqueta: string;
}

interface GrupoProyecto {
  proyecto: Proyecto;
  procesos: OpcionProceso[];
}

interface ColumnaEnEdicion extends ColumnaCampoTabla {
  claveOpciones: string;
}

interface CampoEnEdicion extends CampoFormularioPayload {
  claveOpciones: string;
  columnas: ColumnaEnEdicion[];
}

const TIPOS_CAMPO_BASE: {
  valor: TipoCampoFormulario;
  etiqueta: string;
  pista: string;
  icono: typeof Type;
}[] = [
  { valor: "TEXTO", etiqueta: "Texto", pista: "Nombre, observaciones…", icono: Type },
  { valor: "NUMERO", etiqueta: "Número", pista: "Cantidades", icono: Hash },
  { valor: "FECHA", etiqueta: "Fecha", pista: "Día del evento", icono: Calendar },
  { valor: "SI_NO", etiqueta: "Sí / No", pista: "Pregunta cerrada", icono: ToggleLeft },
  {
    valor: "SELECCION_UNICA",
    etiqueta: "Una opción",
    pista: "Elige una de la lista",
    icono: CircleDot,
  },
  {
    valor: "SELECCION_MULTIPLE",
    etiqueta: "Varias opciones",
    pista: "Puede marcar varias",
    icono: CheckSquare,
  },
  { valor: "GPS", etiqueta: "Ubicación", pista: "Punto en el mapa", icono: MapPin },
  { valor: "FOTO", etiqueta: "Foto", pista: "Cámara o galería", icono: Camera },
  { valor: "FIRMA", etiqueta: "Firma", pista: "Dibujo a mano", icono: PenLine },
  {
    valor: "ARCHIVO",
    etiqueta: "Archivo",
    pista: "Documento adjunto",
    icono: Paperclip,
  },
];

const TIPO_TABLA = {
  valor: "TABLA" as TipoCampoFormulario,
  etiqueta: "Lista de personas",
  pista: "Varias filas: nombre, firma…",
  icono: Table2,
};

const TIPOS_COLUMNA_TABLA: {
  valor: TipoCampoColumnaTabla;
  etiqueta: string;
}[] = [
  { valor: "TEXTO", etiqueta: "Texto" },
  { valor: "NUMERO", etiqueta: "Número" },
  { valor: "FECHA", etiqueta: "Fecha" },
  { valor: "SI_NO", etiqueta: "Sí / No" },
  { valor: "SELECCION_UNICA", etiqueta: "Una opción" },
  { valor: "FIRMA", etiqueta: "Firma" },
];

const TIPOS_CON_OPCIONES: TipoCampoFormulario[] = [
  "SELECCION_UNICA",
  "SELECCION_MULTIPLE",
];

function columnaVacia(): ColumnaEnEdicion {
  return {
    etiqueta: "",
    clave: "",
    tipoCampo: "TEXTO",
    esObligatorio: false,
    claveOpciones: "",
  };
}

function campoVacio(orden: number): CampoEnEdicion {
  return {
    etiqueta: "",
    clave: "",
    tipoCampo: "TEXTO",
    esObligatorio: false,
    orden,
    claveOpciones: "",
    columnas: [],
  };
}

function generarClave(etiqueta: string): string {
  return etiqueta
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clavesUnicasDesdeEtiquetas(etiquetas: string[]): string[] {
  return asegurarClavesUnicas(
    etiquetas.map(
      (etiqueta, indice) => generarClave(etiqueta) || `col_${indice + 1}`,
    ),
  );
}

function asegurarClavesUnicas(claves: string[]): string[] {
  const usadas = new Set<string>();
  return claves.map((raw, indice) => {
    const base = (raw || `campo_${indice + 1}`).trim() || `campo_${indice + 1}`;
    let clave = base;
    let n = 2;
    while (usadas.has(clave)) {
      clave = `${base}_${n}`;
      n += 1;
    }
    usadas.add(clave);
    return clave;
  });
}

function parsearColumnas(
  opciones: CampoFormularioPayload["opciones"],
): ColumnaEnEdicion[] {
  const columnas = (opciones as { columnas?: ColumnaCampoTabla[] } | undefined)
    ?.columnas;
  if (!Array.isArray(columnas)) return [columnaVacia()];
  const claves = clavesUnicasDesdeEtiquetas(
    columnas.map((col) => col.etiqueta || col.clave || ""),
  );
  return columnas.map((col, i) => ({
    clave: claves[i],
    etiqueta: col.etiqueta,
    tipoCampo: col.tipoCampo,
    esObligatorio: col.esObligatorio ?? false,
    claveOpciones: Array.isArray(col.opciones?.valores)
      ? col.opciones.valores.join("\n")
      : "",
  }));
}

function Interruptor({
  checked,
  onChange,
  etiqueta,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-sm text-zinc-700"
    >
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          checked ? "bg-ruralia-teal" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-[left] ${
            checked ? "left-4.5" : "left-0.5"
          }`}
        />
      </span>
      {etiqueta}
    </button>
  );
}

function SelectorTipoCampo({
  valor,
  onChange,
  tipos,
}: {
  valor: TipoCampoFormulario;
  onChange: (tipo: TipoCampoFormulario) => void;
  tipos: Array<{
    valor: TipoCampoFormulario;
    etiqueta: string;
    pista: string;
    icono: typeof Type;
  }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tipos.map((tipo) => {
        const Icono = tipo.icono;
        const activo = valor === tipo.valor;
        return (
          <button
            key={tipo.valor}
            type="button"
            onClick={() => onChange(tipo.valor)}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
              activo
                ? "border-ruralia-teal bg-ruralia-teal-soft/60 ring-2 ring-ruralia-teal/20"
                : "border-zinc-200 bg-white hover:border-ruralia-teal-border"
            }`}
          >
            <Icono
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                activo ? "text-ruralia-teal" : "text-zinc-400"
              }`}
            />
            <span className="min-w-0">
              <span
                className={`block text-sm font-semibold ${
                  activo ? "text-ruralia-teal-text" : "text-zinc-800"
                }`}
              >
                {tipo.etiqueta}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                {tipo.pista}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VistaPreviaCampo({ campo }: { campo: CampoEnEdicion }) {
  const opciones = opcionesDesdeTexto(campo.claveOpciones);
  const pregunta = campo.etiqueta.trim() || "Así se verá la pregunta";

  return (
    <div className="rounded-xl bg-zinc-50 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        Vista previa
      </p>
      <p className="mb-2 text-sm font-medium text-zinc-800">
        {pregunta}
        {campo.esObligatorio ? (
          <span className="ml-1 text-red-500">*</span>
        ) : null}
      </p>
      {campo.tipoCampo === "TEXTO" || campo.tipoCampo === "NUMERO" ? (
        <div className="h-9 rounded-lg border border-dashed border-zinc-200 bg-white px-3 text-sm leading-9 text-zinc-400">
          {campo.tipoCampo === "NUMERO" ? "0" : "Escribir aquí…"}
        </div>
      ) : null}
      {campo.tipoCampo === "FECHA" ? (
        <div className="h-9 rounded-lg border border-dashed border-zinc-200 bg-white px-3 text-sm leading-9 text-zinc-400">
          dd / mm / aaaa
        </div>
      ) : null}
      {campo.tipoCampo === "SI_NO" ? (
        <div className="flex gap-2">
          {["Sí", "No"].map((op) => (
            <span
              key={op}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600"
            >
              {op}
            </span>
          ))}
        </div>
      ) : null}
      {campo.tipoCampo === "SELECCION_UNICA" ? (
        <div className="space-y-1.5">
          {(opciones.length ? opciones : ["Opción A", "Opción B"]).map((op) => (
            <label key={op} className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="h-3.5 w-3.5 rounded-full border border-zinc-300" />
              {op}
            </label>
          ))}
        </div>
      ) : null}
      {campo.tipoCampo === "SELECCION_MULTIPLE" ? (
        <div className="space-y-1.5">
          {(opciones.length ? opciones : ["Opción A", "Opción B"]).map((op) => (
            <label key={op} className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="h-3.5 w-3.5 rounded border border-zinc-300" />
              {op}
            </label>
          ))}
        </div>
      ) : null}
      {campo.tipoCampo === "GPS" ? (
        <p className="text-xs text-zinc-500">Botón para marcar ubicación</p>
      ) : null}
      {campo.tipoCampo === "FOTO" || campo.tipoCampo === "ARCHIVO" ? (
        <p className="text-xs text-zinc-500">
          {campo.tipoCampo === "FOTO" ? "Tomar o subir una foto" : "Adjuntar un archivo"}
        </p>
      ) : null}
      {campo.tipoCampo === "FIRMA" ? (
        <div className="h-14 rounded-lg border border-dashed border-zinc-200 bg-white text-center text-xs leading-[3.5rem] text-zinc-400">
          Área para firmar
        </div>
      ) : null}
      {campo.tipoCampo === "TABLA" ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead>
              <tr>
                {(campo.columnas.length
                  ? campo.columnas
                  : [{ etiqueta: "Nombre" }, { etiqueta: "Firma" }]
                ).map((col, i) => (
                  <th key={i} className="border-b border-zinc-200 py-1 pr-3 font-medium">
                    {col.etiqueta.trim() || `Columna ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {(campo.columnas.length ? campo.columnas : [1, 2]).map((_, i) => (
                  <td key={i} className="py-1.5 pr-3 text-zinc-400">
                    —
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function EditorPlantillaFormulario({
  plantillaId,
}: EditorPlantillaFormularioProps) {
  const router = useRouter();
  const { token } = useAuth();
  const esEdicion = Boolean(plantillaId);

  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipoPlantilla, setTipoPlantilla] =
    useState<TipoPlantillaFormulario>("INDIVIDUAL");
  const [estaActivo, setEstaActivo] = useState(false);

  const [grupos, setGrupos] = useState<GrupoProyecto[]>([]);
  const [procesoIds, setProcesoIds] = useState<string[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);

  const [campos, setCampos] = useState<CampoEnEdicion[]>([campoVacio(0)]);
  const [mostrarAsignacion, setMostrarAsignacion] = useState(false);

  useEffect(() => {
    if (!token) return;
    listarProyectos(token, { limite: 100 })
      .then(async (respuesta) => {
        const gruposCargados: GrupoProyecto[] = [];
        for (const proyecto of respuesta.datos) {
          const plan = await obtenerPlanProyecto(token, proyecto.id);
          const procesos: OpcionProceso[] = [];
          for (const actividad of plan.actividades) {
            for (const sub of actividad.subactividades ?? []) {
              for (const proceso of sub.procesos ?? []) {
                procesos.push({
                  id: proceso.id,
                  etiqueta: `${actividad.nombre} — ${sub.nombre} — ${proceso.nombre}`,
                });
              }
            }
          }
          if (procesos.length) {
            gruposCargados.push({ proyecto, procesos });
          }
        }
        setGrupos(gruposCargados);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar proyectos"),
      );
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listarUsuarios(token, { limite: 100, estaActivo: true })
      .then((r) => setUsuarios(r.datos))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar usuarios"),
      );
  }, [token]);

  useEffect(() => {
    if (!esEdicion || !token || !plantillaId) return;
    setCargando(true);
    obtenerPlantillaFormulario(token, plantillaId)
      .then((plantilla) => {
        setNombre(plantilla.nombre);
        setDescripcion(plantilla.descripcion ?? "");
        setTipoPlantilla(plantilla.tipoPlantilla ?? "INDIVIDUAL");
        setEstaActivo(plantilla.estaActivo);
        setProcesoIds(plantilla.procesoIds ?? []);
        setUsuarioIds(plantilla.usuarioIds ?? []);
        if (
          (plantilla.procesoIds?.length ?? 0) > 0 ||
          (plantilla.usuarioIds?.length ?? 0) > 0
        ) {
          setMostrarAsignacion(true);
        }
        setCampos(
          (plantilla.campos ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((campo) => ({
              id: campo.id,
              etiqueta: campo.etiqueta,
              clave: campo.clave,
              tipoCampo: campo.tipoCampo,
              esObligatorio: campo.esObligatorio,
              orden: campo.orden,
              opciones: campo.opciones,
              claveOpciones: Array.isArray(
                (campo.opciones as { valores?: string[] } | undefined)
                  ?.valores,
              )
                ? ((campo.opciones as { valores?: string[] }).valores ?? []).join(
                    "\n",
                  )
                : "",
              columnas:
                campo.tipoCampo === "TABLA"
                  ? parsearColumnas(campo.opciones)
                  : [],
            })),
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar plantilla"),
      )
      .finally(() => setCargando(false));
  }, [esEdicion, token, plantillaId]);

  function alternarProceso(id: string) {
    setProcesoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function alternarUsuario(id: string) {
    setUsuarioIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  }

  function actualizarCampo(indice: number, cambios: Partial<CampoEnEdicion>) {
    setCampos((prev) => {
      const actualizados = prev.map((campo, i) => {
        if (i !== indice) return campo;
        const siguiente = { ...campo, ...cambios };
        if (
          cambios.tipoCampo === "TABLA" &&
          (!siguiente.columnas || siguiente.columnas.length === 0)
        ) {
          siguiente.columnas = [columnaVacia()];
        }
        if (cambios.tipoCampo && cambios.tipoCampo !== "TABLA") {
          siguiente.columnas = [];
        }
        if (
          !campo.id &&
          cambios.etiqueta !== undefined &&
          cambios.clave === undefined
        ) {
          siguiente.clave = generarClave(cambios.etiqueta);
        }
        return siguiente;
      });

      if (
        (!prev[indice]?.id && cambios.etiqueta !== undefined) ||
        cambios.clave !== undefined
      ) {
        const claves = asegurarClavesUnicas(
          actualizados.map(
            (campo, i) =>
              campo.clave || generarClave(campo.etiqueta) || `campo_${i + 1}`,
          ),
        );
        return actualizados.map((campo, i) => ({ ...campo, clave: claves[i] }));
      }

      return actualizados;
    });
  }

  function actualizarColumna(
    indiceCampo: number,
    indiceColumna: number,
    cambios: Partial<ColumnaEnEdicion>,
  ) {
    setCampos((prev) =>
      prev.map((campo, i) => {
        if (i !== indiceCampo) return campo;
        return {
          ...campo,
          columnas: campo.columnas.map((col, j) =>
            j === indiceColumna ? { ...col, ...cambios } : col,
          ),
        };
      }),
    );
  }

  function agregarColumna(indiceCampo: number) {
    setCampos((prev) =>
      prev.map((campo, i) =>
        i === indiceCampo
          ? { ...campo, columnas: [...campo.columnas, columnaVacia()] }
          : campo,
      ),
    );
  }

  function eliminarColumna(indiceCampo: number, indiceColumna: number) {
    setCampos((prev) =>
      prev.map((campo, i) => {
        if (i !== indiceCampo) return campo;
        if (campo.columnas.length <= 1) return campo;
        return {
          ...campo,
          columnas: campo.columnas.filter((_, j) => j !== indiceColumna),
        };
      }),
    );
  }

  function cambiarTipoPlantilla(tipo: TipoPlantillaFormulario) {
    setTipoPlantilla(tipo);
    if (tipo === "INDIVIDUAL") {
      setCampos((prev) =>
        prev.map((campo) =>
          campo.tipoCampo === "TABLA"
            ? { ...campo, tipoCampo: "TEXTO", columnas: [] }
            : campo,
        ),
      );
    }
  }

  function agregarCampo() {
    setCampos((prev) => [...prev, campoVacio(prev.length)]);
  }

  function eliminarCampo(indice: number) {
    setCampos((prev) =>
      prev
        .filter((_, i) => i !== indice)
        .map((campo, i) => ({ ...campo, orden: i })),
    );
  }

  function moverCampo(indice: number, direccion: -1 | 1) {
    setCampos((prev) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia.map((campo, i) => ({ ...campo, orden: i }));
    });
  }

  async function manejarGuardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token) return;
    setGuardando(true);
    setError(null);

    try {
      const camposPayload: CampoFormularioPayload[] = campos.map(
        (campo, indice) => {
          let opciones: Record<string, unknown> | undefined;

          if (campo.tipoCampo === "TABLA") {
            const claves = clavesUnicasDesdeEtiquetas(
              campo.columnas.map((col) => col.etiqueta),
            );
            opciones = {
              columnas: campo.columnas.map((col, iCol) => {
                const base: ColumnaCampoTabla = {
                  clave: claves[iCol],
                  etiqueta: col.etiqueta,
                  tipoCampo: col.tipoCampo,
                  esObligatorio: col.esObligatorio ?? false,
                };
                if (col.tipoCampo === "SELECCION_UNICA") {
                  base.opciones = {
                    valores: opcionesDesdeTexto(col.claveOpciones),
                  };
                }
                return base;
              }),
            };
          } else if (TIPOS_CON_OPCIONES.includes(campo.tipoCampo)) {
            opciones = {
              valores: opcionesDesdeTexto(campo.claveOpciones),
            };
          }

          return {
            id: campo.id,
            etiqueta: campo.etiqueta,
            clave: campo.clave || generarClave(campo.etiqueta),
            tipoCampo: campo.tipoCampo,
            esObligatorio: campo.esObligatorio,
            orden: indice,
            opciones,
          };
        },
      );

      const clavesFinales = asegurarClavesUnicas(
        camposPayload.map(
          (campo, indice) =>
            campo.clave || generarClave(campo.etiqueta) || `campo_${indice + 1}`,
        ),
      );
      for (let i = 0; i < camposPayload.length; i += 1) {
        camposPayload[i].clave = clavesFinales[i];
      }

      if (esEdicion && plantillaId) {
        await actualizarPlantillaFormulario(token, plantillaId, {
          nombre,
          descripcion: descripcion || undefined,
          tipoPlantilla,
          procesoIds,
          usuarioIds,
          campos: camposPayload,
        });
      } else {
        await crearPlantillaFormulario(token, {
          nombre,
          descripcion: descripcion || undefined,
          tipoPlantilla,
          procesoIds,
          usuarioIds,
          campos: camposPayload,
        });
      }
      router.push("/formularios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la plantilla");
    } finally {
      setGuardando(false);
    }
  }

  const tiposDisponibles =
    tipoPlantilla === "GRUPAL"
      ? [...TIPOS_CAMPO_BASE, TIPO_TABLA]
      : TIPOS_CAMPO_BASE;

  if (cargando) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/formularios"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ruralia-teal-text hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a formularios
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {esEdicion ? "Editar formulario" : "Crear formulario"}
          </h2>
          <p className="mt-1 text-zinc-600">
            Escribe las preguntas como las verá el técnico en el celular.
          </p>
        </div>
        {esEdicion ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              estaActivo
                ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {estaActivo ? "En uso" : "Borrador"}
          </span>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <form onSubmit={manejarGuardar} className="space-y-6">
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-base font-semibold text-zinc-900">
            1. Datos del formulario
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Visita de seguimiento agrícola"
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nota interna{" "}
                <span className="font-normal text-zinc-400">(opcional)</span>
              </label>
              <input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Para recordar para qué sirve. No la ve el técnico."
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">
                ¿Quién responde?
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => cambiarTipoPlantilla("INDIVIDUAL")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    tipoPlantilla === "INDIVIDUAL"
                      ? "border-ruralia-teal bg-ruralia-teal-soft/50 ring-2 ring-ruralia-teal/20"
                      : "border-zinc-200 hover:border-ruralia-teal-border"
                  }`}
                >
                  <User className="mt-0.5 h-5 w-5 shrink-0 text-ruralia-teal" />
                  <span>
                    <span className="block font-semibold text-zinc-900">
                      Una persona
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">
                      El técnico llena el formulario una vez por visita.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => cambiarTipoPlantilla("GRUPAL")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    tipoPlantilla === "GRUPAL"
                      ? "border-ruralia-teal bg-ruralia-teal-soft/50 ring-2 ring-ruralia-teal/20"
                      : "border-zinc-200 hover:border-ruralia-teal-border"
                  }`}
                >
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-ruralia-teal" />
                  <span>
                    <span className="block font-semibold text-zinc-900">
                      Varias personas
                    </span>
                    <span className="mt-0.5 block text-sm text-zinc-500">
                      Lista de asistencia: varias filas (nombre, firma, etc.).
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                2. Preguntas
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {tipoPlantilla === "GRUPAL"
                  ? "Puedes mezclar datos del evento (fecha, lugar) con una lista de personas."
                  : "Agrega cada pregunta y elige cómo se responde."}
              </p>
            </div>
            <button
              type="button"
              onClick={agregarCampo}
              className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
            >
              <Plus className="h-4 w-4" />
              Nueva pregunta
            </button>
          </div>

          <div className="space-y-4">
            {campos.map((campo, indice) => (
              <article
                key={campo.id ?? `nuevo-${indice}`}
                className="rounded-2xl border border-zinc-200 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ruralia-teal-soft px-2 text-xs font-bold text-ruralia-teal-text">
                    {indice + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moverCampo(indice, -1)}
                      disabled={indice === 0}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Subir"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moverCampo(indice, 1)}
                      disabled={indice === campos.length - 1}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Bajar"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCampo(indice)}
                      disabled={campos.length === 1}
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      aria-label="Eliminar pregunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  {campo.tipoCampo === "TABLA"
                    ? "Nombre de la lista"
                    : "Pregunta"}
                </label>
                <input
                  required
                  value={campo.etiqueta}
                  onChange={(e) =>
                    actualizarCampo(indice, { etiqueta: e.target.value })
                  }
                  placeholder={
                    campo.tipoCampo === "TABLA"
                      ? "Ej: Listado de asistencia"
                      : "Ej: ¿Cuántas hectáreas se sembraron?"
                  }
                  className="mb-4 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
                />

                <p className="mb-2 text-sm font-medium text-zinc-700">
                  Cómo se responde
                </p>
                <SelectorTipoCampo
                  valor={campo.tipoCampo}
                  onChange={(tipoCampo) =>
                    actualizarCampo(indice, { tipoCampo })
                  }
                  tipos={tiposDisponibles}
                />

                {TIPOS_CON_OPCIONES.includes(campo.tipoCampo) ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-zinc-700">
                      Opciones de respuesta
                    </p>
                    <EditorOpciones
                      valores={opcionesDesdeTexto(campo.claveOpciones)}
                      onChange={(valores) =>
                        actualizarCampo(indice, {
                          claveOpciones: textoDesdeOpciones(valores),
                        })
                      }
                      placeholder="Ej: Maíz"
                    />
                  </div>
                ) : null}

                {campo.tipoCampo === "TABLA" ? (
                  <div className="mt-4 space-y-3 rounded-xl bg-zinc-50 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-800">
                        Columnas de cada fila
                      </p>
                      <button
                        type="button"
                        onClick={() => agregarColumna(indice)}
                        className="inline-flex items-center gap-1 rounded-lg border border-ruralia-teal-border bg-white px-2.5 py-1 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Columna
                      </button>
                    </div>
                    {campo.columnas.map((columna, indiceCol) => (
                      <div
                        key={indiceCol}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-500">
                            Columna {indiceCol + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => eliminarColumna(indice, indiceCol)}
                            disabled={campo.columnas.length <= 1}
                            className="text-xs font-medium text-red-500 hover:underline disabled:opacity-30"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-600">
                              Título
                            </label>
                            <input
                              required
                              value={columna.etiqueta}
                              onChange={(e) =>
                                actualizarColumna(indice, indiceCol, {
                                  etiqueta: e.target.value,
                                  clave: generarClave(e.target.value),
                                })
                              }
                              placeholder="Ej: Nombre"
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-600">
                              Cómo se llena
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {TIPOS_COLUMNA_TABLA.map((tipo) => {
                                const activo = columna.tipoCampo === tipo.valor;
                                return (
                                  <button
                                    key={tipo.valor}
                                    type="button"
                                    onClick={() =>
                                      actualizarColumna(indice, indiceCol, {
                                        tipoCampo: tipo.valor,
                                      })
                                    }
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                      activo
                                        ? "bg-ruralia-teal text-white"
                                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                    }`}
                                  >
                                    {tipo.etiqueta}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        {columna.tipoCampo === "SELECCION_UNICA" ? (
                          <div className="mt-3">
                            <p className="mb-1.5 text-xs font-medium text-zinc-600">
                              Opciones
                            </p>
                            <EditorOpciones
                              valores={opcionesDesdeTexto(columna.claveOpciones)}
                              onChange={(valores) =>
                                actualizarColumna(indice, indiceCol, {
                                  claveOpciones: textoDesdeOpciones(valores),
                                })
                              }
                            />
                          </div>
                        ) : null}
                        <div className="mt-3">
                          <Interruptor
                            checked={columna.esObligatorio ?? false}
                            onChange={(v) =>
                              actualizarColumna(indice, indiceCol, {
                                esObligatorio: v,
                              })
                            }
                            etiqueta="Obligatoria"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Interruptor
                    checked={campo.esObligatorio ?? false}
                    onChange={(v) =>
                      actualizarCampo(indice, { esObligatorio: v })
                    }
                    etiqueta={
                      campo.tipoCampo === "TABLA"
                        ? "Hay que llenar al menos una fila"
                        : "Pregunta obligatoria"
                    }
                  />
                </div>

                <div className="mt-4">
                  <VistaPreviaCampo campo={campo} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <button
            type="button"
            onClick={() => setMostrarAsignacion((v) => !v)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-base font-semibold text-zinc-900">
                3. Dónde se usa{" "}
                <span className="font-normal text-zinc-400">(opcional)</span>
              </span>
              <span className="mt-0.5 block text-sm text-zinc-500">
                Si lo dejas vacío, luego lo asignas desde la lista de formularios.
              </span>
            </span>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-zinc-400 transition ${
                mostrarAsignacion ? "rotate-180" : ""
              }`}
            />
          </button>

          {mostrarAsignacion ? (
            <div className="mt-5 space-y-6 border-t border-zinc-100 pt-5">
              <div>
                <p className="mb-1 text-sm font-medium text-zinc-800">
                  Procesos del plan
                </p>
                <p className="mb-3 text-xs text-zinc-500">
                  El técnico lo verá al registrar jornadas de esos procesos.
                </p>
                {grupos.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Todavía no hay procesos en los proyectos. Se configuran en
                    Plan del proyecto.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {grupos.map((grupo) => (
                      <div key={grupo.proyecto.id}>
                        <p className="mb-2 text-xs font-semibold text-zinc-500">
                          {grupo.proyecto.nombre}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {grupo.procesos.map((proceso) => (
                            <button
                              key={proceso.id}
                              type="button"
                              onClick={() => alternarProceso(proceso.id)}
                              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                                procesoIds.includes(proceso.id)
                                  ? "bg-ruralia-teal text-white"
                                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                              }`}
                            >
                              {proceso.etiqueta}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-zinc-800">
                  Personas concretas
                </p>
                <p className="mb-3 text-xs text-zinc-500">
                  Para encuestas que no van ligadas a una jornada.
                </p>
                {usuarios.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No hay usuarios activos todavía.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {usuarios.map((usuario) => (
                      <button
                        key={usuario.id}
                        type="button"
                        onClick={() => alternarUsuario(usuario.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          usuarioIds.includes(usuario.id)
                            ? "bg-ruralia-teal text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {usuario.nombreCompleto}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/formularios")}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ruralia-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-60"
          >
            <ClipboardList className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar formulario"}
          </button>
        </div>
      </form>
    </div>
  );
}
