"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  asignarAsociacionesProyecto,
  asignarBeneficiariosProyecto,
  asignarPersonalProyecto,
  asignarTerritoriosProyecto,
  activarProyecto,
  crearActividad,
  crearProyecto,
  listarAsociaciones,
  listarBeneficiarios,
  listarUsuarios,
  listarVeredas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TipoProyecto } from "@/lib/types";

const PASOS = [
  "Información",
  "Territorio",
  "Equipo",
  "Contraparte",
  "Actividades",
  "Confirmar",
] as const;

const TIPOS: { valor: TipoProyecto; etiqueta: string }[] = [
  { valor: "AGRICOLA", etiqueta: "Agrícola" },
  { valor: "AMBIENTAL", etiqueta: "Ambiental" },
  { valor: "TURISMO", etiqueta: "Turismo" },
  { valor: "OTRO", etiqueta: "Otro" },
];

export function WizardCrearProyecto() {
  const router = useRouter();
  const { token, usuario } = useAuth();
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);

  const [basico, setBasico] = useState({
    nombre: "",
    descripcion: "",
    tipo: "AGRICOLA" as TipoProyecto,
    fechaInicio: "",
    fechaFin: "",
  });
  const [veredaIds, setVeredaIds] = useState<string[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);
  const [tipoContraparte, setTipoContraparte] = useState<
    "beneficiario" | "asociacion" | null
  >(null);
  const [contraparteId, setContraparteId] = useState("");
  const [actividades, setActividades] = useState<string[]>([""]);

  const [opcionesVeredas, setOpcionesVeredas] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesUsuarios, setOpcionesUsuarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesBeneficiarios, setOpcionesBeneficiarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesAsociaciones, setOpcionesAsociaciones] = useState<
    { id: string; nombre: string }[]
  >([]);

  useEffect(() => {
    if (!token) return;
    setCargandoOpciones(true);
    void Promise.all([
      listarVeredas(token, { limite: 100 }),
      listarUsuarios(token, { limite: 100, estaActivo: true }),
      listarBeneficiarios(token, { limite: 100 }),
      listarAsociaciones(token, { limite: 100 }),
    ])
      .then(([veredas, usuarios, beneficiarios, asociaciones]) => {
        setOpcionesVeredas(
          veredas.datos.map((v) => ({ id: v.id, nombre: v.nombre })),
        );
        setOpcionesUsuarios(
          usuarios.datos.map((u) => ({
            id: u.id,
            nombre: u.nombreCompleto,
          })),
        );
        setOpcionesBeneficiarios(
          beneficiarios.datos.map((b) => ({
            id: b.id,
            nombre: `${b.nombres} ${b.apellidos}`,
          })),
        );
        setOpcionesAsociaciones(
          asociaciones.datos.map((a) => ({ id: a.id, nombre: a.nombre })),
        );
        if (usuario) {
          setUsuarioIds([usuario.id]);
        }
      })
      .finally(() => setCargandoOpciones(false));
  }, [token, usuario]);

  function toggleId(lista: string[], id: string): string[] {
    return lista.includes(id)
      ? lista.filter((x) => x !== id)
      : [...lista, id];
  }

  function validarPasoActual(): string | null {
    switch (paso) {
      case 0:
        if (!basico.nombre.trim()) return "El nombre del proyecto es obligatorio";
        return null;
      case 1:
        if (!veredaIds.length) return "Selecciona al menos una vereda";
        return null;
      case 2:
        if (!usuarioIds.length) return "Asigna al menos un miembro del equipo interno";
        return null;
      case 3:
        if (!tipoContraparte || !contraparteId) {
          return "Selecciona un beneficiario o una asociación como contraparte";
        }
        return null;
      default:
        return null;
    }
  }

  function avanzar() {
    const msg = validarPasoActual();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function retroceder() {
    setError(null);
    setPaso((p) => Math.max(p - 1, 0));
  }

  async function finalizar() {
    if (!token) return;
    setEnviando(true);
    setError(null);
    try {
      const proyecto = await crearProyecto(token, {
        nombre: basico.nombre.trim(),
        descripcion: basico.descripcion.trim() || undefined,
        tipo: basico.tipo,
        fechaInicio: basico.fechaInicio || undefined,
        fechaFin: basico.fechaFin || undefined,
      });

      await asignarTerritoriosProyecto(token, proyecto.id, { veredaIds });
      await asignarPersonalProyecto(token, proyecto.id, { usuarioIds });

      if (tipoContraparte === "beneficiario") {
        await asignarBeneficiariosProyecto(token, proyecto.id, {
          beneficiarios: [{ beneficiarioId: contraparteId, esPrincipal: true }],
        });
      } else if (tipoContraparte === "asociacion") {
        await asignarAsociacionesProyecto(token, proyecto.id, {
          asociaciones: [{ asociacionId: contraparteId, esPrincipal: true }],
        });
      }

      const nombresActividades = actividades
        .map((a) => a.trim())
        .filter(Boolean);
      for (const nombre of nombresActividades) {
        await crearActividad(token, proyecto.id, { nombre });
      }

      await activarProyecto(token, proyecto.id);

      router.push(`/proyectos/${proyecto.id}?tab=jornadas`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el proyecto");
    } finally {
      setEnviando(false);
    }
  }

  if (cargandoOpciones) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link href="/proyectos" className="hover:text-emerald-700">
          Proyectos
        </Link>
        <span className="mx-2">›</span>
        <span className="text-zinc-900">Nuevo proyecto</span>
      </nav>

      <h2 className="text-2xl font-semibold text-zinc-900">Crear proyecto</h2>
      <p className="mt-1 text-zinc-600">
        Configura el proyecto paso a paso antes de registrar jornadas de campo.
      </p>

      <ol className="mt-8 flex flex-wrap gap-2">
        {PASOS.map((etiqueta, i) => (
          <li
            key={etiqueta}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              i === paso
                ? "bg-emerald-600 text-white"
                : i < paso
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {i + 1}. {etiqueta}
          </li>
        ))}
      </ol>

      {error ? (
        <div className="mt-4">
          <Alerta mensaje={error} />
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        {paso === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Nombre del proyecto *
              </label>
              <input
                value={basico.nombre}
                onChange={(e) =>
                  setBasico((b) => ({ ...b, nombre: e.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Descripción
              </label>
              <textarea
                rows={3}
                value={basico.descripcion}
                onChange={(e) =>
                  setBasico((b) => ({ ...b, descripcion: e.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Tipo
              </label>
              <select
                value={basico.tipo}
                onChange={(e) =>
                  setBasico((b) => ({
                    ...b,
                    tipo: e.target.value as TipoProyecto,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={basico.fechaInicio}
                  onChange={(e) =>
                    setBasico((b) => ({ ...b, fechaInicio: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={basico.fechaFin}
                  onChange={(e) =>
                    setBasico((b) => ({ ...b, fechaFin: e.target.value }))
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {paso === 1 && (
          <div>
            <p className="mb-3 text-sm text-zinc-600">
              Veredas donde se ejecutará el proyecto *
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {opcionesVeredas.map((v) => (
                <label
                  key={v.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={veredaIds.includes(v.id)}
                    onChange={() => setVeredaIds(toggleId(veredaIds, v.id))}
                  />
                  <span className="text-sm">{v.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <p className="mb-3 text-sm text-zinc-600">
              Personas de la organización que ejecutarán el proyecto en campo *
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {opcionesUsuarios.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={usuarioIds.includes(u.id)}
                    onChange={() => setUsuarioIds(toggleId(usuarioIds, u.id))}
                  />
                  <span className="text-sm">{u.nombre}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Cada proyecto se vincula a <strong>un beneficiario</strong> o{" "}
              <strong>una asociación</strong> (no a ambos). *
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoContraparteWizard"
                  checked={tipoContraparte === "beneficiario"}
                  onChange={() => {
                    setTipoContraparte("beneficiario");
                    setContraparteId("");
                  }}
                />
                Beneficiario
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipoContraparteWizard"
                  checked={tipoContraparte === "asociacion"}
                  onChange={() => {
                    setTipoContraparte("asociacion");
                    setContraparteId("");
                  }}
                />
                Asociación
              </label>
            </div>
            {tipoContraparte ? (
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-100 p-3">
                {(tipoContraparte === "beneficiario"
                  ? opcionesBeneficiarios
                  : opcionesAsociaciones
                ).map((opcion) => (
                  <label
                    key={opcion.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-zinc-50"
                  >
                    <input
                      type="radio"
                      name="contraparteWizard"
                      checked={contraparteId === opcion.id}
                      onChange={() => setContraparteId(opcion.id)}
                    />
                    <span className="text-sm">{opcion.nombre}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Elige el tipo de contraparte para ver las opciones.
              </p>
            )}
          </div>
        )}

        {paso === 4 && (
          <div>
            <p className="mb-3 text-sm text-zinc-600">
              Actividades base del catálogo (opcional). Luego las agruparás en
              jornadas de campo.
            </p>
            <div className="space-y-2">
              {actividades.map((nombre, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={nombre}
                    onChange={(e) => {
                      const next = [...actividades];
                      next[i] = e.target.value;
                      setActividades(next);
                    }}
                    placeholder={`Actividad ${i + 1}`}
                    className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm"
                  />
                  {actividades.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActividades(actividades.filter((_, j) => j !== i))
                      }
                      className="text-sm text-red-600"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setActividades([...actividades, ""])}
                className="text-sm font-semibold text-emerald-700 hover:underline"
              >
                + Añadir actividad
              </button>
            </div>
          </div>
        )}

        {paso === 5 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Nombre</dt>
              <dd className="font-medium">{basico.nombre}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Veredas</dt>
              <dd>{veredaIds.length} seleccionadas</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Equipo interno</dt>
              <dd>{usuarioIds.length} personas</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Contraparte</dt>
              <dd>
                {tipoContraparte && contraparteId
                  ? tipoContraparte === "beneficiario"
                    ? opcionesBeneficiarios.find((b) => b.id === contraparteId)
                        ?.nombre ?? "Beneficiario seleccionado"
                    : opcionesAsociaciones.find((a) => a.id === contraparteId)
                        ?.nombre ?? "Asociación seleccionada"
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Actividades en catálogo</dt>
              <dd>
                {actividades.filter((a) => a.trim()).length || "Se definirán en jornadas"}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={paso === 0 ? () => router.push("/proyectos") : retroceder}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700"
        >
          {paso === 0 ? "Cancelar" : "Anterior"}
        </button>
        {paso < PASOS.length - 1 ? (
          <button
            type="button"
            onClick={avanzar}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            disabled={enviando}
            onClick={() => void finalizar()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {enviando ? "Creando..." : "Crear proyecto"}
          </button>
        )}
      </div>
    </div>
  );
}
