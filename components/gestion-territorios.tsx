"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Alerta, Modal, Spinner } from "@/components/ui/modal";
import {
  actualizarDepartamento,
  actualizarMunicipio,
  actualizarRegion,
  actualizarVeredaAdmin,
  buscarTerritorios,
  crearDepartamento,
  crearMunicipio,
  crearRegion,
  crearVeredaAdmin,
  desactivarDepartamento,
  desactivarMunicipio,
  desactivarRegion,
  desactivarVeredaAdmin,
  listarDepartamentos,
  listarMunicipios,
  listarRegiones,
  listarVeredasPorMunicipio,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { usePermisos } from "@/lib/use-permisos";
import {
  btnAccionPeligro,
  btnAccionPrimaria,
  btnAccionSecundaria,
} from "@/lib/estilos-boton";
import type {
  NivelTerritorial,
  NodoTerritorial,
  ResultadoBusquedaTerritorial,
} from "@/lib/types";

type Nivel = NivelTerritorial;

const ETIQUETAS: Record<Nivel, { singular: string; plural: string }> = {
  region: { singular: "Región", plural: "Regiones" },
  departamento: { singular: "Departamento", plural: "Departamentos" },
  municipio: { singular: "Municipio", plural: "Municipios" },
  vereda: { singular: "Vereda", plural: "Veredas" },
};

interface FormularioNodo {
  nombre: string;
  codigo: string;
  estaActivo: boolean;
}

const FORM_VACIO: FormularioNodo = {
  nombre: "",
  codigo: "",
  estaActivo: true,
};

export function GestionTerritorios() {
  const { token } = useAuth();
  const { puede } = usePermisos();

  const puedeCrear = puede("territorios.crear");
  const puedeEditar = puede("territorios.editar");
  const puedeEliminar = puede("territorios.eliminar");

  const [regiones, setRegiones] = useState<NodoTerritorial[]>([]);
  const [departamentos, setDepartamentos] = useState<NodoTerritorial[]>([]);
  const [municipios, setMunicipios] = useState<NodoTerritorial[]>([]);
  const [veredas, setVeredas] = useState<NodoTerritorial[]>([]);

  const [regionId, setRegionId] = useState<string | null>(null);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [munId, setMunId] = useState<string | null>(null);
  const [veredaDestacadaId, setVeredaDestacadaId] = useState<string | null>(
    null,
  );

  const [cargandoReg, setCargandoReg] = useState(true);
  const [cargandoDept, setCargandoDept] = useState(false);
  const [cargandoMun, setCargandoMun] = useState(false);
  const [cargandoVer, setCargandoVer] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const [modalNivel, setModalNivel] = useState<Nivel | null>(null);
  const [editando, setEditando] = useState<NodoTerritorial | null>(null);
  const [formulario, setFormulario] = useState<FormularioNodo>(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState<{
    nivel: Nivel;
    nodo: NodoTerritorial;
  } | null>(null);

  const cargarRegiones = useCallback(async () => {
    if (!token) return;
    setCargandoReg(true);
    setError(null);
    try {
      setRegiones(await listarRegiones(token, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar regiones");
    } finally {
      setCargandoReg(false);
    }
  }, [token]);

  useEffect(() => {
    void cargarRegiones();
  }, [cargarRegiones]);

  useEffect(() => {
    if (!token || !regionId) {
      setDepartamentos([]);
      return;
    }
    let cancelado = false;
    setCargandoDept(true);
    void listarDepartamentos(token, { regionId, incluirInactivos: true })
      .then((datos) => {
        if (!cancelado) setDepartamentos(datos);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar departamentos",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoDept(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, regionId]);

  useEffect(() => {
    if (!token || !deptId) {
      setMunicipios([]);
      return;
    }
    let cancelado = false;
    setCargandoMun(true);
    void listarMunicipios(token, deptId, true)
      .then((datos) => {
        if (!cancelado) setMunicipios(datos);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(
            err instanceof Error ? err.message : "Error al cargar municipios",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoMun(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, deptId]);

  useEffect(() => {
    if (!token || !munId) {
      setVeredas([]);
      return;
    }
    let cancelado = false;
    setCargandoVer(true);
    void listarVeredasPorMunicipio(token, munId, true)
      .then((datos) => {
        if (!cancelado) setVeredas(datos);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "Error al cargar veredas");
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoVer(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token, munId]);

  useEffect(() => {
    if (!veredaDestacadaId || veredas.length === 0) return;
    const elemento = document.getElementById(
      `territorio-item-${veredaDestacadaId}`,
    );
    elemento?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [veredaDestacadaId, veredas]);

  function seleccionarRegion(id: string) {
    setRegionId(id);
    setDeptId(null);
    setMunId(null);
    setVeredaDestacadaId(null);
    setMunicipios([]);
    setVeredas([]);
  }

  function seleccionarDepartamento(id: string) {
    setDeptId(id);
    setMunId(null);
    setVeredaDestacadaId(null);
    setVeredas([]);
  }

  function seleccionarMunicipio(id: string) {
    setMunId(id);
    setVeredaDestacadaId(null);
  }

  function aplicarResultadoBusqueda(resultado: ResultadoBusquedaTerritorial) {
    setError(null);
    setVeredaDestacadaId(null);

    if (resultado.nivel === "region") {
      seleccionarRegion(resultado.id);
      return;
    }

    if (resultado.nivel === "departamento") {
      if (resultado.regionId) setRegionId(resultado.regionId);
      setDeptId(resultado.id);
      setMunId(null);
      setMunicipios([]);
      setVeredas([]);
      return;
    }

    if (resultado.nivel === "municipio") {
      if (resultado.regionId) setRegionId(resultado.regionId);
      if (resultado.departamentoId) setDeptId(resultado.departamentoId);
      setMunId(resultado.id);
      setVeredas([]);
      return;
    }

    if (resultado.regionId) setRegionId(resultado.regionId);
    if (resultado.departamentoId) setDeptId(resultado.departamentoId);
    if (resultado.municipioId) setMunId(resultado.municipioId);
    if (resultado.veredaId) setVeredaDestacadaId(resultado.veredaId);
  }

  function abrirCrear(nivel: Nivel) {
    if (nivel === "departamento" && !regionId) return;
    if (nivel === "municipio" && !deptId) return;
    if (nivel === "vereda" && !munId) return;
    setEditando(null);
    setFormulario(FORM_VACIO);
    setModalNivel(nivel);
  }

  function abrirEditar(nivel: Nivel, nodo: NodoTerritorial) {
    setEditando(nodo);
    setFormulario({
      nombre: nodo.nombre,
      codigo: nodo.codigo,
      estaActivo: nodo.estaActivo,
    });
    setModalNivel(nivel);
  }

  function cerrarModal() {
    setModalNivel(null);
    setEditando(null);
    setFormulario(FORM_VACIO);
  }

  async function refrescarNivel(nivel: Nivel) {
    if (!token) return;
    if (nivel === "region") {
      await cargarRegiones();
      return;
    }
    if (nivel === "departamento" && regionId) {
      setDepartamentos(
        await listarDepartamentos(token, { regionId, incluirInactivos: true }),
      );
      return;
    }
    if (nivel === "municipio" && deptId) {
      setMunicipios(await listarMunicipios(token, deptId, true));
      return;
    }
    if (nivel === "vereda" && munId) {
      setVeredas(await listarVeredasPorMunicipio(token, munId, true));
    }
  }

  async function manejarSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    if (!token || !modalNivel) return;
    const nombre = formulario.nombre.trim();
    if (!nombre) {
      setError("El nombre es obligatorio");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const codigo = formulario.codigo.trim() || undefined;
      if (editando) {
        const payload = {
          nombre,
          codigo,
          estaActivo: formulario.estaActivo,
        };
        if (modalNivel === "region") {
          await actualizarRegion(token, editando.id, payload);
        } else if (modalNivel === "departamento") {
          await actualizarDepartamento(token, editando.id, payload);
        } else if (modalNivel === "municipio") {
          await actualizarMunicipio(token, editando.id, payload);
        } else {
          await actualizarVeredaAdmin(token, editando.id, payload);
        }
        setExito(`${ETIQUETAS[modalNivel].singular} actualizado`);
      } else {
        const base = { nombre, codigo };
        if (modalNivel === "region") {
          await crearRegion(token, base);
        } else if (modalNivel === "departamento" && regionId) {
          await crearDepartamento(token, { ...base, regionId });
        } else if (modalNivel === "municipio" && deptId) {
          await crearMunicipio(token, { ...base, departamentoId: deptId });
        } else if (modalNivel === "vereda" && munId) {
          await crearVeredaAdmin(token, { ...base, municipioId: munId });
        }
        setExito(`${ETIQUETAS[modalNivel].singular} creado`);
      }
      cerrarModal();
      await refrescarNivel(modalNivel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  async function manejarDesactivar() {
    if (!token || !confirmar) return;
    setEnviando(true);
    setError(null);
    try {
      const { nivel, nodo } = confirmar;
      if (nivel === "region") {
        await desactivarRegion(token, nodo.id);
        if (regionId === nodo.id) {
          setRegionId(null);
          setDeptId(null);
          setMunId(null);
        }
      } else if (nivel === "departamento") {
        await desactivarDepartamento(token, nodo.id);
        if (deptId === nodo.id) {
          setDeptId(null);
          setMunId(null);
        }
      } else if (nivel === "municipio") {
        await desactivarMunicipio(token, nodo.id);
        if (munId === nodo.id) setMunId(null);
      } else {
        await desactivarVeredaAdmin(token, nodo.id);
      }
      setExito(`${ETIQUETAS[nivel].singular} desactivado`);
      setConfirmar(null);
      await refrescarNivel(nivel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desactivar");
    } finally {
      setEnviando(false);
    }
  }

  if (!puede("territorios.ver")) {
    return (
      <Alerta
        tipo="error"
        mensaje="No tienes permiso para consultar la jerarquía territorial."
      />
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900">Territorios</h2>
        <p className="mt-1 text-zinc-600">
          Catálogo: región → departamento → municipio → vereda (códigos DANE)
        </p>
      </div>

      {token ? (
        <BuscadorTerritorios
          token={token}
          onSeleccionar={aplicarResultadoBusqueda}
        />
      ) : null}

      {error ? <Alerta tipo="error" mensaje={error} /> : null}
      {exito ? <Alerta tipo="exito" mensaje={exito} /> : null}

      <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-2">
        <ColumnaNivel
          titulo={ETIQUETAS.region.plural}
          items={regiones}
          seleccionadoId={regionId}
          cargando={cargandoReg}
          etiquetaSubnivel="departamentos"
          puedeCrear={puedeCrear}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onSeleccionar={seleccionarRegion}
          onCrear={() => abrirCrear("region")}
          onEditar={(n) => abrirEditar("region", n)}
          onDesactivar={(n) => setConfirmar({ nivel: "region", nodo: n })}
        />
        <ColumnaNivel
          titulo={ETIQUETAS.departamento.plural}
          items={departamentos}
          seleccionadoId={deptId}
          cargando={cargandoDept}
          vacioSinPadre={!regionId}
          mensajeSinPadre="Selecciona una región"
          etiquetaSubnivel="municipios"
          puedeCrear={puedeCrear && !!regionId}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onSeleccionar={seleccionarDepartamento}
          onCrear={() => abrirCrear("departamento")}
          onEditar={(n) => abrirEditar("departamento", n)}
          onDesactivar={(n) =>
            setConfirmar({ nivel: "departamento", nodo: n })
          }
        />
        <ColumnaNivel
          titulo={ETIQUETAS.municipio.plural}
          items={municipios}
          seleccionadoId={munId}
          cargando={cargandoMun}
          vacioSinPadre={!deptId}
          mensajeSinPadre="Selecciona un departamento"
          etiquetaSubnivel="veredas"
          puedeCrear={puedeCrear && !!deptId}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onSeleccionar={seleccionarMunicipio}
          onCrear={() => abrirCrear("municipio")}
          onEditar={(n) => abrirEditar("municipio", n)}
          onDesactivar={(n) => setConfirmar({ nivel: "municipio", nodo: n })}
        />
        <ColumnaNivel
          titulo={ETIQUETAS.vereda.plural}
          items={veredas}
          seleccionadoId={veredaDestacadaId}
          cargando={cargandoVer}
          vacioSinPadre={!munId}
          mensajeSinPadre="Selecciona un municipio"
          puedeCrear={puedeCrear && !!munId}
          puedeEditar={puedeEditar}
          puedeEliminar={puedeEliminar}
          onCrear={() => abrirCrear("vereda")}
          onEditar={(n) => abrirEditar("vereda", n)}
          onDesactivar={(n) => setConfirmar({ nivel: "vereda", nodo: n })}
        />
      </div>

      <Modal
        abierto={!!modalNivel}
        onCerrar={cerrarModal}
        titulo={
          modalNivel
            ? editando
              ? `Editar ${ETIQUETAS[modalNivel].singular.toLowerCase()}`
              : `Nuevo ${ETIQUETAS[modalNivel].singular.toLowerCase()}`
            : ""
        }
      >
        <form onSubmit={manejarSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Nombre
            </span>
            <input
              required
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, nombre: e.target.value }))
              }
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Código{" "}
              <span className="font-normal text-zinc-400">
                (opcional; DANE si aplica)
              </span>
            </span>
            <input
              value={formulario.codigo}
              onChange={(e) =>
                setFormulario((f) => ({ ...f, codigo: e.target.value }))
              }
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-ruralia-teal"
            />
          </label>
          {editando ? (
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={formulario.estaActivo}
                onChange={(e) =>
                  setFormulario((f) => ({
                    ...f,
                    estaActivo: e.target.checked,
                  }))
                }
                className="rounded border-zinc-300 text-ruralia-teal focus:ring-ruralia-teal"
              />
              Activo
            </label>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cerrarModal}
              className={btnAccionSecundaria}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className={btnAccionPrimaria}
            >
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        abierto={!!confirmar}
        onCerrar={() => setConfirmar(null)}
        titulo="Desactivar territorio"
      >
        <p className="text-sm text-zinc-600">
          ¿Desactivar{" "}
          <span className="font-semibold text-zinc-900">
            {confirmar?.nodo.nombre}
          </span>
          ? Seguirá en el catálogo como inactivo.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmar(null)}
            className={btnAccionSecundaria}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void manejarDesactivar()}
            className={btnAccionPeligro}
          >
            {enviando ? "Desactivando…" : "Desactivar"}
          </button>
        </div>
      </Modal>
    </>
  );
}

function BuscadorTerritorios({
  token,
  onSeleccionar,
}: {
  token: string;
  onSeleccionar: (resultado: ResultadoBusquedaTerritorial) => void;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusquedaTerritorial[]>(
    [],
  );
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);

  useEffect(() => {
    const termino = consulta.trim();
    if (termino.length < 2) {
      setResultados([]);
      setBuscando(false);
      setErrorBusqueda(null);
      return;
    }

    setBuscando(true);
    setErrorBusqueda(null);
    const timer = window.setTimeout(() => {
      void buscarTerritorios(token, { q: termino, limite: 30 })
        .then((datos) => {
          setResultados(datos);
          setAbierto(true);
        })
        .catch((err) => {
          setResultados([]);
          setErrorBusqueda(
            err instanceof Error ? err.message : "Error al buscar territorios",
          );
        })
        .finally(() => setBuscando(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [consulta, token]);

  useEffect(() => {
    function manejarClickFuera(evento: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClickFuera);
    return () => document.removeEventListener("mousedown", manejarClickFuera);
  }, []);

  function elegir(resultado: ResultadoBusquedaTerritorial) {
    onSeleccionar(resultado);
    setConsulta(resultado.nombre);
    setAbierto(false);
  }

  return (
    <div ref={contenedorRef} className="relative mb-6 max-w-2xl">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-700">
          Buscar territorio
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => {
              if (resultados.length > 0) setAbierto(true);
            }}
            placeholder="Ej. Bogotá departamento, Bogotá municipio, Cundinamarca…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-ruralia-teal"
          />
          {buscando ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
          ) : null}
        </div>
      </label>
      <p className="mt-1.5 text-xs text-zinc-500">
        El resultado indica el nivel (región, departamento, municipio o vereda) y
        selecciona hasta ese punto en las columnas.
      </p>

      {errorBusqueda ? (
        <p className="mt-2 text-sm text-red-600">{errorBusqueda}</p>
      ) : null}

      {abierto && consulta.trim().length >= 2 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          {buscando && resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">
              Sin coincidencias para &quot;{consulta.trim()}&quot;
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {resultados.map((resultado) => (
                <li key={`${resultado.nivel}-${resultado.id}`}>
                  <button
                    type="button"
                    onClick={() => elegir(resultado)}
                    className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-ruralia-teal-soft"
                  >
                    <span className="flex items-center gap-2">
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                        {ETIQUETAS[resultado.nivel].singular}
                      </span>
                      <span className="text-sm font-medium text-zinc-900">
                        {resultado.nombre}
                      </span>
                      {!resultado.estaActivo ? (
                        <span className="text-xs text-zinc-400">inactivo</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-zinc-500">{resultado.ruta}</span>
                    {resultado.codigo ? (
                      <span className="text-xs text-zinc-400">
                        Código: {resultado.codigo}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ColumnaNivel({
  titulo,
  items,
  seleccionadoId,
  cargando,
  vacioSinPadre,
  mensajeSinPadre,
  etiquetaSubnivel,
  puedeCrear,
  puedeEditar,
  puedeEliminar,
  onSeleccionar,
  onCrear,
  onEditar,
  onDesactivar,
}: {
  titulo: string;
  items: NodoTerritorial[];
  seleccionadoId: string | null;
  cargando: boolean;
  vacioSinPadre?: boolean;
  mensajeSinPadre?: string;
  /** Etiqueta del nivel inferior, p. ej. "departamentos" / "municipios". */
  etiquetaSubnivel?: string;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  onSeleccionar?: (id: string) => void;
  onCrear: () => void;
  onEditar: (n: NodoTerritorial) => void;
  onDesactivar: (n: NodoTerritorial) => void;
}) {
  return (
    <section className="flex min-h-[28rem] flex-col rounded-2xl border border-ruralia-teal-border bg-white">
      <header className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{titulo}</h3>
          <p className="text-xs text-zinc-400">{items.length} registros</p>
        </div>
        {puedeCrear ? (
          <button
            type="button"
            onClick={onCrear}
            className={btnAccionPrimaria}
            title="Añadir"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Añadir
          </button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {cargando ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : vacioSinPadre ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-400">
            {mensajeSinPadre}
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-400">
            Sin registros
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => {
              const activo = seleccionadoId === item.id;
              const conteo =
                typeof item.conteoHijos === "number" && etiquetaSubnivel
                  ? ` · ${item.conteoHijos} ${etiquetaSubnivel}`
                  : "";
              return (
                <li key={item.id} id={`territorio-item-${item.id}`}>
                  <div
                    className={`rounded-xl px-3 py-2 transition ${
                      activo ? "bg-ruralia-teal-soft" : "hover:bg-zinc-50"
                    } ${!item.estaActivo ? "opacity-55" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={!onSeleccionar}
                      onClick={() => onSeleccionar?.(item.id)}
                      className={`w-full text-left ${
                        onSeleccionar ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <p className="text-sm font-medium text-zinc-900">
                        {item.nombre}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {item.codigo}
                        {!item.estaActivo ? " · inactivo" : ""}
                        {conteo}
                      </p>
                    </button>
                    {(puedeEditar || puedeEliminar) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {puedeEditar ? (
                          <button
                            type="button"
                            className={btnAccionSecundaria}
                            onClick={() => onEditar(item)}
                          >
                            Editar
                          </button>
                        ) : null}
                        {puedeEliminar && item.estaActivo ? (
                          <button
                            type="button"
                            className={btnAccionPeligro}
                            onClick={() => onDesactivar(item)}
                          >
                            Desactivar
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
