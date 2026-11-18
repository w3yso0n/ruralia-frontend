"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Landmark, Map as IconoMapa } from "lucide-react";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import { obtenerCatalogoVeredasPdet } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CatalogoVeredasPdet, ValorVeredaPdet } from "@/lib/types";

/** Catálogo en memoria por proyecto: varias preguntas PDET en la misma pantalla piden una sola vez. */
const cache = new Map<string, Promise<CatalogoVeredasPdet>>();

function cargarCatalogo(token: string, proyectoId?: string) {
  const clave = proyectoId ?? "todos";
  if (!cache.has(clave)) {
    cache.set(
      clave,
      obtenerCatalogoVeredasPdet(token, proyectoId).catch((err) => {
        cache.delete(clave);
        throw err;
      }),
    );
  }
  return cache.get(clave)!;
}

interface SelectorVeredaPdetProps {
  valor: ValorVeredaPdet | null | undefined;
  onChange: (valor: ValorVeredaPdet | null) => void;
  /** Limita el catálogo a los municipios del proyecto. */
  proyectoId?: string;
  disabled?: boolean;
}

/**
 * Selector en cascada departamento > municipio > vereda PDET. Usa el catálogo
 * PDET (zonas de posconflicto), que es distinto de la división DANE: por eso
 * lleva su propio encabezado e icono.
 */
export function SelectorVeredaPdet({
  valor,
  onChange,
  proyectoId,
  disabled = false,
}: SelectorVeredaPdetProps) {
  const { token } = useAuth();
  const [catalogo, setCatalogo] = useState<CatalogoVeredasPdet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [departamentoId, setDepartamentoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    cargarCatalogo(token, proyectoId)
      .then((datos) => {
        if (!cancelado) setCatalogo(datos);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : "No se pudo cargar el catálogo PDET");
        }
      });
    return () => {
      cancelado = true;
    };
  }, [token, proyectoId]);

  // Con un valor ya guardado, se ubican departamento y municipio en el catálogo.
  useEffect(() => {
    if (!catalogo || !valor?.veredaPdetId) return;
    for (const dep of catalogo.departamentos) {
      for (const mun of dep.municipios) {
        if (mun.veredas.some((v) => v.id === valor.veredaPdetId)) {
          setDepartamentoId(dep.id);
          setMunicipioId(mun.id);
          return;
        }
      }
    }
  }, [catalogo, valor?.veredaPdetId]);

  const departamento = useMemo(
    () => catalogo?.departamentos.find((d) => d.id === departamentoId),
    [catalogo, departamentoId],
  );
  const municipio = useMemo(
    () => departamento?.municipios.find((m) => m.id === municipioId),
    [departamento, municipioId],
  );

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-2 rounded-xl border border-ruralia-teal-border bg-ruralia-teal-soft/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ruralia-teal-text">
        <IconoMapa className="h-3.5 w-3.5" />
        Vereda PDET
        <span className="font-normal text-zinc-500">(no es la vereda DANE)</span>
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <SelectorDesplegable
          value={departamentoId}
          onChange={(id) => {
            setDepartamentoId(id);
            setMunicipioId("");
            onChange(null);
          }}
          opciones={(catalogo?.departamentos ?? []).map((d) => ({ id: d.id, nombre: d.nombre }))}
          placeholder={catalogo ? "Departamento" : "Cargando…"}
          mensajeSinOpciones="No hay veredas PDET cargadas"
          disabled={disabled || !catalogo}
          icono={Landmark}
        />
        <SelectorDesplegable
          value={municipioId}
          onChange={(id) => {
            setMunicipioId(id);
            onChange(null);
          }}
          opciones={(departamento?.municipios ?? []).map((m) => ({ id: m.id, nombre: m.nombre }))}
          placeholder="Municipio"
          mensajeSinOpciones="Elige primero el departamento"
          disabled={disabled || !departamento}
          icono={Building2}
        />
        <SelectorDesplegable
          value={valor?.veredaPdetId ?? ""}
          onChange={(id) => {
            const vereda = municipio?.veredas.find((v) => v.id === id);
            onChange(
              vereda && municipio
                ? {
                    veredaPdetId: vereda.id,
                    codigo: vereda.codigo,
                    nombre: vereda.nombre,
                    municipioCodigo: municipio.codigo,
                  }
                : null,
            );
          }}
          opciones={(municipio?.veredas ?? []).map((v) => ({
            id: v.id,
            nombre: v.nombre,
            subtitulo: v.codigo,
          }))}
          placeholder="Vereda PDET"
          mensajeSinOpciones="Elige primero el municipio"
          disabled={disabled || !municipio}
          icono={IconoMapa}
          permitirVacio
          etiquetaVacio="Sin vereda PDET"
        />
      </div>
    </div>
  );
}
