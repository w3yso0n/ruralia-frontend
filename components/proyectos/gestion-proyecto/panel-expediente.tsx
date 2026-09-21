"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";
import { DescargaExpediente } from "@/components/proyectos/gestion-proyecto/descarga-expediente";
import { Alerta, Spinner } from "@/components/ui/modal";
import {
  OpcionDesplegable,
  SelectorDesplegable,
} from "@/components/ui/selector-desplegable";
import {
  descargarPdfDocumento,
  eliminarDocumentoExterno,
  obtenerExpedienteProyecto,
  subirDocumentoExterno,
} from "@/lib/api";
import type {
  DocumentoExterno,
  DocumentoJornada,
  EvidenciaExpediente,
  ExpedienteProyecto,
  FormularioExpediente,
  JornadaExpediente,
  PersonaExpediente,
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

const SIN_JORNADA = "sin-jornada";

interface GrupoExpediente {
  id: string;
  titulo: string;
  detalle: string;
  orden: string;
  cantidad: number;
  documentos: DocumentoJornada[];
  evidencias: EvidenciaExpediente[];
  formularios: FormularioExpediente[];
  externos: DocumentoExterno[];
}

function formatearFecha(valor?: string | null): string | null {
  if (!valor) return null;
  const dia = valor.slice(0, 10);
  const [anio, mes, fecha] = dia.split("-");
  if (!anio || !mes || !fecha) return null;
  return `${Number(fecha)}/${Number(mes)}/${anio}`;
}

function nombrePersona(persona: PersonaExpediente): string {
  return `${persona.nombres} ${persona.apellidos}`.trim();
}

function personasDe(jornada?: JornadaExpediente | null): PersonaExpediente[] {
  return jornada?.beneficiarios ?? [];
}

function detallePersonas(jornada?: JornadaExpediente | null): string {
  const personas = personasDe(jornada).map(nombrePersona).filter(Boolean);
  if (personas.length) return personas.join(", ");
  if (jornada?.tecnicoResponsableNombre) {
    return `Agente ${jornada.tecnicoResponsableNombre}`;
  }
  return "Sin persona asignada";
}

function tituloJornada(jornada?: JornadaExpediente | null): string {
  const fecha = formatearFecha(jornada?.fecha);
  if (jornada?.nombre && fecha) return `${fecha} · ${jornada.nombre}`;
  if (jornada?.nombre) return jornada.nombre;
  if (fecha) return `Jornada ${fecha}`;
  return "Jornada";
}

function urlPublica(ruta: string): string {
  if (/^https?:\/\//i.test(ruta) || ruta.startsWith("data:")) return ruta;
  return `${API_URL}/${ruta.replace(/^\//, "")}`;
}

function esImagen(url: string, mime?: string) {
  if (mime?.startsWith("image/")) return true;
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function totalGrupo(grupo: GrupoExpediente) {
  const adjuntos = grupo.formularios.reduce(
    (total, formulario) => total + formulario.adjuntos.length,
    0,
  );
  const avisoSinPdf =
    grupo.documentos.length === 0 &&
    adjuntos === 0 &&
    grupo.formularios.length > 0
      ? 1
      : 0;
  return (
    grupo.documentos.length + grupo.evidencias.length + adjuntos + avisoSinPdf
  );
}

function armarGruposJornada(
  expediente: ExpedienteProyecto | null,
): GrupoExpediente[] {
  const mapa = new Map<string, GrupoExpediente>();

  function asegurar(jornada?: JornadaExpediente | null) {
    const id = jornada?.id ?? SIN_JORNADA;
    const actual = mapa.get(id);
    if (actual) return actual;
    const grupo: GrupoExpediente = {
      id,
      titulo: jornada ? tituloJornada(jornada) : "Sin jornada",
      detalle: jornada ? detallePersonas(jornada) : "Archivos no vinculados",
      orden: jornada?.fecha?.slice(0, 10) ?? "",
      cantidad: 0,
      documentos: [],
      evidencias: [],
      formularios: [],
      externos: [],
    };
    mapa.set(id, grupo);
    return grupo;
  }

  for (const doc of expediente?.documentosGenerados ?? []) {
    const grupo = asegurar(doc.jornada);
    grupo.documentos.push(doc);
  }
  for (const evidencia of expediente?.evidencias ?? []) {
    const grupo = asegurar(evidencia.jornada);
    grupo.evidencias.push(evidencia);
  }
  for (const formulario of expediente?.formularios ?? []) {
    const grupo = asegurar(formulario.jornada);
    grupo.formularios.push(formulario);
  }

  const grupos = [...mapa.values()].filter((g) => totalGrupo(g) > 0);
  grupos.sort((a, b) => b.orden.localeCompare(a.orden));
  for (const grupo of grupos) {
    grupo.cantidad = totalGrupo(grupo);
  }
  return grupos;
}

function detalleExterno(doc: DocumentoExterno): string {
  const tipo =
    TIPOS_DOCUMENTO.find((item) => item.id === doc.tipo)?.nombre ?? doc.tipo;
  const vinculo = [
    doc.beneficiario ? nombrePersona(doc.beneficiario) : null,
    doc.asociacion?.nombre,
    doc.vereda?.nombre,
    doc.actividad?.nombre,
  ]
    .filter(Boolean)
    .join(" · ");
  return vinculo ? `${tipo} · ${vinculo}` : tipo;
}

function armarMenuExternos(
  expediente: ExpedienteProyecto | null,
): GrupoExpediente[] {
  return (expediente?.documentosExternos ?? []).map((doc) => ({
    id: doc.id,
    titulo: doc.titulo,
    detalle: detalleExterno(doc),
    orden: doc.creadoEn,
    cantidad: 1,
    documentos: [],
    evidencias: [],
    formularios: [],
    externos: [doc],
  }));
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
  const [archivoEnCurso, setArchivoEnCurso] = useState<string | null>(null);
  const [vista, setVista] = useState<"jornadas" | "externos">("jornadas");
  const [seleccion, setSeleccion] = useState<string | null>(null);

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

  const gruposJornada = useMemo(
    () => armarGruposJornada(expediente),
    [expediente],
  );
  const gruposExternos = useMemo(
    () => armarMenuExternos(expediente),
    [expediente],
  );
  const grupos = vista === "jornadas" ? gruposJornada : gruposExternos;
  const grupoActivo = grupos.find((grupo) => grupo.id === seleccion) ?? null;

  useEffect(() => {
    if (!grupos.length) {
      setSeleccion(null);
      return;
    }
    setSeleccion((actual) =>
      actual && grupos.some((grupo) => grupo.id === actual)
        ? actual
        : grupos[0].id,
    );
  }, [grupos]);

  async function abrirDocumento(doc: DocumentoJornada, modo: "ver" | "descargar") {
    setArchivoEnCurso(`${modo}:${doc.id}`);
    setError(null);
    try {
      const blob = await descargarPdfDocumento(token, doc.id);
      const url = URL.createObjectURL(blob);
      if (modo === "ver") {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        return;
      }
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${doc.titulo}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo abrir el documento",
      );
    } finally {
      setArchivoEnCurso(null);
    }
  }

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
        <p className="max-w-xl text-sm text-zinc-600">
          {vista === "jornadas"
            ? "Elige una jornada para ver su formulario, la evidencia que se cargó al llenarlo y los archivos de la visita."
            : "Archivos cargados a mano: actas de terceros, escaneos y otros documentos del proyecto."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {vista === "jornadas" ? (
            <DescargaExpediente token={token} proyecto={proyecto} plan={plan} />
          ) : null}
          {puedeGestionar && vista === "externos" ? (
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
      </div>

      {mostrarFormulario && vista === "externos" ? (
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

      <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1">
        <button
          type="button"
          onClick={() => {
            setVista("jornadas");
            setMostrarFormulario(false);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            vista === "jornadas"
              ? "bg-ruralia-teal text-white"
              : "text-zinc-600 hover:bg-ruralia-teal-soft"
          }`}
        >
          Jornadas
        </button>
        <button
          type="button"
          onClick={() => {
            setVista("externos");
            setMostrarFormulario(false);
          }}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            vista === "externos"
              ? "bg-ruralia-teal text-white"
              : "text-zinc-600 hover:bg-ruralia-teal-soft"
          }`}
        >
          Documentos externos
        </button>
      </div>

      {!grupos.length ? (
        <p className="rounded-2xl border border-ruralia-teal-border bg-white px-4 py-6 text-center text-sm text-zinc-500">
          {vista === "externos"
            ? "Todavía no hay documentos externos."
            : "Todavía no hay jornadas con formulario o evidencia."}
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav className="rounded-2xl border border-ruralia-teal-border bg-white p-2">
            <BloqueMenu
              grupos={grupos}
              activoId={grupoActivo?.id ?? null}
              onElegir={setSeleccion}
            />
          </nav>
          {grupoActivo ? (
            vista === "externos" && grupoActivo.externos[0] ? (
              <ArchivoExterno
                doc={grupoActivo.externos[0]}
                puedeGestionar={puedeGestionar}
                onEliminar={() =>
                  void manejarEliminar(grupoActivo.externos[0].id)
                }
              />
            ) : (
              <DetalleJornada
                grupo={grupoActivo}
                archivoEnCurso={archivoEnCurso}
                onAbrir={(doc, modo) => void abrirDocumento(doc, modo)}
              />
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

function DetalleJornada({
  grupo,
  archivoEnCurso,
  onAbrir,
}: {
  grupo: GrupoExpediente;
  archivoEnCurso: string | null;
  onAbrir: (doc: DocumentoJornada, modo: "ver" | "descargar") => void;
}) {
  const adjuntos = grupo.formularios.flatMap((formulario) =>
    formulario.adjuntos.map((adjunto, indice) => ({
      ...adjunto,
      clave: `${formulario.id}-${indice}`,
      formulario: formulario.plantillaNombre,
    })),
  );

  const vacio =
    grupo.documentos.length === 0 &&
    adjuntos.length === 0 &&
    grupo.evidencias.length === 0;

  if (vacio) {
    return (
      <p className="rounded-2xl border border-ruralia-teal-border bg-white px-4 py-6 text-sm text-zinc-500">
        Esta jornada no tiene archivos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {grupo.documentos.length || grupo.formularios.length ? (
        <SeccionArchivos
          titulo="Formulario"
          descripcion="PDF del formulario o del acta de esta jornada."
        >
          {!grupo.documentos.length ? (
            <p className="px-4 py-3 text-sm text-zinc-500">
              El formulario ya se envió
              {grupo.formularios[0]?.plantillaNombre
                ? ` (${grupo.formularios[0].plantillaNombre})`
                : ""}
              . El PDF queda disponible cuando la jornada se envía a revisión o
              se sube al proyecto.
            </p>
          ) : null}
          {grupo.documentos.length ? (
          <ul className="divide-y divide-ruralia-teal-border">
            {grupo.documentos.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="min-w-0 truncate text-sm font-medium text-zinc-900">
                  {doc.titulo}
                </p>
                <AccionesPdf
                  ocupado={
                    archivoEnCurso === `ver:${doc.id}` ||
                    archivoEnCurso === `descargar:${doc.id}`
                  }
                  onVer={() => onAbrir(doc, "ver")}
                  onDescargar={() => onAbrir(doc, "descargar")}
                />
              </li>
            ))}
          </ul>
          ) : null}
        </SeccionArchivos>
      ) : null}

      {adjuntos.length ? (
        <SeccionArchivos
          titulo="Evidencia del formulario"
          descripcion="Fotos, firmas y archivos que se cargaron al llenar el formulario."
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {adjuntos.map((adjunto) => (
              <div key={adjunto.clave} className="min-w-0">
                <p className="mb-1 truncate text-sm font-medium text-zinc-800">
                  {adjunto.etiqueta}
                </p>
                <p className="mb-2 truncate text-xs text-zinc-500">
                  {adjunto.formulario}
                </p>
                <VistaAdjunto url={adjunto.url} nombre={adjunto.etiqueta} />
              </div>
            ))}
          </div>
        </SeccionArchivos>
      ) : null}

      {grupo.evidencias.length ? (
        <SeccionArchivos
          titulo="Archivos de la visita"
          descripcion="Fotos y archivos capturados durante la jornada, aparte del formulario."
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {grupo.evidencias.map((evidencia) => (
              <div key={evidencia.id} className="min-w-0">
                <p className="mb-1 truncate text-sm font-medium text-zinc-800">
                  {evidencia.nombreArchivo}
                </p>
                <p className="mb-2 text-xs text-zinc-500">{evidencia.tipo}</p>
                {evidencia.urlArchivo ? (
                  <VistaAdjunto
                    url={evidencia.urlArchivo}
                    mime={evidencia.tipoMime}
                    nombre={evidencia.nombreArchivo}
                  />
                ) : (
                  <p className="text-xs text-zinc-400">Sin archivo</p>
                )}
              </div>
            ))}
          </div>
        </SeccionArchivos>
      ) : null}
    </div>
  );
}

function AccionesPdf({
  ocupado,
  onVer,
  onDescargar,
}: {
  ocupado: boolean;
  onVer: () => void;
  onDescargar: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={ocupado}
        onClick={onVer}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
      >
        <Eye className="h-4 w-4" />
        Ver
      </button>
      <button
        type="button"
        disabled={ocupado}
        onClick={onDescargar}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Descargar
      </button>
    </div>
  );
}

function BloqueMenu({
  titulo,
  grupos,
  activoId,
  onElegir,
}: {
  titulo?: string;
  grupos: GrupoExpediente[];
  activoId: string | null;
  onElegir: (id: string) => void;
}) {
  return (
    <div>
      {titulo ? (
        <p className="px-3 pb-1 pt-1 text-xs font-semibold text-zinc-500">
          {titulo}
        </p>
      ) : null}
      <ul className="space-y-1">
        {grupos.map((grupo) => {
          const activo = grupo.id === activoId;
          return (
            <li key={grupo.id}>
              <button
                type="button"
                onClick={() => onElegir(grupo.id)}
                className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left ${
                  activo
                    ? "bg-ruralia-teal text-white"
                    : "text-zinc-800 hover:bg-ruralia-teal-soft"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {grupo.titulo}
                  </span>
                  <span
                    className={`block truncate text-xs ${
                      activo ? "text-white/80" : "text-zinc-500"
                    }`}
                  >
                    {grupo.detalle}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    activo
                      ? "bg-white/20 text-white"
                      : "bg-ruralia-teal-soft text-ruralia-teal-text"
                  }`}
                >
                  {grupo.cantidad}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ArchivoExterno({
  doc,
  puedeGestionar,
  onEliminar,
}: {
  doc: DocumentoExterno;
  puedeGestionar: boolean;
  onEliminar: () => void;
}) {
  const Icono = iconoPorTipoMime(doc.tipoMime);
  return (
    <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
      <div className="flex items-start gap-3">
        <Icono className="mt-0.5 h-5 w-5 shrink-0 text-ruralia-teal" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-zinc-900">{doc.titulo}</p>
          <p className="mt-1 text-sm text-zinc-500">{detalleExterno(doc)}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {doc.nombreArchivo} · {formatearTamano(doc.tamanoArchivo)} ·{" "}
            {doc.subidoPor.nombreCompleto} ·{" "}
            {new Date(doc.creadoEn).toLocaleDateString("es-CO")}
          </p>
          {doc.descripcion ? (
            <p className="mt-3 text-sm text-zinc-700">{doc.descripcion}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <a
          href={urlPublica(doc.urlArchivo)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ruralia-teal px-3.5 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover"
        >
          <Download className="h-4 w-4" />
          Descargar
        </a>
        {puedeGestionar ? (
          <button
            type="button"
            onClick={onEliminar}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        ) : null}
      </div>
    </section>
  );
}

function VistaAdjunto({
  url,
  mime,
  nombre,
}: {
  url: string;
  mime?: string;
  nombre: string;
}) {
  const publica = urlPublica(url);
  if (esImagen(url, mime)) {
    return (
      <a href={publica} target="_blank" rel="noreferrer" className="block">
        <img
          src={publica}
          alt={nombre}
          className="max-h-40 w-full rounded-xl border border-ruralia-teal-border bg-white object-contain"
        />
      </a>
    );
  }
  return (
    <a
      href={publica}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
    >
      <Eye className="h-4 w-4" />
      Ver
    </a>
  );
}

function SeccionArchivos({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ruralia-teal-border bg-white">
      <div className="border-b border-ruralia-teal-border bg-ruralia-teal-soft/40 px-4 py-2.5">
        <p className="text-sm font-semibold text-zinc-900">{titulo}</p>
        <p className="text-xs text-zinc-500">{descripcion}</p>
      </div>
      {children}
    </section>
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
