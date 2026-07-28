"use client";

import { useEffect, useState } from "react";
import { Alerta } from "@/components/ui/modal";
import { SelectorCatalogo } from "@/components/ui/selector-catalogo";
import { SelectorVeredasMultiple } from "@/components/ui/selector-veredas-multiple";
import {
  asignarAsociacionesProyecto,
  asignarBeneficiariosProyecto,
  asignarPersonalProyecto,
  asignarTerritoriosProyecto,
  listarAsociaciones,
  listarBeneficiarios,
  listarUsuarios,
} from "@/lib/api";
import type { Proyecto } from "@/lib/types";

type TipoContraparte = "beneficiario" | "asociacion";

interface EquipoVinculosProps {
  token: string;
  proyectoId: string;
  proyecto: Proyecto;
  puedeGestionar: boolean;
  onActualizar: () => Promise<void>;
}

function resolverContraparte(proyecto: Proyecto): {
  tipo: TipoContraparte | null;
  id: string;
} {
  const beneficiario =
    proyecto.beneficiarioPrincipal ?? proyecto.beneficiarios?.[0];
  const asociacion =
    proyecto.asociacionPrincipal ?? proyecto.asociaciones?.[0];

  if (beneficiario) {
    return { tipo: "beneficiario", id: beneficiario.id };
  }
  if (asociacion) {
    return { tipo: "asociacion", id: asociacion.id };
  }
  return { tipo: null, id: "" };
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
  const [tipoContraparte, setTipoContraparte] = useState<TipoContraparte | null>(
    null,
  );
  const [contraparteId, setContraparteId] = useState("");
  const [opcionesUsuarios, setOpcionesUsuarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesBeneficiarios, setOpcionesBeneficiarios] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [opcionesAsociaciones, setOpcionesAsociaciones] = useState<
    { id: string; nombre: string }[]
  >([]);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVeredaIds(proyecto.veredas?.map((v) => v.id) ?? []);
    setUsuarioIds(proyecto.personal?.map((p) => p.id) ?? []);
    const contraparte = resolverContraparte(proyecto);
    setTipoContraparte(contraparte.tipo);
    setContraparteId(contraparte.id);
  }, [proyecto]);

  useEffect(() => {
    void Promise.all([
      listarUsuarios(token, { limite: 100, estaActivo: true }),
      listarBeneficiarios(token, { limite: 100 }),
      listarAsociaciones(token, { limite: 100 }),
    ]).then(([usuarios, beneficiarios, asociaciones]) => {
      setOpcionesUsuarios(
        usuarios.datos.map((u) => ({ id: u.id, nombre: u.nombreCompleto })),
      );
      setOpcionesBeneficiarios(
        beneficiarios.datos.map((b) => ({
          id: b.id,
          nombre: `${b.nombres} ${b.apellidos}`,
        })),
      );
      setOpcionesAsociaciones(
        asociaciones.datos.map((a) => ({ id: a.id, nombre: a.nombre })),
      );
    });
  }, [token]);

  async function guardarSeccion(tipo: "territorio" | "personal" | "vinculos") {
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
      if (tipo === "vinculos") {
        if (!tipoContraparte || !contraparteId) {
          setError("Selecciona un beneficiario o una asociación");
          return;
        }
        if (tipoContraparte === "beneficiario") {
          await asignarBeneficiariosProyecto(token, proyectoId, {
            beneficiarios: [
              { beneficiarioId: contraparteId, esPrincipal: true },
            ],
          });
          await asignarAsociacionesProyecto(token, proyectoId, {
            asociaciones: [],
          });
        } else {
          await asignarAsociacionesProyecto(token, proyectoId, {
            asociaciones: [{ asociacionId: contraparteId, esPrincipal: true }],
          });
          await asignarBeneficiariosProyecto(token, proyectoId, {
            beneficiarios: [],
          });
        }
      }
      setExito("Cambios guardados");
      await onActualizar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEnviando(false);
    }
  }

  const contraparte = resolverContraparte(proyecto);

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
          <h3 className="font-semibold text-zinc-900">Contraparte</h3>
          {contraparte.tipo === "beneficiario" ? (
            <p className="mt-2 text-sm text-zinc-600">
              Beneficiario:{" "}
              {proyecto.beneficiarioPrincipal
                ? `${proyecto.beneficiarioPrincipal.nombres} ${proyecto.beneficiarioPrincipal.apellidos}`
                : proyecto.beneficiarios?.[0]
                  ? `${proyecto.beneficiarios[0].nombres} ${proyecto.beneficiarios[0].apellidos}`
                  : "—"}
            </p>
          ) : contraparte.tipo === "asociacion" ? (
            <p className="mt-2 text-sm text-zinc-600">
              Asociación:{" "}
              {proyecto.asociacionPrincipal?.nombre ??
                proyecto.asociaciones?.[0]?.nombre ??
                "—"}
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Sin contraparte asignada</p>
          )}
          <p className="mt-2 text-sm text-zinc-600">Veredas asignadas</p>
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

  const opcionesContraparte =
    tipoContraparte === "beneficiario"
      ? opcionesBeneficiarios
      : tipoContraparte === "asociacion"
        ? opcionesAsociaciones
        : [];

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
            <h3 className="font-semibold text-zinc-900">Contraparte</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Asigna <strong>un beneficiario</strong> o{" "}
              <strong>una asociación</strong> (exclusivo).
            </p>
          </div>
          <button
            type="button"
            disabled={enviando}
            onClick={() => void guardarSeccion("vinculos")}
            className="shrink-0 rounded-lg bg-ruralia-teal-soft px-3 py-1.5 text-sm font-semibold text-ruralia-teal-text transition hover:bg-ruralia-teal hover:text-white disabled:opacity-50"
          >
            Guardar
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoContraparte"
              checked={tipoContraparte === "beneficiario"}
              onChange={() => {
                setTipoContraparte("beneficiario");
                setContraparteId("");
              }}
            />
            Beneficiario
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipoContraparte"
              checked={tipoContraparte === "asociacion"}
              onChange={() => {
                setTipoContraparte("asociacion");
                setContraparteId("");
              }}
            />
            Asociación
          </label>
        </div>

        {tipoContraparte ? (
          <SelectorCatalogo
            opciones={opcionesContraparte}
            value={contraparteId}
            onChange={setContraparteId}
            placeholder={
              tipoContraparte === "beneficiario"
                ? "Buscar beneficiario…"
                : "Buscar asociación…"
            }
            mensajeVacio={
              tipoContraparte === "beneficiario"
                ? "Selecciona un beneficiario de la lista."
                : "Selecciona una asociación de la lista."
            }
          />
        ) : (
          <p className="text-sm text-zinc-500">
            Elige si la contraparte es un beneficiario o una asociación.
          </p>
        )}
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
    </div>
  );
}
