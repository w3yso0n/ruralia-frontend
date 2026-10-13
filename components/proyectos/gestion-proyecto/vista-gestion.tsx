"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { EquipoVinculos } from "@/components/proyectos/gestion-proyecto/equipo-vinculos";
import { PanelExpediente } from "@/components/proyectos/gestion-proyecto/panel-expediente";
import { PanelJornadas } from "@/components/proyectos/gestion-proyecto/panel-jornadas";
import { PanelPlan } from "@/components/proyectos/gestion-proyecto/panel-plan";
import { PanelTerritorio } from "@/components/proyectos/gestion-proyecto/panel-territorio";
import { ResumenInformacionBasica } from "@/components/proyectos/gestion-proyecto/resumen-informacion-basica";
import { ResumenProyecto } from "@/components/proyectos/gestion-proyecto/resumen-proyecto";
import { VistaProyectoTecnico } from "@/components/tecnico/vista-proyecto-tecnico";
import {
  activarProyecto,
  actualizarProyecto,
  eliminarProyecto,
  obtenerPlanProyecto,
  obtenerProyecto,
  listarJornadas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  EstadoProyecto,
  Jornada,
  PlanProyecto,
  Proyecto,
} from "@/lib/types";

type Tab = "resumen" | "territorio" | "plan" | "jornadas" | "equipo" | "expediente";

const TABS_VALIDOS: Tab[] = [
  "resumen",
  "territorio",
  "plan",
  "jornadas",
  "equipo",
  "expediente",
];

const ETIQUETA_ESTADO: Record<EstadoProyecto, string> = {
  BORRADOR: "Borrador",
  ACTIVO: "Activo",
  COMPLETADO: "Completado",
  SUSPENDIDO: "Suspendido",
};

const CLASE_ESTADO: Record<EstadoProyecto, string> = {
  BORRADOR: "bg-amber-50 text-amber-800",
  ACTIVO: "bg-ruralia-teal-soft text-ruralia-teal-text",
  COMPLETADO: "bg-ruralia-teal-soft text-ruralia-teal-text",
  SUSPENDIDO: "bg-zinc-100 text-zinc-600",
};

/** Largo a partir del cual la descripción se trunca a 2 líneas con "Ver más". */
const LARGO_DESCRIPCION_CORTA = 220;

/** Los textos de convenio suelen venir en mayúsculas: se pasan a sentence case. */
function aSentenceCase(texto: string): string {
  const limpio = texto.trim();
  if (!/[A-ZÁÉÍÓÚÑ]/.test(limpio) || limpio !== limpio.toUpperCase()) {
    return limpio;
  }
  const minusculas = limpio.toLocaleLowerCase("es");
  return minusculas.charAt(0).toLocaleUpperCase("es") + minusculas.slice(1);
}

function textoPendientes(pendientes: string[]): string {
  if (pendientes.length === 1) return pendientes[0];
  return `${pendientes.slice(0, -1).join(", ")} y ${pendientes[pendientes.length - 1]}`;
}

function tabDesdeParam(valor: string | null): Tab {
  if (valor && TABS_VALIDOS.includes(valor as Tab)) {
    return valor as Tab;
  }
  return "resumen";
}

interface VistaGestionProyectoProps {
  proyectoId: string;
}

export function VistaGestionProyecto({ proyectoId }: VistaGestionProyectoProps) {
  const { soloJornadasAsignadas } = usePermisos();
  if (soloJornadasAsignadas) {
    return <VistaProyectoTecnico proyectoId={proyectoId} />;
  }
  return <VistaGestionProyectoCompleta proyectoId={proyectoId} />;
}

