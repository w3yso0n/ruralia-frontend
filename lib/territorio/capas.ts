import type { PuntoTerritorioBeneficiario } from "@/lib/types";

/**
 * Capas territoriales del equipo interno (delimitación propia basada en PDET).
 *
 * Los límites NO son los de Google ni los de internet: cada capa se dibuja
 * exactamente con el archivo GeoJSON entregado por el equipo (WGS84) que vive
 * en `public/territorio/`. Para activar un nivel nuevo basta con copiar su
 * archivo ahí y completar `archivo` y las propiedades de esta tabla.
 *
 * El orden del arreglo es la jerarquía: de la capa más amplia a la más fina.
 */

export type NivelCapaTerritorial = "departamento" | "municipio" | "vereda";

export interface EstiloCapa {
  borde: string;
  grosorBorde: number;
  relleno: string;
  opacidadRelleno: number;
}

export interface CapaTerritorial {
  id: NivelCapaTerritorial;
  nombre: string;
  /** Ruta pública del GeoJSON del equipo. `null` mientras no se entrega. */
  archivo: string | null;
  /** Propiedad del GeoJSON con el código DANE del polígono. */
  propiedadCodigo: string;
  /** Propiedad del GeoJSON con el nombre que se muestra. */
  propiedadNombre: string;
  /** Propiedades extra que se listan al seleccionar un polígono. */
  propiedadesDetalle: { propiedad: string; etiqueta: string }[];
  /** Código registrado en la ficha del beneficiario, para cruzar con la capa. */
  codigoBeneficiario: (b: PuntoTerritorioBeneficiario) => string | null;
  /** Longitud del código DANE (se rellena con ceros a la izquierda). */
  longitudCodigo: number;
  estilo: EstiloCapa;
  zIndex: number;
}

export const CAPAS_TERRITORIALES: CapaTerritorial[] = [
  {
    id: "departamento",
    nombre: "Departamentos",
    archivo: "/territorio/departamentos.geojson",
    propiedadCodigo: "DeCodigo",
    propiedadNombre: "DeNombre",
    propiedadesDetalle: [
      { propiedad: "DeCodigo", etiqueta: "Código DANE" },
      { propiedad: "DeArea", etiqueta: "Área (km²)" },
    ],
    codigoBeneficiario: (b) => b.departamentoCodigo,
    longitudCodigo: 2,
    estilo: {
      borde: "#121C2D",
      grosorBorde: 2.5,
      relleno: "#42827A",
      opacidadRelleno: 0.08,
    },
    zIndex: 1,
  },
  {
    id: "municipio",
    nombre: "Municipios",
    archivo: null,
    propiedadCodigo: "COD_DANE",
    propiedadNombre: "NOM_MPIO",
    propiedadesDetalle: [
      { propiedad: "COD_DANE", etiqueta: "Código DANE" },
      { propiedad: "NOM_DPTO", etiqueta: "Departamento" },
      { propiedad: "NOM_SUBREG", etiqueta: "Subregión PDET" },
    ],
    codigoBeneficiario: (b) => b.municipioCodigo,
    longitudCodigo: 5,
    estilo: {
      borde: "#42827A",
      grosorBorde: 1.5,
      relleno: "#42827A",
      opacidadRelleno: 0.12,
    },
    zIndex: 2,
  },
  {
    id: "vereda",
    nombre: "Veredas",
    archivo: null,
    propiedadCodigo: "COD_VERE",
    propiedadNombre: "NOM_VERE",
    propiedadesDetalle: [
      { propiedad: "COD_VERE", etiqueta: "Código DANE" },
      { propiedad: "NOM_MPIO", etiqueta: "Municipio" },
      { propiedad: "NOMBRE_UBP", etiqueta: "UBP" },
    ],
    codigoBeneficiario: (b) => b.veredaCodigo,
    longitudCodigo: 8,
    estilo: {
      borde: "#d97706",
      grosorBorde: 1,
      relleno: "#f59e0b",
      opacidadRelleno: 0.15,
    },
    zIndex: 3,
  },
];

export function normalizarCodigo(
  valor: unknown,
  longitud: number,
): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  return /^\d+$/.test(texto) ? texto.padStart(longitud, "0") : texto;
}
