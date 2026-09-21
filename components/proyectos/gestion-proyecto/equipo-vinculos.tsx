"use client";

import { useEffect, useState } from "react";
import { CargaExcelBeneficiarios } from "@/components/proyectos/carga-excel-beneficiarios";
import { Alerta, Modal } from "@/components/ui/modal";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import { SelectorVeredasMultiple } from "@/components/ui/selector-veredas-multiple";
import {
  asignarAsociacionesProyecto,
  asignarBeneficiariosProyecto,
  asignarPersonalProyecto,
  asignarTerritoriosProyecto,
  historialBeneficiarioProyecto,
  importarBeneficiariosExcelProyecto,
  listarAsociaciones,
  listarBeneficiarios,
  listarTodasLasPaginas,
  listarUsuarios,
  reemplazarBeneficiarioProyecto,
} from "@/lib/api";
import type {
  HistorialBeneficiarioProyecto,
  Proyecto,
  ResultadoCargaMasivaBeneficiarios,
  TipoDocumento,
} from "@/lib/types";

interface EquipoVinculosProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  puedeGestionar: boolean;
  onActualizar: () => Promise<void>;
}

function etiquetaBeneficiario(b: {
  nombres: string;
  apellidos: string;
  numeroDocumento?: string;
}): string {
  const nombre = `${b.nombres} ${b.apellidos}`.trim();
  return b.numeroDocumento ? `${nombre} · ${b.numeroDocumento}` : nombre;
}

