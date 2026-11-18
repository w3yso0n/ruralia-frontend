import type {
  CampoBeneficiario,
  CampoModeloBeneficiario,
  DatosAdicionales,
  TipoCampoBeneficiario,
  ValorDatoAdicional,
} from "@/lib/types";

export const ETIQUETAS_CAMPO_MODELO: Record<CampoModeloBeneficiario, string> = {
  numeroDocumento: "Cédula / documento",
  tipoDocumento: "Tipo de documento",
  primerNombre: "Primer nombre",
  segundoNombre: "Segundo nombre",
  primerApellido: "Primer apellido",
  segundoApellido: "Segundo apellido",
  nombres: "Nombres o nombre completo",
  apellidos: "Apellidos",
  telefono: "Teléfono / celular",
  correo: "Correo",
  genero: "Sexo",
  edad: "Edad",
  fechaNacimiento: "Fecha de nacimiento",
  municipio: "Municipio",
  latitud: "Latitud del predio",
  longitud: "Longitud del predio",
  altitud: "Altitud (m s. n. m.)",
  lineaProductiva: "Línea productiva",
  nombreAsociacion: "Asociación",
  estado: "Estado (activo / inactivo)",
};

export const CAMPOS_MODELO_ORDEN = Object.keys(
  ETIQUETAS_CAMPO_MODELO,
) as CampoModeloBeneficiario[];

export const ETIQUETAS_TIPO_CAMPO: Record<TipoCampoBeneficiario, string> = {
  texto: "Texto",
  numero: "Número",
  fecha: "Fecha",
  booleano: "Sí / No",
};

/** Misma regla que el backend (`claveDesdeEncabezado`). */
export function claveDesdeEncabezado(encabezado: string): string {
  const base = encabezado
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  if (!base) return "campo";
  return /^[a-z]/.test(base) ? base : `campo_${base}`;
}

export function formatearDatoAdicional(
  valor: ValorDatoAdicional | undefined,
  tipo?: TipoCampoBeneficiario,
): string {
  if (valor == null || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (tipo === "fecha" && typeof valor === "string") {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (partes) {
      return new Date(
        Number(partes[1]),
        Number(partes[2]) - 1,
        Number(partes[3]),
      ).toLocaleDateString("es-CO");
    }
  }
  return String(valor);
}

/** Valor guardado -> texto del input. Sí/No va como "si" / "no"; la fecha, AAAA-MM-DD. */
export function valorParaFormulario(valor: ValorDatoAdicional | undefined): string {
  if (valor == null) return "";
  if (typeof valor === "boolean") return valor ? "si" : "no";
  return String(valor);
}

/** Texto del input -> valor a guardar. Vacío es `null`: el backend borra ese dato. */
export function valorDesdeFormulario(
  texto: string,
  tipo: TipoCampoBeneficiario,
): ValorDatoAdicional {
  const limpio = texto.trim();
  if (!limpio) return null;
  if (tipo === "booleano") {
    if (limpio === "si") return true;
    if (limpio === "no") return false;
  }
  if (tipo === "numero" && /^-?(0|[1-9]\d{0,14})([.,]\d+)?$/.test(limpio)) {
    return Number(limpio.replace(",", "."));
  }
  return limpio;
}

/**
 * Pares etiqueta/valor en el orden de las definiciones. Las claves sin definición
 * (de otra carga) van al final con la clave como etiqueta.
 */
export function paresDatosAdicionales(
  datos: DatosAdicionales | undefined,
  campos: CampoBeneficiario[],
  { soloDefinidos = false }: { soloDefinidos?: boolean } = {},
): Array<{ clave: string; etiqueta: string; valor: string }> {
  if (!datos) return [];
  const pares: Array<{ clave: string; etiqueta: string; valor: string }> = [];
  const vistas = new Set<string>();
  for (const campo of campos) {
    vistas.add(campo.clave);
    if (!(campo.clave in datos)) continue;
    pares.push({
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      valor: formatearDatoAdicional(datos[campo.clave], campo.tipo),
    });
  }
  if (!soloDefinidos) {
    for (const [clave, valor] of Object.entries(datos)) {
      if (vistas.has(clave)) continue;
      pares.push({ clave, etiqueta: clave, valor: formatearDatoAdicional(valor) });
    }
  }
  return pares;
}
