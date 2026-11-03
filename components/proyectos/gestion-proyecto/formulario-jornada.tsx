"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import {
  SelectorLugarJornada,
  type TipoLugarJornada,
} from "./selector-lugar-jornada";
import {
  AsignacionJornada,
  destinoInicialAsignacion,
  errorAsignacionJornada,
  type DestinoAsignacionJornada,
} from "./asignacion-jornada";
import {
  fechaFueraDeProyecto,
  SelectorFechaJornada,
} from "@/components/ui/selector-fecha-jornada";
import {
  listarBeneficiariosDeLinea,
  listarCatalogoFormulariosJornada,
  listarLineasProductivasProyecto,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  ActividadPlan,
  Geocerca,
  LineaProductivaProyecto,
  MunicipioResumen,
  PlantillaFormularioCatalogo,
  SubactividadPlan,
  TipoJornada,
  VeredaResumen,
} from "@/lib/types";
import {
  AgregarPorLinea,
  SugerenciaLineaJornada,
  type MiembroLinea,
} from "./seleccion-por-linea";
import { SelectorMetaPlan } from "./selector-meta-plan";
import {
  CLAVE_FORMULARIO_INDIVIDUAL,
  resolverSeleccionFormulario,
  SelectorFormularioJornada,
} from "./selector-formulario-jornada";

interface AgenteOpcion {
  id: string;
  nombre: string;
  subtitulo?: string;
}

interface FormularioJornadaProps {
  /** Necesario para sugerir beneficiarios por línea productiva. */
  proyectoId?: string;
  /** Las sugerencias por línea productiva solo se muestran en proyectos agrícolas. */
  esAgricola?: boolean;
  municipios: MunicipioResumen[];
  veredas: VeredaResumen[];
  geocercas: Geocerca[];
  actividadesPlan: ActividadPlan[];
  agentes: AgenteOpcion[];
  beneficiarios?: AgenteOpcion[];
  buscarBeneficiarios?: (termino: string) => Promise<AgenteOpcion[]>;
  hayBeneficiarios?: boolean;
  asociaciones?: AgenteOpcion[];
  fechaInicioProyecto?: string;
  fechaFinProyecto?: string;
  enviando: boolean;
  onSubmit: (datos: {
    fecha: string;
    municipioId?: string | null;
    veredaId?: string | null;
    geocercaId?: string | null;
    nombre?: string;
    observaciones?: string;
    metaId: string;
    tipo: TipoJornada;
    plantillaFormularioId?: string | null;
    tecnicoResponsableIds: string[];
    requiereRevision: boolean;
    beneficiarioIds: string[];
    asociacionIds: string[];
  }) => Promise<void>;
}

