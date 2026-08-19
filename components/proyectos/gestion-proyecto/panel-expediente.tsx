"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  OpcionDesplegable,
  SelectorDesplegable,
} from "@/components/ui/selector-desplegable";
import {
  eliminarDocumentoExterno,
  obtenerExpedienteProyecto,
  subirDocumentoExterno,
} from "@/lib/api";
import type {
  ExpedienteProyecto,
  PlanProyecto,
  Proyecto,
  TipoDocumentoExterno,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const TIPOS_DOCUMENTO: { id: TipoDocumentoExterno; nombre: string }[] = [
  { id: "PDF", nombre: "PDF" },
  { id: "WORD", nombre: "Word" },
  { id: "EXCEL", nombre: "Excel" },
  { id: "ESCANEO", nombre: "Escaneo" },
  { id: "FOTO", nombre: "Fotografía" },
  { id: "ACTA_TERCERO", nombre: "Acta de terceros" },
  { id: "OTRO", nombre: "Otro" },
];

function iconoPorTipoMime(tipoMime: string) {
  if (tipoMime.startsWith("image/")) return ImageIcon;
  if (tipoMime.includes("sheet") || tipoMime.includes("excel"))
    return FileSpreadsheet;
  return FileText;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface PanelExpedienteProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  plan: PlanProyecto | null;
  puedeGestionar: boolean;
}

export function PanelExpediente({
  token,
  proyectoId,
  proyecto,
  plan,
  puedeGestionar,
}: PanelExpedienteProps) {
  const [expediente, setExpediente] = useState<ExpedienteProyecto | null>(
    null,
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await obtenerExpedienteProyecto(token, proyectoId);
      setExpediente(datos);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el expediente",
      );
    } finally {
      setCargando(false);
    }
  }, [token, proyectoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function manejarEliminar(id: string) {
    if (!confirm("¿Eliminar este documento externo del expediente?")) return;
    try {
      await eliminarDocumentoExterno(token, id);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al eliminar el documento",
      );
    }
  }

  const beneficiariosOpciones: OpcionDesplegable[] = (
    proyecto.beneficiarios ?? []
  ).map((b) => ({ id: b.id, nombre: `${b.nombres} ${b.apellidos}` }));

  const asociacionesOpciones: OpcionDesplegable[] = (
    proyecto.asociaciones ?? []
  ).map((a) => ({ id: a.id, nombre: a.nombre }));

  const veredasOpciones: OpcionDesplegable[] = (proyecto.veredas ?? []).map(
    (v) => ({ id: v.id, nombre: v.nombre }),
  );

  const actividadesOpciones: OpcionDesplegable[] = (
    plan?.actividades ?? []
  ).map((a) => ({ id: a.id, nombre: a.nombre }));

  if (cargando) return <Spinner />;

  return (
    <div className="space-y-4">
      {error ? <Alerta mensaje={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
          <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-xs font-semibold text-ruralia-teal-text">
            {expediente?.totales.generados ?? 0} generados
          </span>
          <span className="rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-xs font-semibold text-ruralia-teal-text">
            {expediente?.totales.externos ?? 0} externos
          </span>
        </div>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={() => setMostrarFormulario((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
          >
            <Upload className="h-4 w-4" />
            {mostrarFormulario ? "Cancelar" : "Cargar documento"}
          </button>
        ) : null}
      </div>

      {mostrarFormulario ? (
        <FormularioCargaDocumento
          token={token}
          proyectoId={proyectoId}
          actividadesOpciones={actividadesOpciones}
          beneficiariosOpciones={beneficiariosOpciones}
          asociacionesOpciones={asociacionesOpciones}
          veredasOpciones={veredasOpciones}
          onSubido={async () => {
            setMostrarFormulario(false);
            await cargar();
          }}
          onError={setError}
        />
      ) : null}

      <div className="rounded-2xl border border-ruralia-teal-border bg-white">
        <div className="border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-2.5">
          <p className="text-sm font-semibold text-zinc-900">
            Documentos generados por la plataforma
          </p>
        </div>
        {!expediente?.documentosGenerados.length ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            Aún no hay actas ni informes generados para este proyecto.
          </p>
        ) : (
          <ul className="divide-y divide-ruralia-teal-border">
            {expediente.documentosGenerados.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {doc.titulo}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {doc.tipo} ·{" "}
                    {new Date(doc.creadoEn).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <span className="inline-flex w-fit shrink-0 rounded-full border border-ruralia-teal/40 bg-ruralia-teal-soft px-2.5 py-0.5 text-xs font-medium text-ruralia-teal-text">
                  {doc.estadoFuncional}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-ruralia-teal-border bg-white">
        <div className="border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-2.5">
          <p className="text-sm font-semibold text-zinc-900">
            Documentos externos
          </p>
          <p className="text-xs text-zinc-500">
            Actas de terceros, escaneos y archivos cargados manualmente
          </p>
        </div>
        {!expediente?.documentosExternos.length ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No se han cargado documentos externos todavía.
          </p>
        ) : (
          <ul className="divide-y divide-ruralia-teal-border">
            {expediente.documentosExternos.map((doc) => {
              const Icono = iconoPorTipoMime(doc.tipoMime);
              return (
                <li
                  key={doc.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <Icono className="mt-0.5 h-4 w-4 shrink-0 text-ruralia-teal-muted" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {doc.titulo}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {doc.nombreArchivo} · {formatearTamano(doc.tamanoArchivo)}{" "}
                        · {doc.subidoPor.nombreCompleto} ·{" "}
                        {new Date(doc.creadoEn).toLocaleDateString("es-CO")}
                      </p>
                      {doc.actividad || doc.beneficiario || doc.asociacion || doc.vereda ? (
                        <p className="mt-0.5 truncate text-xs text-ruralia-teal-text">
                          {[
                            doc.actividad?.nombre,
                            doc.beneficiario
                              ? `${doc.beneficiario.nombres} ${doc.beneficiario.apellidos}`
                              : null,
                            doc.asociacion?.nombre,
                            doc.vereda?.nombre,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                      {TIPOS_DOCUMENTO.find((t) => t.id === doc.tipo)?.nombre ??
                        doc.tipo}
                    </span>
                    <a
                      href={`${API_URL}/${doc.urlArchivo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-1.5 text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                      title="Descargar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    {puedeGestionar ? (
                      <button
                        type="button"
                        onClick={() => void manejarEliminar(doc.id)}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface FormularioCargaDocumentoProps {
  token: string;
  proyectoId: string;
  actividadesOpciones: OpcionDesplegable[];
  beneficiariosOpciones: OpcionDesplegable[];
  asociacionesOpciones: OpcionDesplegable[];
  veredasOpciones: OpcionDesplegable[];
  onSubido: () => void;
  onError: (mensaje: string) => void;
}

function FormularioCargaDocumento({
  token,
  proyectoId,
  actividadesOpciones,
  beneficiariosOpciones,
  asociacionesOpciones,
  veredasOpciones,
  onSubido,
  onError,
}: FormularioCargaDocumentoProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoDocumentoExterno>("PDF");
  const [actividadId, setActividadId] = useState("");
  const [beneficiarioId, setBeneficiarioId] = useState("");
  const [asociacionId, setAsociacionId] = useState("");
  const [veredaId, setVeredaId] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  async function manejarSubmit() {
    if (!archivo || !titulo.trim()) return;
    setSubiendo(true);
    try {
      await subirDocumentoExterno(token, archivo, {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo,
        proyectoId,
        actividadId: actividadId || undefined,
        beneficiarioId: beneficiarioId || undefined,
        asociacionId: asociacionId || undefined,
        veredaId: veredaId || undefined,
      });
      onSubido();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Error al subir el documento",
      );
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-5">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Archivo
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Título
        </label>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Acta de entrega firmada por la alcaldía"
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-ruralia-teal focus:outline-none focus:ring-2 focus:ring-ruralia-teal/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700">
          Descripción (opcional)
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm focus:border-ruralia-teal focus:outline-none focus:ring-2 focus:ring-ruralia-teal/20"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Tipo de documento
          </label>
          <SelectorDesplegable
            value={tipo}
            onChange={(id) => setTipo(id as TipoDocumentoExterno)}
            opciones={TIPOS_DOCUMENTO}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Actividad (opcional)
          </label>
          <SelectorDesplegable
            value={actividadId}
            onChange={setActividadId}
            opciones={actividadesOpciones}
            permitirVacio
            etiquetaVacio="Sin actividad"
            mensajeSinOpciones="Sin actividades"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Beneficiario (opcional)
          </label>
          <SelectorDesplegable
            value={beneficiarioId}
            onChange={setBeneficiarioId}
            opciones={beneficiariosOpciones}
            permitirVacio
            etiquetaVacio="Sin beneficiario"
            mensajeSinOpciones="Sin beneficiarios"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Asociación (opcional)
          </label>
          <SelectorDesplegable
            value={asociacionId}
            onChange={setAsociacionId}
            opciones={asociacionesOpciones}
            permitirVacio
            etiquetaVacio="Sin asociación"
            mensajeSinOpciones="Sin asociaciones"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Vereda (opcional)
          </label>
          <SelectorDesplegable
            value={veredaId}
            onChange={setVeredaId}
            opciones={veredasOpciones}
            permitirVacio
            etiquetaVacio="Sin vereda"
            mensajeSinOpciones="Sin veredas"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={subiendo || !archivo || !titulo.trim()}
          onClick={() => void manejarSubmit()}
          className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover disabled:opacity-50"
        >
          {subiendo ? "Subiendo..." : "Guardar documento"}
        </button>
      </div>
    </div>
  );
}