function VistaGestionProyectoCompleta({
  proyectoId,
}: VistaGestionProyectoProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { puede } = usePermisos();
  const [tab, setTab] = useState<Tab>(() =>
    tabDesdeParam(searchParams.get("tab")),
  );
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [plan, setPlan] = useState<PlanProyecto | null>(null);
  const [versionResumen, setVersionResumen] = useState(0);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [jornadasCargadas, setJornadasCargadas] = useState(false);
  const cargaJornadasRef = useRef(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activando, setActivando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [descripcionEdicion, setDescripcionEdicion] = useState("");
  const [descripcionExpandida, setDescripcionExpandida] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const proyectoListoRef = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [planActualizadoEn, setPlanActualizadoEn] = useState<Date | null>(null);

  const puedeGestionar = puede("proyectos.editar");
  const puedeEliminar = puede("proyectos.eliminar");
  const desdeRevision = searchParams.get("desde") === "revision";
  const retornoRevision = (() => {
    const bruto = searchParams.get("retorno");
    if (!bruto) return "/revision";
    try {
      const decodificado = decodeURIComponent(bruto);
      if (decodificado.startsWith("/revision")) return decodificado;
    } catch {
      // retorno inválido
    }
    return "/revision";
  })();

  const cargar = useCallback(async (opciones?: { silencioso?: boolean }) => {
    if (!token) return;
    const silencioso = !!opciones?.silencioso && proyectoListoRef.current;
    if (!silencioso) {
      setCargando(true);
      setError(null);
    }

    // Las jornadas solo se usan en su pestaña: se piden en paralelo y no
    // bloquean el resto de la vista. Una recarga silenciosa no las toca.
    if (!silencioso) {
      const cargaId = ++cargaJornadasRef.current;
      setJornadasCargadas(false);
      void listarJornadas(token, { proyectoId, limite: 50 })
        .then((jor) => jor.datos)
        .catch(() => [] as Jornada[])
        .then((datos) => {
          if (cargaId !== cargaJornadasRef.current) return;
          setJornadas(datos);
          setJornadasCargadas(true);
        });
    }

    try {
      const [p, pl] = await Promise.all([
        obtenerProyecto(token, proyectoId),
        obtenerPlanProyecto(token, proyectoId),
      ]);
      setProyecto(p);
      proyectoListoRef.current = true;
      setPlan(pl);
      if (!silencioso) setVersionResumen((v) => v + 1);
      setPlanActualizadoEn(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyecto");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [token, proyectoId]);

  const recargarAvancePlan = useCallback(async () => {
    if (!token) return;
    try {
      const pl = await obtenerPlanProyecto(token, proyectoId);
      setPlan(pl);
      setPlanActualizadoEn(new Date());
    } catch {
      // Ignorar errores puntuales del polling en segundo plano
    }
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    setTab(tabDesdeParam(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (!menuAbierto) return;
    function alClickFuera(evento: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
        setMenuAbierto(false);
      }
    }
    function alEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAbierto(false);
    }
    document.addEventListener("mousedown", alClickFuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alClickFuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [menuAbierto]);

  function cambiarTab(nueva: Tab) {
    setTab(nueva);
    const params = new URLSearchParams(searchParams.toString());
    if (nueva === "resumen") {
      params.delete("tab");
    } else {
      params.set("tab", nueva);
    }
    if (nueva !== "jornadas") {
      params.delete("jornadaId");
    }
    const qs = params.toString();
    router.replace(
      qs ? `/proyectos/${proyectoId}?${qs}` : `/proyectos/${proyectoId}`,
      { scroll: false },
    );
  }

  useEffect(() => {
    if (tab !== "plan") return;
    void recargarAvancePlan();
    const intervalo = setInterval(() => {
      void recargarAvancePlan();
    }, 30_000);
    return () => clearInterval(intervalo);
  }, [tab, recargarAvancePlan]);

  const tabs: { id: Tab; etiqueta: string }[] = [
    { id: "resumen", etiqueta: "Resumen" },
    { id: "territorio", etiqueta: "Territorio" },
    { id: "plan", etiqueta: "Plan del proyecto" },
    { id: "jornadas", etiqueta: "Jornadas" },
    { id: "equipo", etiqueta: "Equipo y contraparte" },
    { id: "expediente", etiqueta: "Expediente" },
  ];

  if (cargando) return <Spinner />;
  if (error && !proyecto) {
    return (
      <div className="space-y-4">
        <Alerta mensaje={error} />
        <Link
          href="/proyectos"
          className="inline-block text-sm font-medium text-ruralia-teal-text underline-offset-2 hover:underline"
        >
          Volver a proyectos
        </Link>
      </div>
    );
  }
  if (!proyecto || !token) return <Alerta mensaje="Proyecto no encontrado" />;

  const tieneContraparte = !!(
    (proyecto.conteoBeneficiarios ?? proyecto.beneficiarios?.length ?? 0) >
      0 ||
    proyecto.asociacionPrincipal ||
    proyecto.asociaciones?.[0]
  );

  const pendientes = [
    !(proyecto.municipios?.length || proyecto.veredas?.length)
      ? "municipios"
      : null,
    !proyecto.personal?.length ? "equipo interno" : null,
    !tieneContraparte ? "beneficiarios o asociaciones" : null,
  ].filter((p): p is string => !!p);
  const configuracionIncompleta = pendientes.length > 0;

  const descripcion = proyecto.descripcion
    ? aSentenceCase(proyecto.descripcion)
    : "";
  const descripcionLarga = descripcion.length > LARGO_DESCRIPCION_CORTA;

  const enBorrador = proyecto.estado === "BORRADOR";

  async function manejarActivar() {
    if (!token) return;
    setActivando(true);
    setError(null);
    try {
      await activarProyecto(token, proyectoId);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al activar proyecto");
    } finally {
      setActivando(false);
    }
  }

  function iniciarEdicion() {
    if (!proyecto) return;
    setNombreEdicion(proyecto.nombre);
    setDescripcionEdicion(proyecto.descripcion ?? "");
    setError(null);
    setEditando(true);
  }

  async function manejarGuardarEdicion() {
    if (!token || !nombreEdicion.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await actualizarProyecto(token, proyectoId, {
        nombre: nombreEdicion.trim(),
        descripcion: descripcionEdicion.trim() || undefined,
      });
      setEditando(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar proyecto");
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEliminar() {
    if (!token) return;
    setMenuAbierto(false);
    if (
      !confirm(
        "¿Eliminar permanentemente este proyecto? Se borrará el plan y la configuración. Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await eliminarProyecto(token, proyectoId);
      router.push("/proyectos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar proyecto");
    }
  }

  return (
    <>
      {desdeRevision ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3">
          <p className="text-sm text-ruralia-teal-text">
            Estás viendo el proyecto desde la bandeja de revisión.
          </p>
          <Link
            href={retornoRevision}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
          >
            Volver a revisión
          </Link>
        </div>
      ) : null}

      <nav aria-label="Ruta" className="mb-4 text-sm text-zinc-500">
        {desdeRevision ? (
          <>
            <Link
              href={retornoRevision}
              className="hover:text-ruralia-teal-text"
            >
              Revisión
            </Link>
            <span className="mx-2">/</span>
          </>
        ) : null}
        <Link href="/proyectos" className="hover:text-ruralia-teal-text">
          Proyectos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-900">{proyecto.nombre}</span>
      </nav>

      {configuracionIncompleta && puedeGestionar ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <p>
            Faltan {textoPendientes(pendientes)} por asignar. Completa{" "}
            <Link
              href={`/proyectos/${proyectoId}?tab=equipo`}
              className="font-semibold underline underline-offset-2"
            >
              Equipo y contraparte
            </Link>{" "}
            antes de crear jornadas.
          </p>
        </div>
      ) : null}

      {enBorrador && !configuracionIncompleta && puedeGestionar ? (
        <div className="mb-6 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3 text-sm text-ruralia-teal-text">
          El proyecto está en <strong>borrador</strong>. Actívalo para poder
          registrar jornadas de campo.{" "}
          <button
            type="button"
            disabled={activando}
            onClick={() => void manejarActivar()}
            className="font-semibold underline underline-offset-2 disabled:opacity-50"
          >
            {activando ? "Activando..." : "Activar proyecto"}
          </button>
        </div>
      ) : null}

      {editando && puedeGestionar ? (
        <section
          aria-label="Editar proyecto"
          className="mb-6 space-y-4 rounded-2xl border border-ruralia-teal-border bg-white p-5"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Nombre
            </label>
            <input
              value={nombreEdicion}
              onChange={(e) => setNombreEdicion(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
              placeholder="Nombre del proyecto"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Descripción
            </label>
            <textarea
              value={descripcionEdicion}
              onChange={(e) => setDescripcionEdicion(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
              placeholder="Descripción (opcional)"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando || !nombreEdicion.trim()}
              onClick={() => void manejarGuardarEdicion()}
              className="inline-flex h-10 items-center rounded-xl bg-ruralia-teal px-4 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => {
                setEditando(false);
                setError(null);
              }}
              className="inline-flex h-10 items-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancelar
            </button>
          </div>
        </section>
      ) : (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-[999_1_560px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-zinc-900">
                {proyecto.nombre}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${CLASE_ESTADO[proyecto.estado]}`}
              >
                {ETIQUETA_ESTADO[proyecto.estado]}
              </span>
            </div>
            {descripcion ? (
              <div className="mt-2 max-w-[900px]">
                <p
                  className={`text-sm leading-[1.55] text-zinc-500 ${
                    descripcionLarga && !descripcionExpandida
                      ? "line-clamp-2"
                      : ""
                  }`}
                >
                  {descripcion}
                </p>
                {descripcionLarga ? (
                  <button
                    type="button"
                    onClick={() => setDescripcionExpandida((v) => !v)}
                    aria-expanded={descripcionExpandida}
                    className="mt-1 text-sm font-semibold text-ruralia-teal-text hover:underline"
                  >
                    {descripcionExpandida ? "Ver menos" : "Ver más"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {puedeGestionar || puedeEliminar ? (
            <div className="flex shrink-0 items-center gap-2">
              {puedeGestionar ? (
                <button
                  type="button"
                  onClick={iniciarEdicion}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <Pencil
                    className="h-4 w-4 text-ruralia-teal-muted"
                    aria-hidden="true"
                  />
                  Editar
                </button>
              ) : null}
              {puedeEliminar ? (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Más acciones"
                    aria-haspopup="menu"
                    aria-expanded={menuAbierto}
                    onClick={() => setMenuAbierto((v) => !v)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {menuAbierto ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-ruralia-teal-border bg-white p-1.5 shadow-lg shadow-zinc-900/10"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void manejarEliminar()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Eliminar proyecto
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {error ? <Alerta mensaje={error} /> : null}

      <div
        role="tablist"
        className="mb-6 flex gap-2 overflow-x-auto border-b border-zinc-200"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => cambiarTab(t.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm ${
              tab === t.id
                ? "border-ruralia-teal font-semibold text-ruralia-teal-text"
                : "border-transparent font-medium text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {tab === "resumen" ? (
        <div className="space-y-6">
          <ResumenInformacionBasica
            token={token}
            proyecto={proyecto}
            puedeGestionar={puedeGestionar}
            onActualizar={cargar}
          />
          <ResumenProyecto
            token={token}
            proyectoId={proyectoId}
            puedeGestionar={puedeGestionar}
            version={versionResumen}
          />
        </div>
      ) : null}

      {tab === "territorio" ? (
        <PanelTerritorio
          token={token}
          proyectoId={proyectoId}
          proyecto={proyecto}
          puedeGestionar={puedeGestionar}
          onIrAEquipo={() => cambiarTab("equipo")}
        />
      ) : null}

      {tab === "plan" ? (
        <PanelPlan
          token={token}
          proyectoId={proyectoId}
          plan={plan}
          puedeGestionar={puedeGestionar}
          onActualizar={cargar}
          onRecargarAvance={recargarAvancePlan}
          planActualizadoEn={planActualizadoEn}
        />
      ) : null}

      {tab === "jornadas" && !jornadasCargadas ? <Spinner /> : null}

      {tab === "jornadas" && jornadasCargadas ? (
        <PanelJornadas
          token={token}
          proyectoId={proyectoId}
          proyecto={proyecto}
          plan={plan}
          jornadas={jornadas}
          puedeGestionar={puedeGestionar && proyecto.estado === "ACTIVO"}
          onActualizar={cargar}
        />
      ) : null}

      {tab === "equipo" ? (
        <>
          <div className="mb-4 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-3 text-sm text-ruralia-teal-text">
            Las cuotas personales, el ranking y la evaluación individual están
            en el módulo{" "}
            <Link
              href={`/evaluaciones?tab=asignaciones&proyectoId=${proyectoId}`}
              className="font-semibold underline"
            >
              Evaluaciones
            </Link>
            .
          </div>
          <EquipoVinculos
            token={token}
            proyectoId={proyectoId}
            proyecto={proyecto}
            puedeGestionar={puedeGestionar}
            onActualizar={cargar}
          />
        </>
      ) : null}

      {tab === "expediente" ? (
        <PanelExpediente
          token={token}
          proyectoId={proyectoId}
          proyecto={proyecto}
          plan={plan}
          puedeGestionar={puede("documentos_externos.crear")}
        />
      ) : null}
    </>
  );
}
