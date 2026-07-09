"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Proyecto,
  TipoCampoFormulario,
  Usuario,
} from "@/lib/types";

interface EditorPlantillaFormularioProps {
  plantillaId?: string;
}

interface OpcionSubactividad {
  id: string;
  etiqueta: string;
}

interface GrupoProyecto {
  proyecto: Proyecto;
  subactividades: OpcionSubactividad[];
}

interface CampoEnEdicion extends CampoFormularioPayload {
  claveOpciones: string;
}

const TIPOS_CAMPO: { valor: TipoCampoFormulario; etiqueta: string }[] = [
  { valor: "TEXTO", etiqueta: "Texto corto" },
  { valor: "NUMERO", etiqueta: "Número" },
  { valor: "FECHA", etiqueta: "Fecha" },
  { valor: "SI_NO", etiqueta: "Sí / No" },
  { valor: "SELECCION_UNICA", etiqueta: "Selección única" },
  { valor: "SELECCION_MULTIPLE", etiqueta: "Selección múltiple" },
  { valor: "GPS", etiqueta: "Ubicación GPS" },
  { valor: "FOTO", etiqueta: "Foto" },
  { valor: "FIRMA", etiqueta: "Firma" },
  { valor: "ARCHIVO", etiqueta: "Archivo adjunto" },
];

const TIPOS_CON_OPCIONES: TipoCampoFormulario[] = [
  "SELECCION_UNICA",
  "SELECCION_MULTIPLE",
];

function campoVacio(orden: number): CampoEnEdicion {
  return {
    etiqueta: "",
    clave: "",
    tipoCampo: "TEXTO",
    esObligatorio: false,
    orden,
    claveOpciones: "",
  };
}

