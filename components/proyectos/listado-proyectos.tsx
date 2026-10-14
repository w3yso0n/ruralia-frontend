"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  Flag,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { Alerta, Spinner } from "@/components/ui/modal";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { TarjetaProyecto } from "@/components/proyectos/tarjeta-proyecto";
import {
  listarAsociaciones,
  listarProyectos,
  listarUsuarios,
  listarVeredas,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import type { EstadoProyecto, OrdenProyecto, Proyecto } from "@/lib/types";
import { etiquetaOrganizacion } from "@/lib/types";

const OPCIONES_ESTADO: { id: EstadoProyecto; nombre: string }[] = [
  { id: "BORRADOR", nombre: "Borrador" },
  { id: "ACTIVO", nombre: "Activo" },
  { id: "SUSPENDIDO", nombre: "Suspendido" },
  { id: "COMPLETADO", nombre: "Completado" },
];

const OPCIONES_ORDEN: { id: OrdenProyecto; nombre: string }[] = [
  { id: "creado_desc", nombre: "Más recientes" },
  { id: "creado_asc", nombre: "Más antiguos" },
  { id: "nombre_asc", nombre: "Nombre A-Z" },
  { id: "nombre_desc", nombre: "Nombre Z-A" },
];

export function ListadoProyectos() {
  const { token } = useAuth();
  const { puede, soloJornadasAsignadas } = usePermisos();
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

  const puedeGestionar = puede("proyectos.crear");

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
      setError(
        err instanceof Error ? err.message : "Error al cargar proyectos",
      );
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
    if (!token || soloJornadasAsignadas) return;
    void Promise.all([
      listarUsuarios(token, { limite: 100, estaActivo: true }).catch(
        () => null,
      ),
      listarAsociaciones(token, { limite: 100 }).catch(() => null),
      listarVeredas(token, { limite: 100 }).catch(() => null),
    ]).then(([usuarios, asociaciones, veredas]) => {
      if (usuarios) {
        setOpcionesPersonal(
          usuarios.datos.map((u) => ({ id: u.id, nombre: u.nombreCompleto })),
        );
      }
      if (asociaciones) {
        setOpcionesAsociaciones(
          asociaciones.datos.map((a) => ({
            id: a.id,
            nombre: etiquetaOrganizacion(a),
          })),
        );
      }
      if (veredas) {
        setOpcionesVeredas(
          veredas.datos.map((v) => ({ id: v.id, nombre: v.nombre })),
        );
      }
    });
  }, [token, soloJornadasAsignadas]);

  const totalPaginas = Math.ceil(total / limite) || 1;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Proyectos</h2>
          <p className="mt-1 text-zinc-600">
            {soloJornadasAsignadas
              ? "Proyectos donde tienes jornadas asignadas"
              : "Explora y gestiona los proyectos rurales"}
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ruralia-teal" />
          <input
            type="search"
            placeholder="Buscar proyecto..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
          />
        </div>
        <SelectorDesplegable
          value={filtroEstado}
          onChange={(id) => {
            setFiltroEstado(id as EstadoProyecto | "");
            setPagina(1);
          }}
          opciones={OPCIONES_ESTADO}
          permitirVacio
          placeholder="Todos los estados"
          etiquetaVacio="Todos los estados"
          icono={Flag}
        />
        {soloJornadasAsignadas ? null : (
          <>
            <SelectorDesplegable
              value={personalId}
              onChange={(id) => {
                setPersonalId(id);
                setPagina(1);
              }}
              opciones={opcionesPersonal}
              permitirVacio
              placeholder="Todo el personal"
              etiquetaVacio="Todo el personal"
              icono={Users}
            />
            <SelectorDesplegable
              value={asociacionId}
              onChange={(id) => {
                setAsociacionId(id);
                setPagina(1);
              }}
              opciones={opcionesAsociaciones}
              permitirVacio
              placeholder="Todas las asociaciones"
              etiquetaVacio="Todas las asociaciones"
              icono={Building2}
            />
            <SelectorDesplegable
              value={veredaId}
              onChange={(id) => {
                setVeredaId(id);
                setPagina(1);
              }}
              opciones={opcionesVeredas}
              permitirVacio
              placeholder="Todas las veredas"
              etiquetaVacio="Todas las veredas"
              icono={MapPin}
            />
            <SelectorDesplegable
              value={orden}
              onChange={(id) => setOrden(id as OrdenProyecto)}
              opciones={OPCIONES_ORDEN}
              icono={ArrowUpDown}
            />
          </>
        )}
      </div>

      {cargando ? (
        <Spinner />
      ) : proyectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white p-12 text-center">
          <p className="text-zinc-600">
            {soloJornadasAsignadas
              ? "Aún no tienes jornadas asignadas en ningún proyecto"
              : "No se encontraron proyectos"}
          </p>
          {puedeGestionar ? (
            <Link
              href="/proyectos/nuevo"
              className="mt-4 inline-flex rounded-xl bg-ruralia-teal-soft px-4 py-2 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white"
            >
              Crear el primer proyecto
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((proyecto) => (
            <TarjetaProyecto
              key={proyecto.id}
              proyecto={proyecto}
              vistaLimitada={soloJornadasAsignadas}
            />
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
