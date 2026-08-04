"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FolderKanban,
  GitCompareArrows,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import {
  BotonCompararVersiones,
  ModalComparacionVersiones,
  versionesOrdenadas,
} from "@/components/revision/modal-comparacion-versiones";
import { ModalDetalleJornadaRevision } from "@/components/revision/modal-detalle-jornada-revision";
import {
  aprobarEntidad,
  enviarJornadaARevision,
  listarAuditoria,
  listarDocumentosJornada,
  listarProyectos,
  obtenerBandejaAprobaciones,
  rechazarEntidad,
  reenviarJornadaARevision,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type {
  AuditLogItem,
  BandejaAprobacion,
  CategoriaRechazo,
  DocumentoJornada,
  EstadoFuncional,
  ItemBandejaAprobacion,
} from "@/lib/types";

const ESTADOS_FILTRO: Array<EstadoFuncional | "TODOS"> = [
  "TODOS",
  "BORRADOR",
  "CAPTURADO",
  "SINCRONIZADO",
  "EN_REVISION",
  "RECHAZADO",
  "EN_CORRECCION",
  "APROBADO",
];

function parseFiltroEstado(
  valor: string | null,
): EstadoFuncional | "TODOS" {
  if (valor && ESTADOS_FILTRO.includes(valor as EstadoFuncional | "TODOS")) {
    return valor as EstadoFuncional | "TODOS";
  }
  return "TODOS";
}

function construirUrlRevision(opts: {
  proyectoId?: string;
  filtro?: EstadoFuncional | "TODOS";
  jornadaId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.proyectoId) params.set("proyectoId", opts.proyectoId);
  if (opts.filtro && opts.filtro !== "TODOS") {
    params.set("estado", opts.filtro);
  }
  if (opts.jornadaId) params.set("jornadaId", opts.jornadaId);
  const qs = params.toString();
  return qs ? `/revision?${qs}` : "/revision";
}

const CATEGORIAS: { value: CategoriaRechazo; label: string }[] = [
  { value: "INFORMACION_INCOMPLETA", label: "Información incompleta" },
  { value: "DOCUMENTO_INCORRECTO", label: "Documento incorrecto" },
  { value: "FIRMA_FALTANTE", label: "Firma faltante" },
  { value: "EVIDENCIA_FALTANTE", label: "Evidencia faltante" },
  { value: "FOTOGRAFIA_INVALIDA", label: "Fotografía inválida" },
  { value: "FOTOGRAFIA_BORROSA", label: "Fotografía borrosa" },
  { value: "UBICACION_INCORRECTA", label: "Ubicación incorrecta" },
  { value: "BENEFICIARIO_INCORRECTO", label: "Beneficiario incorrecto" },
  { value: "ASOCIACION_INCORRECTA", label: "Asociación incorrecta" },
  {
    value: "INCONSISTENCIA_FORMULARIO_DOCUMENTO",
    label: "Inconsistencia formulario/documento",
  },
  { value: "OTRO", label: "Otro" },
];

const FILTROS_TECNICO: { key: EstadoFuncional | "TODOS"; label: string }[] = [
  { key: "TODOS", label: "Todas" },
  { key: "BORRADOR", label: "Borradores" },
  { key: "EN_REVISION", label: "En revisión" },
  { key: "RECHAZADO", label: "Rechazadas" },
  { key: "EN_CORRECCION", label: "Corrección" },
  { key: "APROBADO", label: "Aprobadas" },
];

const FILTROS_SUPERVISOR: { key: EstadoFuncional | "TODOS"; label: string }[] = [
  { key: "TODOS", label: "Cola activa" },
  { key: "EN_REVISION", label: "Pendientes" },
  { key: "EN_CORRECCION", label: "En corrección" },
  { key: "RECHAZADO", label: "Rechazadas" },
  { key: "APROBADO", label: "Aprobadas" },
];

function badgeEstado(estado: EstadoFuncional): string {
  switch (estado) {
    case "BORRADOR":
      return "bg-stone-100 text-stone-700";
    case "CAPTURADO":
    case "SINCRONIZADO":
      return "bg-sky-100 text-sky-800";
    case "EN_REVISION":
      return "bg-amber-100 text-amber-900";
    case "APROBADO":
      return "bg-emerald-100 text-emerald-800";
    case "RECHAZADO":
      return "bg-rose-100 text-rose-800";
    case "EN_CORRECCION":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-stone-100 text-stone-700";
  }
}

function etiquetaEstado(estado: string): string {
  const mapa: Record<string, string> = {
    BORRADOR: "Borrador",
    CAPTURADO: "Capturado",
    SINCRONIZADO: "Sincronizado",
    EN_REVISION: "En revisión",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
    EN_CORRECCION: "En corrección",
    GENERADO: "Generado",
    CORREGIDO: "Corregido",
  };
  return mapa[estado] ?? estado.replaceAll("_", " ").toLowerCase();
}

function etiquetaAccionAuditoria(accion: string): string {
  const mapa: Record<string, string> = {
    CREATE: "Creación",
    UPDATE: "Actualización",
    DELETE_LOGICAL: "Eliminación",
    SUBMIT_FOR_REVIEW: "Envío a revisión",
    APPROVE: "Aprobación",
    REJECT: "Rechazo",
    RESUBMIT: "Reenvío a revisión",
    GENERATE_DOCUMENT: "Generación de documento",
    CREATE_VERSION: "Nueva versión",
    SYNC: "Sincronización",
  };
  return mapa[accion] ?? accion.replaceAll("_", " ");
}

function etiquetaCampo(campo: string | null | undefined): string {
  if (!campo) return "";
  const mapa: Record<string, string> = {
    estadoFuncional: "Estado",
    predios_visitados: "Predios visitados",
    observaciones: "Observaciones",
    entrego_material: "Entrega de material",
  };
  return mapa[campo] ?? campo.replaceAll("_", " ");
}

function etiquetaRol(rol: string): string {
  const mapa: Record<string, string> = {
    CAMPO: "Técnico de campo",
    COORDINADOR_ZONA: "Supervisor",
    COORDINADOR_DEPARTAMENTAL: "Coordinador",
    ADMINISTRADOR: "Administrador",
    CUANTIVA: "Cuantiva",
    VISUALIZADOR: "Consultor",
  };
  if (rol.includes(",")) {
    return rol
      .split(",")
      .map((r) => mapa[r.trim()] ?? r.trim())
      .join(", ");
  }
  return mapa[rol] ?? rol;
}

/** Valor legible para UI (sin JSON crudo ni comillas). */
function formatearValorAuditoria(valor: unknown): string {
  if (valor == null) return "—";
  if (typeof valor === "string") return etiquetaEstado(valor);
  if (typeof valor === "number" || typeof valor === "boolean") {
    return String(valor);
  }
  if (Array.isArray(valor)) {
    return valor.map((v) => formatearValorAuditoria(v)).join(", ");
  }
  if (typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    if (obj.firma === true || obj.presente === true) {
      return "Firma capturada";
    }
    if ("versionNumber" in obj) {
      return `Versión ${obj.versionNumber}`;
    }
    if ("status" in obj && "versionNumber" in obj) {
      return `Versión ${obj.versionNumber} (${etiquetaEstado(String(obj.status))})`;
    }
    return Object.entries(obj)
      .filter(([k]) => !["cambios", "filePath", "previousVersionId", "versionId"].includes(k))
      .map(([k, v]) => `${etiquetaCampo(k)}: ${formatearValorAuditoria(v)}`)
      .join(" · ");
  }
  return String(valor);
}

function extraerCambiosAuditoria(
  valor: unknown,
): Array<{ etiqueta: string; tipo: string; anterior: unknown; nuevo: unknown }> {
  if (!valor || typeof valor !== "object") return [];
  const cambios = (valor as { cambios?: unknown }).cambios;
  if (!Array.isArray(cambios)) return [];
  return cambios
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      etiqueta: String(c.etiqueta ?? c.clave ?? "Campo"),
      tipo: String(c.tipo ?? "TEXTO"),
      anterior: c.anterior,
      nuevo: c.nuevo,
    }));
}