function generarClave(etiqueta: string): string {
  return etiqueta
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
  const [estaActivo, setEstaActivo] = useState(false);

  const [grupos, setGrupos] = useState<GrupoProyecto[]>([]);
  const [subactividadIds, setSubactividadIds] = useState<string[]>([]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);

  const [campos, setCampos] = useState<CampoEnEdicion[]>([campoVacio(0)]);

  useEffect(() => {
    if (!token) return;
    listarProyectos(token, { limite: 100 })
      .then(async (respuesta) => {
        const gruposCargados: GrupoProyecto[] = [];
        for (const proyecto of respuesta.datos) {
          const plan = await obtenerPlanProyecto(token, proyecto.id);
          const subactividades: OpcionSubactividad[] = [];
          for (const actividad of plan.actividades) {
            for (const sub of actividad.subactividades ?? []) {
              subactividades.push({
                id: sub.id,
                etiqueta: `${actividad.nombre} — ${sub.nombre}`,
              });
            }
          }
          if (subactividades.length) {
            gruposCargados.push({ proyecto, subactividades });
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
        setEstaActivo(plantilla.estaActivo);
        setSubactividadIds(plantilla.subactividadIds ?? []);
        setUsuarioIds(plantilla.usuarioIds ?? []);
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
            })),
        );
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Error al cargar plantilla"),
      )
      .finally(() => setCargando(false));
  }, [esEdicion, token, plantillaId]);

  function alternarSubactividad(id: string) {
    setSubactividadIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function alternarUsuario(id: string) {
    setUsuarioIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  }

  function actualizarCampo(indice: number, cambios: Partial<CampoEnEdicion>) {
    setCampos((prev) =>
      prev.map((campo, i) => (i === indice ? { ...campo, ...cambios } : campo)),
    );
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
          const opciones = TIPOS_CON_OPCIONES.includes(campo.tipoCampo)
            ? {
                valores: campo.claveOpciones
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean),
              }
            : undefined;

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

      if (esEdicion && plantillaId) {
        await actualizarPlantillaFormulario(token, plantillaId, {
          nombre,
          descripcion: descripcion || undefined,
          subactividadIds,
          usuarioIds,
          campos: camposPayload,
        });
      } else {
        await crearPlantillaFormulario(token, {
          nombre,
          descripcion: descripcion || undefined,
          subactividadIds,
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

  if (cargando) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">
            {esEdicion ? "Editar plantilla" : "Nueva plantilla de formulario"}
          </h2>
          <p className="mt-1 text-zinc-600">
            Diseña los campos que se capturarán en campo
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
            {estaActivo ? "Publicada" : "Borrador"}
          </span>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <form onSubmit={manejarGuardar} className="space-y-6">
        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-zinc-900">
            Información general
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nombre de la plantilla
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
                Descripción (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal focus:ring-4 focus:ring-ruralia-teal/10"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">
            Proyectos asignados (opcional)
          </h3>
          <p className="mb-4 text-xs text-zinc-500">
            Puedes crear la plantilla sin asignarla a ningún proyecto y
            asignarla más adelante. Selecciona una o varias subactividades
            donde estará disponible.
          </p>

          {grupos.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay proyectos con subactividades registradas todavía.
            </p>
          ) : (
            <div className="space-y-4">
              {grupos.map((grupo) => (
                <div key={grupo.proyecto.id}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {grupo.proyecto.nombre}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.subactividades.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => alternarSubactividad(sub.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          subactividadIds.includes(sub.id)
                            ? "bg-ruralia-teal text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {sub.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-zinc-900">
            Usuarios asignados (opcional)
          </h3>
          <p className="mb-4 text-xs text-zinc-500">
            Asigna la plantilla directamente a usuarios específicos, sin
            depender de un proyecto o subactividad. Útil para encuestas
            generales que el usuario responde sin una jornada asociada.
          </p>

          {usuarios.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No hay usuarios activos registrados todavía.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {usuarios.map((usuario) => (
                <button
                  key={usuario.id}
                  type="button"
                  onClick={() => alternarUsuario(usuario.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
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

        <div className="rounded-2xl border border-ruralia-teal-border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              Campos del formulario
            </h3>
            <button
              type="button"
              onClick={agregarCampo}
              className="rounded-lg border border-ruralia-teal-border px-3 py-1.5 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
            >
              + Agregar campo
            </button>
          </div>

          <div className="space-y-4">
            {campos.map((campo, indice) => (
              <div
                key={indice}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Campo {indice + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moverCampo(indice, -1)}
                      disabled={indice === 0}
                      className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Mover arriba"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moverCampo(indice, 1)}
                      disabled={indice === campos.length - 1}
                      className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Mover abajo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCampo(indice)}
                      disabled={campos.length === 1}
                      className="rounded-lg px-2 py-1 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      aria-label="Eliminar campo"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      Etiqueta
                    </label>
                    <input
                      required
                      value={campo.etiqueta}
                      onChange={(e) =>
                        actualizarCampo(indice, {
                          etiqueta: e.target.value,
                          clave:
                            campo.clave || generarClave(e.target.value),
                        })
                      }
                      placeholder="Ej: ¿Cuántas hectáreas se sembraron?"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      Tipo de campo
                    </label>
                    <select
                      value={campo.tipoCampo}
                      onChange={(e) =>
                        actualizarCampo(indice, {
                          tipoCampo: e.target.value as TipoCampoFormulario,
                        })
                      }
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                    >
                      {TIPOS_CAMPO.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {TIPOS_CON_OPCIONES.includes(campo.tipoCampo) ? (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      Opciones (una por línea)
                    </label>
                    <textarea
                      value={campo.claveOpciones}
                      onChange={(e) =>
                        actualizarCampo(indice, {
                          claveOpciones: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder={"Opción 1\nOpción 2\nOpción 3"}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                    />
                  </div>
                ) : null}

                <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={campo.esObligatorio ?? false}
                    onChange={(e) =>
                      actualizarCampo(indice, {
                        esObligatorio: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-300"
                  />
                  Campo obligatorio
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
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
            className="rounded-xl bg-ruralia-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Guardar plantilla"}
          </button>
        </div>
      </form>
    </div>
  );
}
