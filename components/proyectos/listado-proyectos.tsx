"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { TarjetaProyecto } from "@/components/proyectos/tarjeta-proyecto";
import {
  listarAsociaciones,
  listarProyectos,
  listarUsuarios,
  listarVeredas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type {
  EstadoProyecto,
  OrdenProyecto,
  Proyecto,
} from "@/lib/types";

export function ListadoProyectos() {
  const { token, usuario } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoProyecto | "">("");
  const [personalId, setPersonalId] = useState("");
  const [asociacionId, setAsociacionId] = useState("");
  const [veredaId, setVeredaId] = useState("");
  const [orden, setOrden] = useState<OrdenProyecto>("creado_desc");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opcionesPersonal, setOpcionesPersonal] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesAsociaciones, setOpcionesAsociaciones] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesVeredas, setOpcionesVeredas] = useState<
    { id: string; nombre: string }[]
  >([]);

  const puedeGestionar = usuario?.roles.some((rol) =>
    ["ADMINISTRADOR", "COORDINADOR"].includes(rol.nombre),
  );

  const limite = 12;

  const cargar = useCallback(async () => {
    if (!token) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await listarProyectos(token, {
        pagina,
        limite,
        estado: filtroEstado || undefined,
        busqueda: busqueda || undefined,
        personalId: personalId || undefined,
        asociacionId: asociacionId || undefined,
        veredaId: veredaId || undefined,
        orden,
      });
      setProyectos(respuesta.datos);
      setTotal(respuesta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar proyectos");
    } finally {
      setCargando(false);
    }
  }, [
    token,
    pagina,
    busqueda,
    filtroEstado,
    personalId,
    asociacionId,
    veredaId,
    orden,
  ]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      listarUsuarios(token, { limite: 100, estaActivo: true }),
      listarAsociaciones(token, { limite: 100 }),
      listarVeredas(token, { limite: 100 }),
    ]).then(([usuarios, asociaciones, veredas]) => {
      setOpcionesPersonal(
        usuarios.datos.map((u) => ({ id: u.id, nombre: u.nombreCompleto })),
      );
      setOpcionesAsociaciones(
        asociaciones.datos.map((a) => ({ id: a.id, nombre: a.nombre })),
      );
      setOpcionesVeredas(
        veredas.datos.map((v) => ({ id: v.id, nombre: v.nombre })),
      );
    });
  }, [token]);

  const totalPaginas = Math.ceil(total / limite) || 1;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Proyectos</h2>
          <p className="mt-1 text-zinc-600">
            Explora y gestiona los proyectos rurales
          </p>
        </div>
        {puedeGestionar ? (
          <Link
            href="/proyectos/nuevo"
            className="rounded-xl bg-ruralia-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ruralia-teal-hover"
          >
            + Nuevo proyecto
          </Link>
        ) : null}
      </div>

      {error ? <Alerta mensaje={error} /> : null}

      <div className="mb-6 grid gap-3 lg:grid-cols-6">
        <input
          type="search"
          placeholder="Buscar..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(1);
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-ruralia-teal lg:col-span-2"
        />
        <select
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value as EstadoProyecto | "");
            setPagina(1);
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ACTIVO">Activo</option>
          <option value="SUSPENDIDO">Suspendido</option>
          <option value="COMPLETADO">Completado</option>
        </select>
        <select
          value={personalId}
          onChange={(e) => {
            setPersonalId(e.target.value);
            setPagina(1);
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        >
          <option value="">Todo el personal</option>
          {opcionesPersonal.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select
          value={asociacionId}
          onChange={(e) => {
            setAsociacionId(e.target.value);
            setPagina(1);
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        >
          <option value="">Todas las asociaciones</option>
          {opcionesAsociaciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as OrdenProyecto)}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
        >
          <option value="creado_desc">Más recientes</option>
          <option value="creado_asc">Más antiguos</option>
          <option value="nombre_asc">Nombre A-Z</option>
          <option value="nombre_desc">Nombre Z-A</option>
        </select>
        <select
          value={veredaId}
          onChange={(e) => {
            setVeredaId(e.target.value);
            setPagina(1);
          }}
          className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm lg:col-span-2"
        >
          <option value="">Todas las veredas</option>
          {opcionesVeredas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>
      </div>

      {cargando ? (
        <Spinner />
      ) : proyectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white p-12 text-center">
          <p className="text-zinc-600">No se encontraron proyectos</p>
          {puedeGestionar ? (
            <Link
              href="/proyectos/nuevo"
              className="mt-4 inline-block text-sm font-semibold text-ruralia-teal-text hover:underline"
            >
              Crear el primer proyecto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((proyecto) => (
            <TarjetaProyecto key={proyecto.id} proyecto={proyecto} />
          ))}
        </div>
      )}

      {totalPaginas > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-zinc-600">
          <span>
            Página {pagina} de {totalPaginas} ({total} proyectos)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