export function PanelRevision() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { puede } = usePermisos();
  const [bandeja, setBandeja] = useState<BandejaAprobacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoFuncional | "TODOS">(() =>
    parseFiltroEstado(searchParams.get("estado")),
  );
  const [proyectoId, setProyectoId] = useState(
    () => searchParams.get("proyectoId") ?? "",
  );
  const [opcionesProyecto, setOpcionesProyecto] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [seleccion, setSeleccion] = useState<ItemBandejaAprobacion | null>(null);
  const [jornadaIdPendiente, setJornadaIdPendiente] = useState<string | null>(
    () => searchParams.get("jornadaId"),
  );
  const [docs, setDocs] = useState<DocumentoJornada[]>([]);
  const [audit, setAudit] = useState<AuditLogItem[]>([]);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [correccion, setCorreccion] = useState("");
  const [categoria, setCategoria] =
    useState<CategoriaRechazo>("INFORMACION_INCOMPLETA");
  const [motivoReenvio, setMotivoReenvio] = useState("");
  const [accionando, setAccionando] = useState(false);
  const [docComparar, setDocComparar] = useState<DocumentoJornada | null>(null);
  const [versionesComparar, setVersionesComparar] = useState<{
    a?: string;
    b?: string;
  } | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [mostrarFormularioRechazo, setMostrarFormularioRechazo] =
    useState(false);
  const [confirmarAprobar, setConfirmarAprobar] = useState(false);

  const esSupervisor = puede("jornadas.aprobar") || puede("jornadas.rechazar");
  const jornadaIdPendienteRef = useRef(jornadaIdPendiente);
  jornadaIdPendienteRef.current = jornadaIdPendiente;

  const urlRetornoRevision = useMemo(
    () =>
      construirUrlRevision({
        proyectoId,
        filtro,
        jornadaId: seleccion?.id ?? jornadaIdPendiente,
      }),
    [proyectoId, filtro, seleccion?.id, jornadaIdPendiente],
  );

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const res = await listarProyectos(token, {
          estado: "ACTIVO",
          limite: 100,
          orden: "nombre_asc",
        });
        setOpcionesProyecto(
          (res.datos ?? []).map((p) => ({ id: p.id, nombre: p.nombre })),
        );
      } catch {
        setOpcionesProyecto([]);
      }
    })();
  }, [token]);

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerBandejaAprobaciones(token, {
        vista: esSupervisor ? "supervisor" : "tecnico",
        estadoFuncional: filtro === "TODOS" ? undefined : filtro,
        proyectoId: proyectoId || undefined,
      });
      setBandeja(data);
      setSeleccion((prev) => {
        const idObjetivo = prev?.id ?? jornadaIdPendienteRef.current;
        if (!idObjetivo) return null;
        return data.items.find((i) => i.id === idObjetivo) ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la bandeja");
    } finally {
      setCargando(false);
    }
  }, [token, esSupervisor, filtro, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    const url = construirUrlRevision({
      proyectoId,
      filtro,
      jornadaId: seleccion?.id ?? jornadaIdPendiente,
    });
    const actual = `${window.location.pathname}${window.location.search}`;
    if (actual !== url) {
      router.replace(url, { scroll: false });
    }
  }, [proyectoId, filtro, seleccion?.id, jornadaIdPendiente, router]);

  useEffect(() => {
    setMostrarFormularioRechazo(false);
    setMotivoRechazo("");
    setCorreccion("");
    setCategoria("INFORMACION_INCOMPLETA");
    setMostrarDetalle(false);
    setConfirmarAprobar(false);
  }, [seleccion?.id]);

  useEffect(() => {
    if (!token || !seleccion) {
      setDocs([]);
      setAudit([]);
      return;
    }
    void (async () => {
      try {
        const [d, a] = await Promise.all([
          listarDocumentosJornada(token, seleccion.id),
          puede("auditoria.ver")
            ? listarAuditoria(token, { jornadaId: seleccion.id, limite: 30 })
            : Promise.resolve({ datos: [], total: 0, pagina: 1, limite: 30 }),
        ]);
        setDocs(d);
        setAudit(a.datos ?? []);
      } catch {
        setDocs([]);
        setAudit([]);
      }
    })();
  }, [token, seleccion, puede]);

  const filtros = esSupervisor ? FILTROS_SUPERVISOR : FILTROS_TECNICO;

  const contadores = useMemo(
    () => bandeja?.contadores ?? null,
    [bandeja],
  );

  async function ejecutar(fn: () => Promise<unknown>) {
    if (!token) return;
    setAccionando(true);
    setError(null);
    try {
      await fn();
      await cargar();
      setMotivoRechazo("");
      setCorreccion("");
      setMotivoReenvio("");
      setMostrarFormularioRechazo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acción fallida");
    } finally {
      setAccionando(false);
    }
  }

  function abrirComparacionDocumento(doc: DocumentoJornada) {
    setVersionesComparar(null);
    setDocComparar(doc);
  }

  function abrirComparacionDesdeAuditoria(entrada: AuditLogItem) {
    const doc =
      docs.find((d) => d.id === entrada.documentId) ??
      (docs.length === 1 ? docs[0] : null);
    if (!doc) {
      setError(
        "No se encontró el documento asociado para comparar versiones.",
      );
      return;
    }

    const versiones = versionesOrdenadas(doc);
    if (versiones.length < 2) {
      setError(
        "Aún no hay dos versiones guardadas para comparar. Si acabas de reenviar, vuelve a rechazar y reenviar tras reiniciar el backend (se corrigió un bug que borraba la versión nueva).",
      );
      return;
    }

    const nuevo = entrada.newValue as
      | { versionNumber?: number; previousVersionId?: string }
      | undefined;
    const previo = entrada.previousValue as
      | { versionNumber?: number; versionId?: string }
      | undefined;

    const versionB =
      (entrada.documentVersionId
        ? versiones.find((v) => v.id === entrada.documentVersionId)
        : undefined) ??
      (nuevo?.versionNumber != null
        ? versiones.find((v) => v.versionNumber === nuevo.versionNumber)
        : undefined) ??
      versiones[versiones.length - 1];

    const versionA =
      (versionB?.previousVersionId
        ? versiones.find((v) => v.id === versionB.previousVersionId)
        : undefined) ??
      (nuevo?.previousVersionId
        ? versiones.find((v) => v.id === nuevo.previousVersionId)
        : undefined) ??
      (previo?.versionId
        ? versiones.find((v) => v.id === previo.versionId)
        : undefined) ??
      (previo?.versionNumber != null
        ? versiones.find((v) => v.versionNumber === previo.versionNumber)
        : undefined) ??
      (versionB
        ? versiones.find((v) => v.versionNumber === versionB.versionNumber - 1)
        : undefined);

    if (!versionA || !versionB || versionA.id === versionB.id) {
      setError(
        "No se pudieron resolver las dos versiones de este cambio. Prueba «Comparar versiones» en el documento.",
      );
      return;
    }

    setError(null);
    setVersionesComparar({ a: versionA.id, b: versionB.id });
    setDocComparar(doc);
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ruralia-ink">
            Revisión y aprobación
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Trazabilidad, versiones y bandejas por rol.
          </p>
        </div>
        {contadores && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
              Revisión {contadores.pendientesRevision}
            </span>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
              Rechazo {contadores.rechazadas}
            </span>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-900">
              Corrección {contadores.enCorreccion}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              Aprobadas {contadores.aprobadas}
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3 rounded-2xl border border-ruralia-teal-border bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Proyecto
          </label>
          <SelectorDesplegable
            value={proyectoId}
            onChange={(id) => {
              setProyectoId(id);
              setSeleccion(null);
              setJornadaIdPendiente(null);
            }}
            opciones={opcionesProyecto}
            placeholder="Todos los proyectos"
            permitirVacio
            etiquetaVacio="Todos los proyectos"
            mensajeSinOpciones="No hay proyectos activos"
            icono={FolderKanban}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Filtra la bandeja por un proyecto o deja todos visibles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => {
                setFiltro(f.key);
                setSeleccion(null);
                setJornadaIdPendiente(null);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                filtro === f.key
                  ? "bg-ruralia-teal text-white"
                  : "bg-ruralia-teal-soft text-ruralia-teal-text hover:bg-ruralia-teal-soft/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alerta tipo="error" mensaje={error} />}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white">
          {cargando ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-y-auto max-h-[70vh]">
              {(bandeja?.items ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSeleccion(item);
                      setJornadaIdPendiente(item.id);
                    }}
                    className={`w-full px-4 py-3 text-left transition hover:bg-stone-50 ${
                      seleccion?.id === item.id ? "bg-teal-50/60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-stone-900">
                          {item.nombre || item.meta?.nombre || "Jornada"}
                        </p>
                        <p className="text-xs text-stone-500">
                          {item.fecha} · {item.proyecto?.nombre}
                        </p>
                        <p className="text-xs text-stone-500">
                          {item.tecnicoResponsable?.nombre}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeEstado(item.estadoFuncional)}`}
                      >
                        {etiquetaEstado(item.estadoFuncional)}
                      </span>
                    </div>
                    {item.rechazosAbiertos.length > 0 && (
                      <p className="mt-2 line-clamp-2 text-xs text-rose-700">
                        {item.rechazosAbiertos[0].requestedCorrection}
                      </p>
                    )}
                  </button>
                </li>
              ))}
              {!bandeja?.items.length && (
                <li className="p-8 text-center text-sm text-stone-500">
                  {proyectoId
                    ? "No hay jornadas de este proyecto en la bandeja."
                    : "No hay elementos en esta bandeja."}
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white p-5 max-h-[70vh]">
          {!seleccion ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center text-stone-500">
              <ClipboardCheck className="mb-3 h-10 w-10 opacity-40" />
              <p>Selecciona una jornada para revisar.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    {seleccion.nombre || seleccion.meta?.nombre || "Jornada"}
                  </h2>
                  <p className="text-sm text-stone-600">
                    {seleccion.proyecto?.nombre} · {seleccion.vereda?.nombre}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badgeEstado(seleccion.estadoFuncional)}`}
                  >
                    {etiquetaEstado(seleccion.estadoFuncional)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMostrarDetalle(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-ruralia-teal-border bg-white px-3 py-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal-soft"
                  >
                    <Eye className="h-4 w-4" />
                    Ver captura
                  </button>
                  {seleccion.proyecto ? (
                    <Link
                      href={`/proyectos/${seleccion.proyecto.id}?tab=jornadas&jornadaId=${seleccion.id}&desde=revision&retorno=${encodeURIComponent(urlRetornoRevision)}`}
                      className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Abrir en proyecto
                    </Link>
                  ) : null}
                </div>
              </div>

              {seleccion.rechazosAbiertos.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-900">
                    Corrección solicitada
                  </p>
                  {seleccion.rechazosAbiertos.map((r) => (
                    <div key={r.id} className="mt-2 text-sm text-rose-800">
                      <p className="font-medium">{r.category.replaceAll("_", " ")}</p>
                      <p>{r.reason}</p>
                      <p className="mt-1 font-medium">{r.requestedCorrection}</p>
                      <p className="mt-1 text-xs opacity-80">
                        {r.rejectedBy} ·{" "}
                        {new Date(r.rejectedAt).toLocaleString("es-CO")}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {docs.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-stone-800">
                    Documentos y versiones
                  </h3>
                  <ul className="space-y-2">
                    {docs.map((d) => {
                      const nVersiones = d.versiones?.length ?? 0;
                      return (
                        <li
                          key={d.id}
                          className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{d.titulo}</p>
                              <p className="text-xs text-stone-500">
                                {etiquetaEstado(d.estadoFuncional)} ·{" "}
                                {(d.versiones ?? [])
                                  .map(
                                    (v) =>
                                      `v${v.versionNumber} (${etiquetaEstado(v.status)})`,
                                  )
                                  .join(" → ") || "sin versiones"}
                              </p>
                            </div>
                            <BotonCompararVersiones
                              deshabilitado={nVersiones < 2}
                              onClick={() => abrirComparacionDocumento(d)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {audit.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-stone-800">
                    Historial de auditoría
                  </h3>
                  <ul className="max-h-80 space-y-2 overflow-y-auto">
                    {audit.map((a) => {
                      const cambios = extraerCambiosAuditoria(a.newValue);
                      const esVersion =
                        a.action === "CREATE_VERSION" ||
                        a.action === "GENERATE_DOCUMENT";
                      // Mostrar siempre en cards de versión; al click se resuelve
                      // si hay pares comparables o se explica el error.
                      const mostrarBotonDiff = esVersion && docs.length > 0;

                      return (
                        <li
                          key={a.id}
                          className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="font-semibold text-stone-900">
                                  {etiquetaAccionAuditoria(a.action)}
                                </span>
                                {a.field ? (
                                  <span className="text-stone-500">
                                    · {etiquetaCampo(a.field)}
                                  </span>
                                ) : null}
                                {cambios.length > 0 ? (
                                  <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[10px] font-semibold text-ruralia-teal-text">
                                    {cambios.length} cambio
                                    {cambios.length === 1 ? "" : "s"}
                                  </span>
                                ) : null}
                              </div>
                              {a.reason ? (
                                <p className="mt-0.5 text-stone-700">
                                  {a.reason}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-stone-500">
                                {etiquetaRol(a.userRole)} ·{" "}
                                {new Date(a.createdAt).toLocaleString("es-CO")}
                              </p>
                            </div>
                            {mostrarBotonDiff ? (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirComparacionDesdeAuditoria(a)
                                }
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-ruralia-teal-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ruralia-teal transition hover:bg-ruralia-teal-soft"
                              >
                                <GitCompareArrows className="h-3.5 w-3.5" />
                                Ver diferencias
                              </button>
                            ) : null}
                          </div>

                          {(a.previousValue != null || a.newValue != null) && (
                            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                              <div className="rounded-lg bg-white px-2 py-1.5 text-stone-600 ring-1 ring-stone-200">
                                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-stone-400">
                                  Antes
                                </span>
                                {formatearValorAuditoria(a.previousValue)}
                              </div>
                              <span className="text-stone-400" aria-hidden>
                                →
                              </span>
                              <div className="rounded-lg bg-white px-2 py-1.5 font-medium text-stone-800 ring-1 ring-stone-200">
                                <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-stone-400">
                                  Después
                                </span>
                                {formatearValorAuditoria(a.newValue)}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-4">
                {puede("jornadas.enviar_revision") &&
                  ["BORRADOR", "CAPTURADO", "SINCRONIZADO"].includes(
                    seleccion.estadoFuncional,
                  ) && (
                    <button
                      type="button"
                      disabled={accionando}
                      onClick={() =>
                        void ejecutar(() =>
                          enviarJornadaARevision(token!, seleccion.id),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Enviar a revisión
                    </button>
                  )}

                {puede("jornadas.enviar_revision") &&
                  ["RECHAZADO", "EN_CORRECCION"].includes(
                    seleccion.estadoFuncional,
                  ) && (
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex-1 text-xs text-stone-600">
                        Motivo de la corrección
                        <input
                          value={motivoReenvio}
                          onChange={(e) => setMotivoReenvio(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                          placeholder="Qué se corrigió…"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={accionando || motivoReenvio.trim().length < 3}
                        onClick={() =>
                          void ejecutar(() =>
                            reenviarJornadaARevision(
                              token!,
                              seleccion.id,
                              motivoReenvio.trim(),
                            ),
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" /> Reenviar
                      </button>
                    </div>
                  )}

                {puede("jornadas.aprobar") &&
                  seleccion.estadoFuncional === "EN_REVISION" && (
                    <button
                      type="button"
                      disabled={accionando}
                      onClick={() => setConfirmarAprobar(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </button>
                  )}

                {puede("jornadas.rechazar") &&
                  seleccion.estadoFuncional === "EN_REVISION" &&
                  !mostrarFormularioRechazo && (
                    <button
                      type="button"
                      disabled={accionando}
                      onClick={() => setMostrarFormularioRechazo(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                  )}
              </div>

              {puede("jornadas.rechazar") &&
                seleccion.estadoFuncional === "EN_REVISION" &&
                mostrarFormularioRechazo && (
                  <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-red-900">
                        Rechazar jornada
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarFormularioRechazo(false);
                          setMotivoRechazo("");
                          setCorreccion("");
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Cancelar
                      </button>
                    </div>
                    <select
                      value={categoria}
                      onChange={(e) =>
                        setCategoria(e.target.value as CategoriaRechazo)
                      }
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                    >
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={motivoRechazo}
                      onChange={(e) => setMotivoRechazo(e.target.value)}
                      placeholder="Motivo del rechazo"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                    />
                    <textarea
                      value={correccion}
                      onChange={(e) => setCorreccion(e.target.value)}
                      placeholder="Corrección solicitada (obligatoria)"
                      rows={3}
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                    />
                    <button
                      type="button"
                      disabled={
                        accionando ||
                        motivoRechazo.trim().length < 3 ||
                        correccion.trim().length < 3
                      }
                      onClick={() =>
                        void ejecutar(() =>
                          rechazarEntidad(token!, {
                            entityType: "JORNADA",
                            entityId: seleccion.id,
                            category: categoria,
                            reason: motivoRechazo.trim(),
                            requestedCorrection: correccion.trim(),
                          }),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Confirmar rechazo
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>
      </div>

      {mostrarDetalle && token && seleccion && (
        <ModalDetalleJornadaRevision
          abierto={mostrarDetalle}
          onCerrar={() => setMostrarDetalle(false)}
          token={token}
          jornadaId={seleccion.id}
          estadoFuncional={seleccion.estadoFuncional}
        />
      )}

      <Modal
        titulo="Confirmar aprobación"
        abierto={confirmarAprobar && seleccion !== null}
        onCerrar={() => setConfirmarAprobar(false)}
      >
        <p className="text-sm text-zinc-600">
          ¿Seguro que quieres aprobar{" "}
          <strong className="text-zinc-900">
            {seleccion?.nombre || seleccion?.meta?.nombre || "esta jornada"}
          </strong>
          {seleccion?.proyecto?.nombre
            ? ` del proyecto ${seleccion.proyecto.nombre}`
            : ""}
          ? Una vez aprobada, contará para el avance de la meta y no se podrá
          editar directamente.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmarAprobar(false)}
            disabled={accionando}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={accionando || !seleccion || !token}
            onClick={() => {
              if (!seleccion || !token) return;
              setConfirmarAprobar(false);
              void ejecutar(() =>
                aprobarEntidad(token, {
                  entityType: "JORNADA",
                  entityId: seleccion.id,
                }),
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {accionando ? "Aprobando..." : "Sí, aprobar"}
          </button>
        </div>
      </Modal>

      {docComparar && token && (
        <ModalComparacionVersiones
          abierto={Boolean(docComparar)}
          onCerrar={() => {
            setDocComparar(null);
            setVersionesComparar(null);
          }}
          token={token}
          documento={docComparar}
          versionAIdInicial={versionesComparar?.a}
          versionBIdInicial={versionesComparar?.b}
        />
      )}
    </div>
  );
}
