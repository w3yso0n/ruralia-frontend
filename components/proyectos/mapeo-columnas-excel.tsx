"use client";

import { AlertCircle, Columns3, EyeOff, Plus, UserRound } from "lucide-react";
import {
  CAMPOS_MODELO_ORDEN,
  claveDesdeEncabezado,
  ETIQUETAS_CAMPO_MODELO,
  ETIQUETAS_TIPO_CAMPO,
} from "@/lib/datos-adicionales";
import type {
  AnalisisExcelBeneficiarios,
  ColumnaExcelAnalizada,
  ColumnaMapeoExcel,
  DestinoColumnaExcel,
  MapeoColumnasExcel,
  TipoCampoBeneficiario,
} from "@/lib/types";

export type DestinosPorColumna = Record<number, DestinoColumnaExcel>;

export function destinosIniciales(
  analisis: AnalisisExcelBeneficiarios,
): DestinosPorColumna {
  return Object.fromEntries(
    analisis.columnas.map((columna) => [columna.columna, columna.sugerencia]),
  );
}

export function construirMapeo(
  analisis: AnalisisExcelBeneficiarios,
  destinos: DestinosPorColumna,
): MapeoColumnasExcel {
  return {
    filaEncabezado: analisis.filaEncabezado,
    columnas: analisis.columnas.map(
      (columna): ColumnaMapeoExcel => ({
        ...(destinos[columna.columna] ?? { destino: "ignorar" }),
        columna: columna.columna,
      }),
    ),
  };
}

/** Lo que falta para poder seguir: cédula, nombre y nombres de los datos adicionales. */
export function problemasDelMapeo(destinos: DestinosPorColumna): string[] {
  const valores = Object.values(destinos);
  const campos = new Set(
    valores.flatMap((d) => (d.destino === "modelo" ? [d.campo] : [])),
  );
  const problemas: string[] = [];
  if (!campos.has("numeroDocumento")) {
    problemas.push("Elige qué columna trae la cédula o documento.");
  }
  if (!campos.has("nombres") && !campos.has("primerNombre")) {
    problemas.push("Elige qué columna trae el nombre (o el primer nombre).");
  }
  if (valores.some((d) => d.destino === "extra" && !d.etiqueta.trim())) {
    problemas.push("Cada dato adicional necesita un nombre.");
  }
  return problemas;
}

const claseControl =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20";

function valorSelect(destino: DestinoColumnaExcel): string {
  if (destino.destino === "modelo") return `modelo:${destino.campo}`;
  return destino.destino;
}

function claveLibre(base: string, destinos: DestinosPorColumna, columna: number) {
  const usadas = new Set(
    Object.entries(destinos).flatMap(([col, d]) =>
      Number(col) !== columna && d.destino === "extra" ? [d.clave] : [],
    ),
  );
  let clave = base;
  let sufijo = 2;
  while (usadas.has(clave)) {
    clave = `${base}_${sufijo}`;
    sufijo += 1;
  }
  return clave;
}

interface MapeoColumnasExcelProps {
  analisis: AnalisisExcelBeneficiarios;
  destinos: DestinosPorColumna;
  onChange: (destinos: DestinosPorColumna) => void;
}

