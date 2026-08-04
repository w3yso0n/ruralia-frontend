"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  BotonCompararVersiones,
  ModalComparacionVersiones,
} from "@/components/revision/modal-comparacion-versiones";
import {
  aprobarEntidad,
  enviarJornadaARevision,
  listarAuditoria,
  listarDocumentosJornada,
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
    if ("versionNumber" in obj) {
      return `Versión ${obj.versionNumber}`;
    }
    if ("status" in obj && "versionNumber" in obj) {
      return `Versión ${obj.versionNumber} (${etiquetaEstado(String(obj.status))})`;
    }
    return Object.entries(obj)
      .map(([k, v]) => `${etiquetaCampo(k)}: ${formatearValorAuditoria(v)}`)
      .join(" · ");
  }
  return String(valor);
}

export function PanelRevision() {
  const { token } = useAuth();
  const { puede } = usePermisos();
  const [bandeja, setBandeja] = useState<BandejaAprobacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<EstadoFuncional | "TODOS">("TODOS");
  const [seleccion, setSeleccion] = useState<ItemBandejaAprobacion | null>(null);
  const [docs, setDocs] = useState<DocumentoJornada[]>([]);
  const [audit, setAudit] = useState<AuditLogItem[]>([]);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [correccion, setCorreccion] = useState("");
  const [categoria, setCategoria] =
    useState<CategoriaRechazo>("INFORMACION_INCOMPLETA");
  const [motivoReenvio, setMotivoReenvio] = useState("");
  const [accionando, setAccionando] = useState(false);
  const [docComparar, setDocComparar] = useState<DocumentoJornada | null>(null);

  const esSupervisor = puede("jornadas.aprobar") || puede("jornadas.rechazar");

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerBandejaAprobaciones(token, {
        vista: esSupervisor ? "supervisor" : "tecnico",
        estadoFuncional: filtro === "TODOS" ? undefined : filtro,
      });
      setBandeja(data);
      if (seleccion) {
        const actualizado = data.items.find((i) => i.id === seleccion.id);
        setSeleccion(actualizado ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la bandeja");
    } finally {
      setCargando(false);
    }
  }, [token, esSupervisor, filtro, seleccion?.id]);

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, esSupervisor, filtro]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acción fallida");
    } finally {
      setAccionando(false);
    }
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col gap-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ruralia-ink">
            Revisión y aprobación
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Flujo RF-18 / RF-19: trazabilidad, versiones y bandejas por rol.
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

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              filtro === f.key
                ? "bg-ruralia-teal text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {f.label}
          </button>
        ))}
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
                    onClick={() => setSeleccion(item)}
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
                  No hay elementos en esta bandeja.
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
                {seleccion.proyecto && (
                  <Link
                    href={`/proyectos/${seleccion.proyecto.id}?tab=jornadas&jornadaId=${seleccion.id}`}
                    className="text-sm font-medium text-ruralia-teal hover:underline"
                  >
                    Abrir en proyecto →
                  </Link>
                )}
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
                              onClick={() => setDocComparar(d)}
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
                  <ul className="max-h-56 space-y-2 overflow-y-auto">
                    {audit.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-stone-900">
                            {etiquetaAccionAuditoria(a.action)}
                          </span>
                          {a.field ? (
                            <span className="text-stone-500">
                              · {etiquetaCampo(a.field)}
                            </span>
                          ) : null}
                        </div>
                        {a.reason ? (
                          <p className="mt-0.5 text-stone-700">{a.reason}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-stone-500">
                          {etiquetaRol(a.userRole)} ·{" "}
                          {new Date(a.createdAt).toLocaleString("es-CO")}
                        </p>
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
                    ))}
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
                      onClick={() =>
                        void ejecutar(() =>
                          aprobarEntidad(token!, {
                            entityType: "JORNADA",
                            entityId: seleccion.id,
                          }),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </button>
                  )}
              </div>

              {puede("jornadas.rechazar") &&
                seleccion.estadoFuncional === "EN_REVISION" && (
                  <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <p className="text-sm font-semibold text-rose-900">
                      Rechazar jornada
                    </p>
                    <select
                      value={categoria}
                      onChange={(e) =>
                        setCategoria(e.target.value as CategoriaRechazo)
                      }
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={correccion}
                      onChange={(e) => setCorreccion(e.target.value)}
                      placeholder="Corrección solicitada (obligatoria)"
                      rows={3}
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>
      </div>

      {docComparar && token && (
        <ModalComparacionVersiones
          abierto={Boolean(docComparar)}
          onCerrar={() => setDocComparar(null)}
          token={token}
          documento={docComparar}
        />
      )}
    </div>
  );
}