export function EquipoVinculos({
  token,
  proyectoId,
  proyecto,
  puedeGestionar,
  onActualizar,
}: EquipoVinculosProps) {
  const [veredaIds, setVeredaIds] = useState<string[]>([]);
  const [usuarioIds, setUsuarioIds] = useState<string[]>([]);
  const [beneficiarioIds, setBeneficiarioIds] = useState<string[]>([]);
  const [asociacionIds, setAsociacionIds] = useState<string[]>([]);
  const [opcionesUsuarios, setOpcionesUsuarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesBeneficiarios, setOpcionesBeneficiarios] = useState<
    { id: string; nombre: string; subtitulo?: string }[]
  >([]);
  const [opcionesAsociaciones, setOpcionesAsociaciones] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [resultadoCarga, setResultadoCarga] =
    useState<ResultadoCargaMasivaBeneficiarios | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reemplazoId, setReemplazoId] = useState<string | null>(null);
  const [modoReemplazo, setModoReemplazo] = useState<"existente" | "nuevo">(
    "nuevo",
  );
  const [nuevoBeneficiarioId, setNuevoBeneficiarioId] = useState("");
  const [nombresNuevo, setNombresNuevo] = useState("");
  const [documentoNuevo, setDocumentoNuevo] = useState("");
  const [tipoDocumentoNuevo, setTipoDocumentoNuevo] =
    useState<TipoDocumento>("CC");
  const [notaReemplazo, setNotaReemplazo] = useState("");

  const [historialId, setHistorialId] = useState<string | null>(null);
  const [historial, setHistorial] =
    useState<HistorialBeneficiarioProyecto | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    setVeredaIds(proyecto.veredas?.map((v) => v.id) ?? []);
    setUsuarioIds(proyecto.personal?.map((p) => p.id) ?? []);
    setBeneficiarioIds(proyecto.beneficiarios?.map((b) => b.id) ?? []);
    setAsociacionIds(proyecto.asociaciones?.map((a) => a.id) ?? []);
  }, [proyecto]);

  useEffect(() => {
    void Promise.all([
      listarTodasLasPaginas((pagina, limite) =>
        listarUsuarios(token, { pagina, limite, estaActivo: true }),
      ),
      listarTodasLasPaginas((pagina, limite) =>
        listarBeneficiarios(token, { pagina, limite }),
      ),
      listarTodasLasPaginas((pagina, limite) =>
        listarAsociaciones(token, { pagina, limite }),
      ),
    ])
      .then(([usuarios, beneficiarios, asociaciones]) => {
        setOpcionesUsuarios(
          usuarios.map((u) => ({ id: u.id, nombre: u.nombreCompleto })),
        );
        setOpcionesBeneficiarios(
          beneficiarios.map((b) => ({
            id: b.id,
            nombre: `${b.nombres} ${b.apellidos}`,
            subtitulo: b.numeroDocumento,
          })),
        );
        setOpcionesAsociaciones(
          asociaciones.map((a) => ({ id: a.id, nombre: a.nombre })),
        );
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar equipo y contraparte",
        );
      });
  }, [token]);

  async function guardarSeccion(
    tipo: "territorio" | "personal" | "beneficiarios" | "asociaciones",
  ) {
    setEnviando(true);
    setError(null);
    setExito(null);
    try {
      if (tipo === "territorio") {
        if (!veredaIds.length) {
          setError("Selecciona al menos una vereda");
          return;
        }
        await asignarTerritoriosProyecto(token, proyectoId, { veredaIds });
      }
      if (tipo === "personal") {
        if (!usuarioIds.length) {
          setError("Selecciona al menos una persona del equipo interno");
          return;
        }
        await asignarPersonalProyecto(token, proyectoId, { usuarioIds });
      }
      if (tipo === "beneficiarios") {
        await asignarBeneficiariosProyecto(token, proyectoId, {
          beneficiarios: beneficiarioIds.map((id) => ({ beneficiarioId: id })),
        });
      }
      if (tipo === "asociaciones") {
        await asignarAsociacionesProyecto(token, proyectoId, {
          asociaciones: asociacionIds.map((id) => ({ asociacionId: id })),
        });
      }
      setExito("Cambios guardados");
      await onActualizar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  async function importarExcel(archivo: File) {
    setImportando(true);
    setError(null);
    setExito(null);
    try {
      const resultado = await importarBeneficiariosExcelProyecto(
        token,
        proyectoId,
        archivo,
      );
      setResultadoCarga(resultado);
      setArchivoExcel(null);
      const resumen = `${resultado.creados} creados, ${resultado.asignadosExistentes} ya estaban en la BD, ${resultado.yaEnProyecto} ya estaban en el proyecto${resultado.errores ? `, ${resultado.errores} con error` : ""}.`;
      setExito(`Carga masiva lista: ${resumen}`);
      await onActualizar();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al importar el Excel",
      );
    } finally {
      setImportando(false);
    }
  }

  async function confirmarReemplazo() {
    if (!reemplazoId) return;
    setEnviando(true);
    setError(null);
    try {
      if (modoReemplazo === "existente") {
        if (!nuevoBeneficiarioId) {
          setError("Selecciona a la persona que entra como reemplazo");
          return;
        }
        await reemplazarBeneficiarioProyecto(token, proyectoId, reemplazoId, {
          nuevoBeneficiarioId,
          nota: notaReemplazo.trim() || undefined,
        });
      } else {
        if (!nombresNuevo.trim() || !documentoNuevo.trim()) {
          setError("El reemplazo necesita nombre e identificador único");
          return;
        }
        await reemplazarBeneficiarioProyecto(token, proyectoId, reemplazoId, {
          nombres: nombresNuevo.trim(),
          numeroDocumento: documentoNuevo.trim(),
          tipoDocumento: tipoDocumentoNuevo,
          nota: notaReemplazo.trim() || undefined,
        });
      }
      setReemplazoId(null);
      setNuevoBeneficiarioId("");
      setNombresNuevo("");
      setDocumentoNuevo("");
      setNotaReemplazo("");
      setExito("Reemplazo registrado. El historial del cupo se conserva.");
      await onActualizar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reemplazar");
    } finally {
      setEnviando(false);
    }
  }

  async function abrirHistorial(beneficiarioId: string) {
    setHistorialId(beneficiarioId);
    setHistorial(null);
    setCargandoHistorial(true);
    try {
      const data = await historialBeneficiarioProyecto(
        token,
        proyectoId,
        beneficiarioId,
      );
      setHistorial(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar el historial",
      );
      setHistorialId(null);
    } finally {
      setCargandoHistorial(false);
    }
  }

  const beneficiarioAReemplazar = proyecto.beneficiarios?.find(
    (b) => b.id === reemplazoId,
  );
  const opcionesReemplazo = opcionesBeneficiarios.filter(
    (b) => b.id !== reemplazoId,
  );

  if (!puedeGestionar) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <h3 className="font-semibold text-zinc-900">Equipo interno</h3>
          {proyecto.personal?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {proyecto.personal.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
                >
                  {p.nombreCompleto}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Sin personal asignado</p>
          )}
        </section>
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
          <h3 className="font-semibold text-zinc-900">Beneficiarios</h3>
          {proyecto.beneficiarios?.length ? (
            <ul className="mt-3 space-y-2">
              {proyecto.beneficiarios.map((b) => (
                <li key={b.id} className="text-sm text-zinc-700">
                  {etiquetaBeneficiario(b)}
                  {b.reemplazaA ? (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Reemplazo de {b.reemplazaA.nombres}{" "}
                      {b.reemplazaA.apellidos}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Sin beneficiarios</p>
          )}
          <h3 className="mt-5 font-semibold text-zinc-900">Asociaciones</h3>
          {proyecto.asociaciones?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-zinc-700">
              {proyecto.asociaciones.map((a) => (
                <li key={a.id}>{a.nombre}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Sin asociaciones</p>
          )}
          <p className="mt-4 text-sm text-zinc-600">Veredas asignadas</p>
          {proyecto.veredas?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {proyecto.veredas.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex rounded-full border border-ruralia-teal-border bg-ruralia-teal-soft/50 px-3 py-1 text-sm text-zinc-800"
                >
                  {v.nombre}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Sin veredas asignadas</p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <Alerta mensaje={error} /> : null}
      {exito ? <Alerta mensaje={exito} tipo="exito" /> : null}

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Equipo interno</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Personas de la organización que ejecutan el proyecto.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("personal")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorCatalogo
          multiple
          opciones={opcionesUsuarios}
          value={usuarioIds}
          onChange={setUsuarioIds}
          placeholder="Buscar persona del equipo…"
          mensajeVacio="Aún no hay personas asignadas. Haz clic para ver la lista."
        />
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Beneficiarios</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Puedes vincular varios, junto con asociaciones. En cada jornada se
              elige a quién se atiende.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("beneficiarios")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorCatalogo
          multiple
          opciones={opcionesBeneficiarios}
          value={beneficiarioIds}
          onChange={setBeneficiarioIds}
          placeholder="Buscar beneficiarios de la base de datos…"
          mensajeVacio="Selecciona uno o más, o súbelos por Excel."
        />
        <div className="mt-4">
          <CargaExcelBeneficiarios
            token={token}
            archivo={archivoExcel}
            onArchivo={setArchivoExcel}
            disabled={enviando || importando}
            importando={importando}
            onImportar={importarExcel}
          />
        </div>
        {resultadoCarga ? (
          <p className="mt-3 text-xs text-zinc-500">
            Última carga: {resultadoCarga.totalFilas} filas ·{" "}
            {resultadoCarga.creados} altas nuevas ·{" "}
            {resultadoCarga.asignadosExistentes} reutilizadas de la BD
            {resultadoCarga.errores
              ? ` · ${resultadoCarga.errores} errores`
              : ""}
          </p>
        ) : null}

        {(proyecto.beneficiarios?.length ?? 0) > 0 ? (
          <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
            {proyecto.beneficiarios!.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-800">
                    {etiquetaBeneficiario(b)}
                  </p>
                  {b.reemplazaA ? (
                    <p className="text-xs text-amber-800">
                      Entra como reemplazo de {b.reemplazaA.nombres}{" "}
                      {b.reemplazaA.apellidos}
                      {b.reemplazaA.numeroDocumento
                        ? ` (${b.reemplazaA.numeroDocumento})`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void abrirHistorial(b.id)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft"
                  >
                    Historial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReemplazoId(b.id);
                      setModoReemplazo("nuevo");
                      setNuevoBeneficiarioId("");
                      setNombresNuevo("");
                      setDocumentoNuevo("");
                      setNotaReemplazo("");
                    }}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                  >
                    Reemplazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {(proyecto.beneficiariosReemplazados?.length ?? 0) > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Cupos reemplazados (historial)
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-500">
              {proyecto.beneficiariosReemplazados!.map((b) => (
                <li key={b.id}>
                  {etiquetaBeneficiario(b)}
                  {b.reemplazadoPor
                    ? ` → sustituido por ${b.reemplazadoPor.nombres} ${b.reemplazadoPor.apellidos}`
                    : ""}
                  <button
                    type="button"
                    onClick={() => void abrirHistorial(b.id)}
                    className="ml-2 text-xs font-semibold text-ruralia-teal-text"
                  >
                    Ver
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Asociaciones</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Independiente de los beneficiarios: un proyecto puede tener ambos,
              y varios de cada uno.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("asociaciones")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorCatalogo
          multiple
          opciones={opcionesAsociaciones}
          value={asociacionIds}
          onChange={setAsociacionIds}
          placeholder="Buscar asociaciones…"
          mensajeVacio="Puedes dejarlo vacío si el proyecto solo tiene beneficiarios."
        />
      </section>

      <section className="rounded-2xl border border-ruralia-teal-border bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900">Territorio (veredas)</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Asocia veredas del catálogo DANE o desde Google Maps.
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("territorio")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
        <SelectorVeredasMultiple
          token={token}
          value={veredaIds}
          onChange={setVeredaIds}
          veredasIniciales={proyecto.veredas}
        />
      </section>

      <Modal
        abierto={!!reemplazoId}
        onCerrar={() => setReemplazoId(null)}
        titulo="Reemplazar beneficiario"
      >
        {beneficiarioAReemplazar ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              {etiquetaBeneficiario(beneficiarioAReemplazar)} sale del cupo. La
              persona nueva hereda las jornadas ya hechas; quedan marcadas como
              historial de reemplazo, no como un proceso nuevo.
            </p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoReemplazo === "nuevo"}
                  onChange={() => setModoReemplazo("nuevo")}
                />
                Registrar persona nueva
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={modoReemplazo === "existente"}
                  onChange={() => setModoReemplazo("existente")}
                />
                Ya está en la base de datos
              </label>
            </div>
            {modoReemplazo === "nuevo" ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Nombre completo *
                  </label>
                  <input
                    value={nombresNuevo}
                    onChange={(e) => setNombresNuevo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Tipo de documento
                    </label>
                    <select
                      value={tipoDocumentoNuevo}
                      onChange={(e) =>
                        setTipoDocumentoNuevo(e.target.value as TipoDocumento)
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <option value="CC">Cédula</option>
                      <option value="CE">Cédula extranjería</option>
                      <option value="TI">Tarjeta de identidad</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Identificador único *
                    </label>
                    <input
                      value={documentoNuevo}
                      onChange={(e) => setDocumentoNuevo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <SelectorCatalogo
                opciones={opcionesReemplazo}
                value={nuevoBeneficiarioId}
                onChange={setNuevoBeneficiarioId}
                placeholder="Buscar a quien entra…"
                mensajeVacio="Elige a la persona de reemplazo."
              />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Motivo (opcional)
              </label>
              <textarea
                rows={2}
                value={notaReemplazo}
                onChange={(e) => setNotaReemplazo(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReemplazoId(null)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => void confirmarReemplazo()}
                className="rounded-lg bg-ruralia-teal px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Confirmar reemplazo
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        abierto={!!historialId}
        onCerrar={() => {
          setHistorialId(null);
          setHistorial(null);
        }}
        titulo="Historial del cupo"
        ancho="lg"
      >
        {cargandoHistorial ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : historial ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              Titular actual:{" "}
              <strong>{etiquetaBeneficiario(historial.beneficiario)}</strong>
            </p>
            {historial.reemplazaA ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Esta persona no inició el proceso: entra como reemplazo de{" "}
                {etiquetaBeneficiario(historial.reemplazaA)}.
                {historial.notaReemplazo
                  ? ` Motivo: ${historial.notaReemplazo}`
                  : ""}
              </p>
            ) : null}
            {historial.cadenaReemplazos.length > 1 ? (
              <ol className="space-y-1 text-sm">
                {historial.cadenaReemplazos.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">{i + 1}.</span>
                    {etiquetaBeneficiario(p)}
                    {i < historial.cadenaReemplazos.length - 1 ? (
                      <span className="text-xs text-amber-700">
                        → reemplazado
                      </span>
                    ) : (
                      <span className="text-xs text-ruralia-teal-text">
                        titular
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-800">
                Jornadas del cupo
              </p>
              {historial.jornadas.length ? (
                <ul className="space-y-2">
                  {historial.jornadas.map((j) => (
                    <li
                      key={j.id}
                      className="rounded-xl border border-zinc-100 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {j.nombre?.trim() ||
                            new Date(j.fecha).toLocaleDateString("es-CO")}
                        </span>
                        <span className="text-zinc-400">{j.estado}</span>
                        {j.esHeredada ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Heredada
                            {j.beneficiarioEnRegistro
                              ? ` · ${j.beneficiarioEnRegistro.nombres} ${j.beneficiarioEnRegistro.apellidos}`
                              : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-xs font-medium text-ruralia-teal-text">
                            De esta persona
                          </span>
                        )}
                      </div>
                      {j.vereda ? (
                        <p className="text-xs text-zinc-500">{j.vereda}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">
                  Aún no hay jornadas en este cupo.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