export function MapeoColumnasExcel({
  analisis,
  destinos,
  onChange,
}: MapeoColumnasExcelProps) {
  const camposUsados = new Map<string, number>();
  for (const [columna, destino] of Object.entries(destinos)) {
    if (destino.destino === "modelo") camposUsados.set(destino.campo, Number(columna));
  }
  const conteo = { modelo: 0, extra: 0, ignorar: 0 };
  for (const destino of Object.values(destinos)) conteo[destino.destino] += 1;

  function cambiarDestino(columna: ColumnaExcelAnalizada, valor: string) {
    const actual = destinos[columna.columna];
    let nuevo: DestinoColumnaExcel;
    if (valor === "ignorar") {
      nuevo = { destino: "ignorar" };
    } else if (valor === "extra") {
      const anterior =
        actual?.destino === "extra"
          ? actual
          : columna.sugerencia.destino === "extra"
            ? columna.sugerencia
            : null;
      nuevo = {
        destino: "extra",
        etiqueta: anterior?.etiqueta ?? columna.encabezado.slice(0, 120),
        tipo: anterior?.tipo ?? columna.tipoDetectado,
        clave: claveLibre(
          anterior?.clave ?? claveDesdeEncabezado(columna.encabezado),
          destinos,
          columna.columna,
        ),
      };
    } else {
      const campo = valor.replace("modelo:", "") as keyof typeof ETIQUETAS_CAMPO_MODELO;
      nuevo = { destino: "modelo", campo };
      // Un campo de la ficha solo puede venir de una columna: la otra pasa a "no cargar".
      const otra = camposUsados.get(campo);
      if (otra != null && otra !== columna.columna) {
        onChange({ ...destinos, [otra]: { destino: "ignorar" }, [columna.columna]: nuevo });
        return;
      }
    }
    onChange({ ...destinos, [columna.columna]: nuevo });
  }

  function cambiarExtra(
    columna: number,
    cambios: { etiqueta?: string; tipo?: TipoCampoBeneficiario },
  ) {
    const actual = destinos[columna];
    if (actual?.destino !== "extra") return;
    onChange({ ...destinos, [columna]: { ...actual, ...cambios } });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ruralia-teal-soft px-2.5 py-1 text-ruralia-teal-text">
          <UserRound className="h-3.5 w-3.5" />
          {conteo.modelo} a la ficha
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ruralia-teal-border bg-white px-2.5 py-1 text-ruralia-teal-text">
          <Plus className="h-3.5 w-3.5" />
          {conteo.extra} datos adicionales
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600">
          <EyeOff className="h-3.5 w-3.5" />
          {conteo.ignorar} sin cargar
        </span>
      </div>

      <ul className="max-h-[55vh] divide-y divide-zinc-100 overflow-y-auto rounded-2xl border border-ruralia-teal-border bg-white">
        {analisis.columnas.map((columna) => {
          const destino = destinos[columna.columna] ?? { destino: "ignorar" };
          const ignorada = destino.destino === "ignorar";
          return (
            <li
              key={columna.columna}
              className={`grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,280px)] ${
                ignorada ? "bg-zinc-50/70" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-ruralia-teal-soft px-1 text-[11px] font-semibold text-ruralia-teal-text">
                    {columna.letra}
                  </span>
                  <span className={`truncate ${ignorada ? "text-zinc-500" : ""}`}>
                    {columna.encabezado}
                  </span>
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {columna.muestras.length
                    ? `Ej.: ${columna.muestras.join(" · ")}`
                    : "Columna vacía"}
                  {columna.conDatos
                    ? ` · ${columna.conDatos.toLocaleString("es-CO")} con dato`
                    : ""}
                </p>
              </div>
              <div className="space-y-2">
                <select
                  value={valorSelect(destino)}
                  onChange={(e) => cambiarDestino(columna, e.target.value)}
                  aria-label={`Destino de la columna ${columna.encabezado}`}
                  className={claseControl}
                >
                  <optgroup label="Campo de la ficha">
                    {CAMPOS_MODELO_ORDEN.map((campo) => {
                      const enOtra = camposUsados.get(campo);
                      return (
                        <option key={campo} value={`modelo:${campo}`}>
                          {ETIQUETAS_CAMPO_MODELO[campo]}
                          {enOtra != null && enOtra !== columna.columna
                            ? " (ya asignado)"
                            : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Otros">
                    <option value="extra">Dato adicional</option>
                    <option value="ignorar">No cargar</option>
                  </optgroup>
                </select>
                {destino.destino === "extra" ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                    <input
                      value={destino.etiqueta}
                      maxLength={120}
                      onChange={(e) =>
                        cambiarExtra(columna.columna, { etiqueta: e.target.value })
                      }
                      placeholder="Nombre del dato"
                      aria-label="Nombre del dato adicional"
                      className={claseControl}
                    />
                    <select
                      value={destino.tipo}
                      onChange={(e) =>
                        cambiarExtra(columna.columna, {
                          tipo: e.target.value as TipoCampoBeneficiario,
                        })
                      }
                      aria-label="Tipo del dato adicional"
                      className={claseControl}
                    >
                      {Object.entries(ETIQUETAS_TIPO_CAMPO).map(([tipo, etiqueta]) => (
                        <option key={tipo} value={tipo}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {problemasDelMapeo(destinos).map((problema) => (
        <p
          key={problema}
          className="flex items-center gap-2 text-sm text-amber-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {problema}
        </p>
      ))}

      <p className="flex items-start gap-2 text-xs text-zinc-500">
        <Columns3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ruralia-teal" />
        Los datos adicionales quedan en la ficha de la persona (una sola por
        cédula), así que también se ven desde el catálogo de Contrapartes.
      </p>
    </div>
  );
}