export function FormularioJornada({
  proyectoId,
  esAgricola = false,
  municipios,
  veredas,
  geocercas,
  actividadesPlan,
  agentes,
  beneficiarios = [],
  buscarBeneficiarios,
  hayBeneficiarios,
  asociaciones = [],
  fechaInicioProyecto,
  fechaFinProyecto,
  enviando,
  onSubmit,
}: FormularioJornadaProps) {
  const { token } = useAuth();
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipoLugar, setTipoLugar] = useState<TipoLugarJornada>(
    municipios.length ? "municipio" : "vereda",
  );
  const [municipioId, setMunicipioId] = useState(municipios[0]?.id ?? "");
  const [veredaId, setVeredaId] = useState(
    municipios.length ? "" : (veredas[0]?.id ?? ""),
  );
  const [geocercaId, setGeocercaId] = useState(geocercas[0]?.id ?? "");
  const [observaciones, setObservaciones] = useState("");
  const [metaId, setMetaId] = useState("");
  const [claveFormulario, setClaveFormulario] = useState(
    CLAVE_FORMULARIO_INDIVIDUAL,
  );
  const [plantillas, setPlantillas] = useState<PlantillaFormularioCatalogo[]>(
    [],
  );
  const [requiereRevision, setRequiereRevision] = useState(true);
  const [agenteId, setAgenteId] = useState("");
  const [destino, setDestino] = useState<DestinoAsignacionJornada>(
    destinoInicialAsignacion([], []),
  );
  const [beneficiarioIds, setBeneficiarioIds] = useState<string[]>([]);
  const [asociacionIds, setAsociacionIds] = useState<string[]>([]);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [subactividad, setSubactividad] = useState<SubactividadPlan | null>(
    null,
  );
  const [lineasProyecto, setLineasProyecto] = useState<
    LineaProductivaProyecto[]
  >([]);
  const [miembrosPorLinea, setMiembrosPorLinea] = useState<
    Record<string, MiembroLinea[]>
  >({});
  const [cargandoLinea, setCargandoLinea] = useState(false);
  /** Nombres de quienes se agregaron en lote, para mostrarlos en la selección. */
  const [conocidos, setConocidos] = useState<Record<string, AgenteOpcion>>({});

  useEffect(() => {
    if (!token) return;
    void listarCatalogoFormulariosJornada(token)
      .then(setPlantillas)
      .catch(() => setPlantillas([]));
  }, [token]);

  useEffect(() => {
    if (!token || !proyectoId || !esAgricola) return;
    void listarLineasProductivasProyecto(token, proyectoId)
      .then(setLineasProyecto)
      .catch(() => setLineasProyecto([]));
  }, [token, proyectoId, esAgricola]);

  const cargarMiembros = useCallback(
    async (lineaId: string): Promise<MiembroLinea[]> => {
      const enCache = miembrosPorLinea[lineaId];
      if (enCache) return enCache;
      if (!token || !proyectoId) return [];
      setCargandoLinea(true);
      try {
        const datos = await listarBeneficiariosDeLinea(token, proyectoId, lineaId);
        const miembros = datos.map((b) => ({
          id: b.id,
          nombre: `${b.nombres} ${b.apellidos}`.trim(),
          subtitulo: b.numeroDocumento,
        }));
        setMiembrosPorLinea((prev) => ({ ...prev, [lineaId]: miembros }));
        return miembros;
      } catch {
        setErrorLocal("No se pudieron cargar los beneficiarios de esa línea");
        return [];
      } finally {
        setCargandoLinea(false);
      }
    },
    [miembrosPorLinea, token, proyectoId],
  );

  function recordarNombres(miembros: MiembroLinea[]) {
    setConocidos((prev) => {
      const siguiente = { ...prev };
      for (const m of miembros) siguiente[m.id] = m;
      return siguiente;
    });
  }

  function agregarMiembros(miembros: MiembroLinea[]) {
    if (!miembros.length) return;
    recordarNombres(miembros);
    setDestino("beneficiario");
    setAsociacionIds([]);
    setBeneficiarioIds((prev) => {
      const actuales = new Set(prev);
      return [...prev, ...miembros.map((m) => m.id).filter((id) => !actuales.has(id))];
    });
  }

  function quitarMiembros(miembros: MiembroLinea[]) {
    const fuera = new Set(miembros.map((m) => m.id));
    setBeneficiarioIds((prev) => prev.filter((id) => !fuera.has(id)));
  }

  const lineaSubactividad = esAgricola
    ? (subactividad?.lineaProductiva ?? null)
    : null;
  const totalLineaSubactividad = lineaSubactividad
    ? (lineasProyecto.find((l) => l.id === lineaSubactividad.id)?.beneficiarios ?? 0)
    : 0;
  const seleccionados = useMemo(() => new Set(beneficiarioIds), [beneficiarioIds]);
  const opcionesBeneficiarios = useMemo(
    () => [...beneficiarios, ...Object.values(conocidos)],
    [beneficiarios, conocidos],
  );

  const seleccion = resolverSeleccionFormulario(claveFormulario, plantillas);
  const esGrupal = seleccion.tipo === "GRUPAL";
  const totalJornadas = Math.max(
    destino === "beneficiario" ? beneficiarioIds.length : asociacionIds.length,
    1,
  );

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrorLocal(null);

    if (!fecha) {
      setErrorLocal("La fecha es obligatoria");
      return;
    }
    if (tipoLugar === "municipio" && !municipioId) {
      setErrorLocal("Selecciona el municipio de la jornada");
      return;
    }
    if (tipoLugar === "vereda" && !veredaId) {
      setErrorLocal("Selecciona la vereda de la jornada");
      return;
    }
    if (tipoLugar === "geocerca" && !geocercaId) {
      setErrorLocal("Selecciona la geocerca de la jornada");
      return;
    }

    const errorFecha = fechaFueraDeProyecto(
      fecha,
      fechaInicioProyecto,
      fechaFinProyecto,
    );
    if (errorFecha) {
      setErrorLocal(errorFecha);
      return;
    }

    if (!metaId) {
      setErrorLocal(
        "Debes seleccionar la meta del plan (Actividad → Subactividad → Proceso → Meta)",
      );
      return;
    }

    if (!agenteId) {
      setErrorLocal("Debes asignar un agente del equipo del proyecto");
      return;
    }

    const errorAsignacion = errorAsignacionJornada(
      destino,
      beneficiarioIds,
      asociacionIds,
    );
    if (errorAsignacion) {
      setErrorLocal(errorAsignacion);
      return;
    }

    await onSubmit({
      fecha,
      municipioId: tipoLugar === "municipio" ? municipioId : null,
      veredaId: tipoLugar === "geocerca" ? null : veredaId || null,
      geocercaId: tipoLugar === "geocerca" ? geocercaId : null,
      nombre: nombre.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      metaId,
      tipo: seleccion.tipo,
      plantillaFormularioId: seleccion.plantillaFormularioId,
      tecnicoResponsableIds: [agenteId],
      requiereRevision,
      beneficiarioIds: destino === "beneficiario" ? beneficiarioIds : [],
      asociacionIds: destino === "asociacion" ? asociacionIds : [],
    });

    setNombre("");
    setFecha("");
    setObservaciones("");
    setMetaId("");
    setClaveFormulario(CLAVE_FORMULARIO_INDIVIDUAL);
    setRequiereRevision(true);
    setAgenteId("");
    setDestino("beneficiario");
    setBeneficiarioIds([]);
    setAsociacionIds([]);
  }

  const extraBeneficiarios =
    esAgricola && (lineaSubactividad || lineasProyecto.length) ? (
      <>
        {lineaSubactividad ? (
          <SugerenciaLineaJornada
            linea={lineaSubactividad}
            total={totalLineaSubactividad}
            miembros={miembrosPorLinea[lineaSubactividad.id]}
            seleccionados={seleccionados}
            cargando={cargandoLinea}
            disabled={enviando}
            onPedirMiembros={() => void cargarMiembros(lineaSubactividad.id)}
            onAgregarTodos={async () =>
              agregarMiembros(await cargarMiembros(lineaSubactividad.id))
            }
            onQuitarTodos={() =>
              quitarMiembros(miembrosPorLinea[lineaSubactividad.id] ?? [])
            }
            onAlternar={(miembro) =>
              seleccionados.has(miembro.id)
                ? quitarMiembros([miembro])
                : agregarMiembros([miembro])
            }
          />
        ) : null}
        <AgregarPorLinea
          lineas={lineasProyecto}
          excluirId={lineaSubactividad?.id}
          disabled={enviando || cargandoLinea}
          onElegir={async (linea) => agregarMiembros(await cargarMiembros(linea.id))}
        />
      </>
    ) : null;

  return (
    <form onSubmit={(e) => void manejarSubmit(e)} className="space-y-4">
      {esAgricola ? (
        <p className="text-sm text-zinc-600">
          Empieza por la meta del plan: si su subactividad tiene línea
          productiva, te sugerimos a sus beneficiarios.
        </p>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-ruralia-teal-border bg-white p-4">
        <p className="text-sm font-medium text-zinc-800">Meta del plan *</p>
        <SelectorMetaPlan
          actividadesPlan={actividadesPlan}
          metaId={metaId}
          onChange={setMetaId}
          onSubactividad={setSubactividad}
          mostrarLinea={esAgricola}
          disabled={enviando}
        />
      </div>

      <AsignacionJornada
        beneficiarios={opcionesBeneficiarios}
        buscarBeneficiarios={buscarBeneficiarios}
        hayBeneficiarios={hayBeneficiarios}
        asociaciones={asociaciones}
        destino={destino}
        beneficiarioIds={beneficiarioIds}
        asociacionIds={asociacionIds}
        disabled={enviando}
        ayudaSeleccionMultiple={`Si asignas varios, se crea una jornada independiente por ${destino === "beneficiario" ? "beneficiario" : "asociación"} (misma información), ligadas para editar o cancelar en conjunto.`}
        onDestino={(siguiente) => {
          setDestino(siguiente);
          if (siguiente === "beneficiario") setAsociacionIds([]);
          else setBeneficiarioIds([]);
        }}
        extraBeneficiarios={extraBeneficiarios}
        onBeneficiarioIds={setBeneficiarioIds}
        onAsociacionIds={setAsociacionIds}
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Agente de campo *
        </label>
        <SelectorCatalogo
          opciones={agentes}
          value={agenteId}
          onChange={setAgenteId}
          placeholder="Buscar y asignar un agente del equipo..."
          mensajeVacio="No hay personal asignado al proyecto. Configúralo en Equipo y contraparte."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Nombre de identificación
        </label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={200}
          placeholder="Ej: Jornada 1"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Opcional. Ayuda a distinguir esta jornada en el panel y en la app.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Fecha *
        </label>
        <SelectorFechaJornada
          required
          value={fecha}
          onChange={setFecha}
          fechaInicioProyecto={fechaInicioProyecto}
          fechaFinProyecto={fechaFinProyecto}
          disabled={enviando}
        />
      </div>

      <SelectorLugarJornada
        tipo={tipoLugar}
        onTipo={setTipoLugar}
        municipios={municipios}
        veredas={veredas}
        geocercas={geocercas}
        municipioId={municipioId}
        veredaId={veredaId}
        geocercaId={geocercaId}
        onMunicipioId={setMunicipioId}
        onVeredaId={setVeredaId}
        onGeocercaId={setGeocercaId}
        disabled={enviando}
      />


      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700">
          Observaciones
        </label>
        <textarea
          rows={2}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
        />
      </div>

      <SelectorFormularioJornada
        value={claveFormulario}
        onChange={setClaveFormulario}
        plantillas={plantillas}
        disabled={enviando}
      />

      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
          requiereRevision
            ? "border-ruralia-teal bg-ruralia-teal-soft/50"
            : "border-zinc-200 bg-white hover:border-ruralia-teal-border"
        }`}
      >
        <input
          type="checkbox"
          checked={requiereRevision}
          onChange={(e) => setRequiereRevision(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-zinc-300 text-ruralia-teal focus:ring-ruralia-teal/30"
        />
        <span>
          <span className="block text-sm font-semibold text-zinc-800">
            Requiere revisión
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            {requiereRevision
              ? "El técnico envía a revisión y el avance solo cuenta cuando un supervisor aprueba"
              : "El técnico sube al proyecto y el avance cuenta al confirmarse, sin paso por revisión"}
          </span>
        </span>
      </label>

      {errorLocal ? <p className="text-sm text-red-600">{errorLocal}</p> : null}

      <button
        type="submit"
        disabled={
          enviando ||
          !agentes.length ||
          (!municipios.length && !veredas.length && !geocercas.length)
        }
        className="w-full rounded-xl bg-ruralia-teal py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {enviando
          ? "Guardando..."
          : esGrupal
            ? totalJornadas > 1
              ? `Crear ${totalJornadas} actividades grupales`
              : "Crear actividad grupal"
            : totalJornadas > 1
              ? `Crear ${totalJornadas} jornadas`
              : "Crear jornada"}
      </button>
    </form>
  );
}
