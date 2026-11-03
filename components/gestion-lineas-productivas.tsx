"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Combine,
  Pencil,
  Search,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import { Alerta, Modal } from "@/components/ui/modal";
import {
  eliminarLineaProductiva,
  obtenerAdministracionLineas,
  renombrarLineaProductiva,
  unificarLineasProductivas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { claveLineaProductiva, textoBeneficiarios } from "@/lib/lineas-productivas";
import { confirmarEliminacionSimple } from "@/lib/swal";
import type {
  AdministracionLineasProductivas,
  LineaProductivaAdministracion,
} from "@/lib/types";

function textoSubactividades(total: number): string {
  return `${total.toLocaleString("es-CO")} ${total === 1 ? "subactividad" : "subactividades"}`;
}

/**
 * Catálogo de líneas productivas: renombrar, unificar duplicados y eliminar
 * líneas sin uso. Solo se muestra con el permiso lineas_productivas.administrar.
 */
export function GestionLineasProductivas() {
  const { token } = useAuth();
  const [datos, setDatos] = useState<AdministracionLineasProductivas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [unificando, setUnificando] = useState<string[] | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      setDatos(await obtenerAdministracionLineas(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo");
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    obtenerAdministracionLineas(token)
      .then((respuesta) => {
        if (!cancelado) setDatos(respuesta);
      })
      .catch((err: unknown) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el catálogo",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  const porId = useMemo(
    () => new Map((datos?.lineas ?? []).map((l) => [l.id, l])),
    [datos],
  );

  const visibles = useMemo(() => {
    const clave = claveLineaProductiva(busqueda);
    const lineas = datos?.lineas ?? [];
    return clave
      ? lineas.filter((l) => claveLineaProductiva(l.nombre).includes(clave))
      : lineas;
  }, [datos, busqueda]);

  const grupos = useMemo(
    () =>
      (datos?.posiblesDuplicados ?? [])
        .map((ids) =>
          ids
            .map((id) => porId.get(id))
            .filter((l): l is LineaProductivaAdministracion => !!l),
        )
        .filter((g) => g.length > 1),
    [datos, porId],
  );

  function alternar(id: string) {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  async function guardarNombre(linea: LineaProductivaAdministracion) {
    if (!token) return;
    const nombre = nombreEdicion.trim();
    if (!nombre || nombre === linea.nombre) {
      setEditandoId(null);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await renombrarLineaProductiva(token, linea.id, nombre);
      setEditandoId(null);
      setAviso(
        linea.beneficiarios > 0
          ? `«${linea.nombre}» ahora se llama «${nombre}» en sus ${textoBeneficiarios(linea.beneficiarios)}.`
          : `«${linea.nombre}» ahora se llama «${nombre}».`,
      );
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renombrar");
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(linea: LineaProductivaAdministracion) {
    if (!token) return;
    const confirmado = await confirmarEliminacionSimple({
      titulo: "Eliminar línea productiva",
      texto: `«${linea.nombre}» dejará de aparecer en los selectores. Ningún beneficiario ni subactividad la usa.`,
      textoConfirmar: "Sí, eliminar",
    });
    if (!confirmado) return;
    setEnviando(true);
    setError(null);
    try {
      await eliminarLineaProductiva(token, linea.id);
      setSeleccion((prev) => {
        const siguiente = new Set(prev);
        siguiente.delete(linea.id);
        return siguiente;
      });
      setAviso(`Se eliminó «${linea.nombre}».`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setEnviando(false);
    }
  }

  const totalConLinea = (datos?.lineas ?? []).reduce(
    (suma, l) => suma + l.beneficiarios,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600">
            Las líneas se crean al cargar el Excel, al editar un beneficiario o
            al asignarlas a una subactividad. Aquí corriges nombres y juntas
            duplicados.
          </p>
          {datos ? (
            <p className="mt-1 text-xs text-zinc-500">
              {datos.lineas.length.toLocaleString("es-CO")}{" "}
              {datos.lineas.length === 1 ? "línea" : "líneas"} ·{" "}
              {textoBeneficiarios(totalConLinea)} con línea asignada
            </p>
          ) : null}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar línea..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
          />
        </div>
      </div>

      {error ? <Alerta mensaje={error} /> : null}
      {aviso ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft px-4 py-3 text-sm text-ruralia-teal-text">
          <span className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-ruralia-teal" />
            {aviso}
          </span>
          <button
            type="button"
            onClick={() => setAviso(null)}
            aria-label="Cerrar aviso"
            className="rounded-lg p-0.5 text-ruralia-teal-muted hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {grupos.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {grupos.length === 1
                  ? "1 grupo de nombres parecidos"
                  : `${grupos.length} grupos de nombres parecidos`}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                Pueden ser la misma línea escrita distinto. Revisa y unifica si
                corresponde.
              </p>
              <ul className="mt-3 space-y-2">
                {grupos.map((grupo) => (
                  <li
                    key={grupo.map((l) => l.id).join("-")}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2"
                  >
                    <span className="flex min-w-0 flex-wrap gap-1.5">
                      {grupo.map((l) => (
                        <span
                          key={l.id}
                          className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                        >
                          {l.nombre}{" "}
                          <span className="tabular-nums text-zinc-500">
                            · {l.beneficiarios}
                          </span>
                        </span>
                      ))}
                    </span>
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => setUnificando(grupo.map((l) => l.id))}
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
                    >
                      Unificar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-ruralia-teal-border bg-white">
        {seleccion.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ruralia-teal-border bg-ruralia-teal-soft/50 px-4 py-2.5">
            <p className="text-sm text-zinc-700">
              {seleccion.size === 1
                ? "1 línea seleccionada. Elige otra para unificarlas."
                : `${seleccion.size} líneas seleccionadas`}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSeleccion(new Set())}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-zinc-600 hover:bg-white"
              >
                Limpiar
              </button>
              <button
                type="button"
                disabled={seleccion.size < 2 || enviando}
                onClick={() => setUnificando([...seleccion])}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
              >
                <Combine className="h-4 w-4" />
                Unificar
              </button>
            </div>
          </div>
        ) : null}

        {cargando && !datos ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Cargando...</p>
        ) : visibles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Sprout className="h-6 w-6 text-ruralia-teal-muted" />
            <p className="text-sm text-zinc-500">
              {busqueda
                ? "Ninguna línea coincide con la búsqueda."
                : "Aún no hay líneas productivas. Aparecen al cargar beneficiarios con esa columna."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visibles.map((linea) => {
              const enUso = linea.beneficiarios > 0 || linea.subactividades > 0;
              const elegida = seleccion.has(linea.id);
              const editando = editandoId === linea.id;
              return (
                <li
                  key={linea.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 transition ${
                    elegida ? "bg-ruralia-teal-soft/40" : "hover:bg-zinc-50/60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={elegida}
                    onChange={() => alternar(linea.id)}
                    aria-label={`Seleccionar ${linea.nombre}`}
                    className="h-4 w-4 rounded border-zinc-300 text-ruralia-teal focus:ring-ruralia-teal/30"
                  />
                  <div className="min-w-0 flex-1">
                    {editando ? (
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void guardarNombre(linea);
                        }}
                      >
                        <input
                          autoFocus
                          value={nombreEdicion}
                          onChange={(e) => setNombreEdicion(e.target.value)}
                          maxLength={120}
                          className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                        />
                        <button
                          type="submit"
                          disabled={enviando}
                          className="rounded-lg bg-ruralia-teal px-3 py-1.5 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoId(null)}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {linea.nombre}
                        </p>
                        <p className="text-xs tabular-nums text-zinc-500">
                          {textoBeneficiarios(linea.beneficiarios)} ·{" "}
                          {textoSubactividades(linea.subactividades)}
                        </p>
                      </>
                    )}
                  </div>
                  {!editando ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => {
                          setEditandoId(linea.id);
                          setNombreEdicion(linea.nombre);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-ruralia-teal-text hover:bg-ruralia-teal-soft disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Renombrar
                      </button>
                      <button
                        type="button"
                        disabled={enviando || enUso}
                        title={
                          enUso
                            ? "Tiene beneficiarios o subactividades: unifícala con otra en lugar de eliminarla"
                            : undefined
                        }
                        onClick={() => void eliminar(linea)}
                        aria-label={`Eliminar ${linea.nombre}`}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {unificando ? (
        <ModalUnificar
          lineas={unificando
            .map((id) => porId.get(id))
            .filter((l): l is LineaProductivaAdministracion => !!l)}
          enviando={enviando}
          onCerrar={() => setUnificando(null)}
          onConfirmar={async (destinoId, origenIds) => {
            if (!token) return;
            setEnviando(true);
            setError(null);
            try {
              const resultado = await unificarLineasProductivas(
                token,
                destinoId,
                origenIds,
              );
              setUnificando(null);
              setSeleccion(new Set());
              setAviso(
                `Listo: todo quedó como «${resultado.linea.nombre}». Se actualizaron ${textoBeneficiarios(resultado.beneficiariosActualizados)} y ${textoSubactividades(resultado.subactividadesActualizadas)}.`,
              );
              await cargar();
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo unificar");
            } finally {
              setEnviando(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ModalUnificar({
  lineas,
  enviando,
  onCerrar,
  onConfirmar,
}: {
  lineas: LineaProductivaAdministracion[];
  enviando: boolean;
  onCerrar: () => void;
  onConfirmar: (destinoId: string, origenIds: string[]) => void;
}) {
  // Por defecto se conserva la que más beneficiarios tiene.
  const [destinoId, setDestinoId] = useState(
    () =>
      [...lineas].sort((a, b) => b.beneficiarios - a.beneficiarios)[0]?.id ?? "",
  );
  const destino = lineas.find((l) => l.id === destinoId);
  const origenes = lineas.filter((l) => l.id !== destinoId);
  const beneficiarios = origenes.reduce((s, l) => s + l.beneficiarios, 0);
  const subactividades = origenes.reduce((s, l) => s + l.subactividades, 0);
  const nombresOrigen = origenes.map((l) => `«${l.nombre}»`).join(", ");

  return (
    <Modal abierto titulo="Unificar líneas productivas" onCerrar={onCerrar}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">
            ¿Con cuál nombre te quedas?
          </p>
          <ul className="space-y-2">
            {lineas.map((linea) => {
              const activa = linea.id === destinoId;
              return (
                <li key={linea.id}>
                  <button
                    type="button"
                    onClick={() => setDestinoId(linea.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                      activa
                        ? "border-ruralia-teal bg-ruralia-teal-soft"
                        : "border-zinc-200 bg-white hover:border-ruralia-teal-border"
                    }`}
                  >
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-sm font-semibold ${
                          activa ? "text-ruralia-teal-text" : "text-zinc-900"
                        }`}
                      >
                        {linea.nombre}
                      </span>
                      <span className="block text-xs tabular-nums text-zinc-500">
                        {textoBeneficiarios(linea.beneficiarios)} ·{" "}
                        {textoSubactividades(linea.subactividades)}
                      </span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        activa
                          ? "border-ruralia-teal bg-ruralia-teal text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {activa ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {destino ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Se actualizarán <strong>{textoBeneficiarios(beneficiarios)}</strong>
            {subactividades > 0 ? (
              <>
                {" "}
                y <strong>{textoSubactividades(subactividades)}</strong>
              </>
            ) : null}{" "}
            que hoy tienen {nombresOrigen}: todos quedarán con «{destino.nombre}».{" "}
            {origenes.length === 1 ? "Esa línea deja" : "Esas líneas dejan"} de
            existir. No se puede deshacer.
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando || !destino || origenes.length === 0}
            onClick={() =>
              onConfirmar(
                destinoId,
                origenes.map((l) => l.id),
              )
            }
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            {enviando ? "Unificando..." : `Unificar en «${destino?.nombre ?? ""}»`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
