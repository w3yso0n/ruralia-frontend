"use client";

import { useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { corregirEnvioFormulario } from "@/lib/api";
import type {
  CampoFormulario,
  ColumnaCampoTabla,
  EnvioFormularioResumen,
  PlantillaFormulario,
  RespuestaFormularioDetalle,
} from "@/lib/types";

/** Marca técnica de la fila de una tabla fija: no se muestra ni se edita. */
export const CLAVE_FILA_BENEFICIARIO = "_beneficiarioId";

/** Tipos que no se pueden capturar desde la web: se conservan como llegaron del celular. */
const SOLO_CONSERVAR = new Set(["GPS", "FOTO", "FIRMA", "ARCHIVO"]);

const claseControl =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition hover:border-ruralia-teal-border focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20";

type Fila = Record<string, unknown>;

function valorInicial(campo: CampoFormulario, respuesta?: RespuestaFormularioDetalle) {
  if (!respuesta) return campo.tipoCampo === "TABLA" ? [] : "";
  switch (campo.tipoCampo) {
    case "NUMERO":
      return respuesta.valorNumero != null ? String(respuesta.valorNumero) : "";
    case "FECHA":
      return respuesta.valorFecha?.slice(0, 10) ?? "";
    case "SI_NO":
      return respuesta.valorBooleano === true ? "si" : respuesta.valorBooleano === false ? "no" : "";
    case "SELECCION_MULTIPLE":
      return Array.isArray(respuesta.valorJson) ? respuesta.valorJson : [];
    case "TABLA": {
      const filas = (respuesta.valorJson as { filas?: unknown } | undefined)?.filas;
      return Array.isArray(filas) ? (filas as Fila[]) : [];
    }
    case "GPS":
      return respuesta.valorJson ?? null;
    case "FOTO":
    case "FIRMA":
    case "ARCHIVO":
      return respuesta.urlArchivo ?? "";
    default:
      return respuesta.valorTexto ?? "";
  }
}

function valorDeCelda(columna: ColumnaCampoTabla, valor: unknown): unknown {
  if (columna.tipoCampo === "NUMERO") {
    return valor === "" || valor == null ? "" : Number(valor);
  }
  if (columna.tipoCampo === "SI_NO") return valor === true || valor === "si";
  return valor ?? "";
}

/** Valor a enviar; `undefined` deja la pregunta sin respuesta. */
function valorParaEnviar(campo: CampoFormulario, valor: unknown): unknown {
  switch (campo.tipoCampo) {
    case "NUMERO":
      return valor === "" || valor == null ? undefined : Number(valor);
    case "SI_NO":
      return valor === "si" ? true : valor === "no" ? false : undefined;
    case "SELECCION_MULTIPLE":
      return Array.isArray(valor) && valor.length ? valor : undefined;
    case "TABLA": {
      const columnas = columnasDe(campo);
      return {
        filas: (valor as Fila[]).map((fila) => {
          const salida: Fila = {};
          if (fila[CLAVE_FILA_BENEFICIARIO]) {
            salida[CLAVE_FILA_BENEFICIARIO] = fila[CLAVE_FILA_BENEFICIARIO];
          }
          for (const columna of columnas) {
            salida[columna.clave] = valorDeCelda(columna, fila[columna.clave]);
          }
          return salida;
        }),
      };
    }
    case "GPS":
      return valor ?? undefined;
    default:
      return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
  }
}

function columnasDe(campo: CampoFormulario): ColumnaCampoTabla[] {
  const columnas = (campo.opciones as { columnas?: ColumnaCampoTabla[] } | undefined)
    ?.columnas;
  return Array.isArray(columnas) ? columnas : [];
}

function opcionesDe(opciones: unknown): string[] {
  const valores = (opciones as { valores?: unknown } | undefined)?.valores;
  return Array.isArray(valores) ? valores.map(String) : [];
}

function Control({
  tipo,
  valor,
  opciones,
  onChange,
  etiqueta,
}: {
  tipo: string;
  valor: unknown;
  opciones: string[];
  onChange: (valor: unknown) => void;
  etiqueta: string;
}) {
  if (tipo === "SI_NO") {
    const actual = valor === true ? "si" : valor === false ? "no" : String(valor ?? "");
    return (
      <select
        value={actual}
        onChange={(e) => onChange(e.target.value)}
        aria-label={etiqueta}
        className={claseControl}
      >
        <option value="">Sin respuesta</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
    );
  }
  if (tipo === "SELECCION_UNICA") {
    const actual = String(valor ?? "");
    return (
      <select
        value={actual}
        onChange={(e) => onChange(e.target.value)}
        aria-label={etiqueta}
        className={claseControl}
      >
        <option value="">Sin respuesta</option>
        {actual && !opciones.includes(actual) ? (
          <option value={actual}>{actual}</option>
        ) : null}
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={tipo === "FECHA" ? "date" : tipo === "NUMERO" ? "number" : "text"}
      value={valor == null ? "" : String(valor)}
      onChange={(e) => onChange(e.target.value)}
      aria-label={etiqueta}
      className={claseControl}
    />
  );
}

interface CorreccionEnvioFormularioProps {
  token: string;
  envio: EnvioFormularioResumen;
  plantilla: PlantillaFormulario;
  respuestas: RespuestaFormularioDetalle[];
  onCerrar: () => void;
  onGuardado: () => void;
}

/** Corrección de administración: puede cambiar cualquier respuesta, también las que vinieron de la ficha. */
export function CorreccionEnvioFormulario({
  token,
  envio,
  plantilla,
  respuestas,
  onCerrar,
  onGuardado,
}: CorreccionEnvioFormularioProps) {
  const campos = (plantilla.campos ?? []).slice().sort((a, b) => a.orden - b.orden);
  const porClave = new Map(respuestas.map((r) => [r.claveCampo, r]));
  const [valores, setValores] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      campos.map((campo) => [campo.clave, valorInicial(campo, porClave.get(campo.clave))]),
    ),
  );
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deFicha = new Set(
    (envio.origenRespuestas?.autocompletado ?? [])
      .filter((r) => !r.columna)
      .map((r) => r.clave),
  );

  function cambiar(clave: string, valor: unknown) {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  }

  function cambiarCelda(clave: string, fila: number, columna: string, valor: unknown) {
    setValores((prev) => ({
      ...prev,
      [clave]: (prev[clave] as Fila[]).map((f, i) =>
        i === fila ? { ...f, [columna]: valor } : f,
      ),
    }));
  }

  async function guardar() {
    if (!motivo.trim()) {
      setError("Escribe el motivo de la corrección: queda en el historial.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const payload = campos.flatMap((campo) => {
        const valor = valorParaEnviar(campo, valores[campo.clave]);
        return valor === undefined ? [] : [{ claveCampo: campo.clave, valor }];
      });
      await corregirEnvioFormulario(token, envio.id, {
        respuestas: payload,
        motivo: motivo.trim(),
      });
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la corrección");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal abierto onCerrar={onCerrar} titulo="Corregir respuestas" ancho="xl">
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Corrección de administración. Puedes cambiar cualquier respuesta,
          incluidas las que vinieron de la ficha del beneficiario. Cada cambio
          queda registrado con tu nombre y el motivo. Si el dato está mal en la
          ficha, corrígelo también allá para los próximos formularios.
        </p>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {campos.map((campo) => {
            const valor = valores[campo.clave];
            return (
              <div
                key={campo.clave}
                className="rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-800">{campo.etiqueta}</p>
                  {deFicha.has(campo.clave) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ruralia-teal-soft px-2 py-0.5 text-[11px] font-semibold text-ruralia-teal-text">
                      <Lock className="h-3 w-3" />
                      De la ficha
                    </span>
                  ) : null}
                </div>
                {SOLO_CONSERVAR.has(campo.tipoCampo) ? (
                  <p className="text-sm text-zinc-500">
                    {valor ? "Se conserva lo capturado en campo." : "Sin respuesta."} Este tipo
                    de respuesta solo se captura desde el celular.
                  </p>
                ) : campo.tipoCampo === "SELECCION_MULTIPLE" ? (
                  <div className="flex flex-wrap gap-2">
                    {opcionesDe(campo.opciones).map((opcion) => {
                      const lista = Array.isArray(valor) ? (valor as string[]) : [];
                      const marcada = lista.includes(opcion);
                      return (
                        <label
                          key={opcion}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={marcada}
                            onChange={() =>
                              cambiar(
                                campo.clave,
                                marcada
                                  ? lista.filter((o) => o !== opcion)
                                  : [...lista, opcion],
                              )
                            }
                          />
                          {opcion}
                        </label>
                      );
                    })}
                  </div>
                ) : campo.tipoCampo === "TABLA" ? (
                  <TablaEditable
                    campo={campo}
                    filas={(valor as Fila[]) ?? []}
                    onCambiarCelda={(fila, columna, v) =>
                      cambiarCelda(campo.clave, fila, columna, v)
                    }
                  />
                ) : (
                  <Control
                    tipo={campo.tipoCampo}
                    valor={valor}
                    opciones={opcionesDe(campo.opciones)}
                    etiqueta={campo.etiqueta}
                    onChange={(v) => cambiar(campo.clave, v)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Motivo de la corrección *
          </label>
          <textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: el productor reportó mal el número de hectáreas"
            className={claseControl}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="rounded-xl bg-ruralia-teal px-4 py-2 text-sm font-semibold text-white hover:bg-ruralia-teal-hover disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar corrección"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TablaEditable({
  campo,
  filas,
  onCambiarCelda,
}: {
  campo: CampoFormulario;
  filas: Fila[];
  onCambiarCelda: (fila: number, columna: string, valor: unknown) => void;
}) {
  const columnas = columnasDe(campo);
  if (!filas.length) {
    return <p className="text-sm text-zinc-500">La lista no tiene filas.</p>;
  }
  return (
    <div className="space-y-2">
      {filas.map((fila, indice) => (
        <div key={indice} className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3">
          <p className="mb-2 text-xs font-semibold text-zinc-500">Fila {indice + 1}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {columnas.map((columna) => (
              <div key={columna.clave}>
                <p className="mb-1 flex items-center gap-1 text-xs text-zinc-500">
                  {columna.etiqueta}
                  {columna.autocompletar ? <Lock className="h-3 w-3 text-ruralia-teal" /> : null}
                </p>
                {columna.tipoCampo === "FIRMA" ? (
                  <p className="text-xs text-zinc-500">
                    {fila[columna.clave] ? "Firma conservada" : "Sin firma"}
                  </p>
                ) : (
                  <Control
                    tipo={columna.tipoCampo}
                    valor={fila[columna.clave]}
                    opciones={opcionesDe(columna.opciones)}
                    etiqueta={columna.etiqueta}
                    onChange={(v) => onCambiarCelda(indice, columna.clave, v)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
