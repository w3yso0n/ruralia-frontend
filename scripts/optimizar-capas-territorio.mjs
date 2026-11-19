/**
 * Prepara las capas territoriales del equipo para el mapa de Contrapartes > Territorio.
 *
 * Lee los GeoJSON originales (WGS84, exportados de ArcGIS), redondea las
 * coordenadas a 6 decimales (unos 10 cm) y deja solo los atributos que muestra
 * la plataforma. El resultado se escribe en `public/territorio/`.
 *
 * Uso: node scripts/optimizar-capas-territorio.mjs [carpeta-origen]
 * (por defecto `public/territorio/GEOJSON`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ORIGEN = process.argv[2] ?? "public/territorio/GEOJSON";
const DESTINO = "public/territorio";

const CAPAS = [
  {
    entrada: "Departamentos.geojson",
    salida: "departamentos.geojson",
    propiedades: ["DeCodigo", "DeNombre", "DeArea"],
  },
  {
    entrada: "Municipios_ART.geojson",
    salida: "municipios.geojson",
    propiedades: [
      "COD_DANE",
      "NOM_MPIO",
      "NOM_DPTO",
      "NOM_SUBREG",
      "PROYECTO",
      "BPIN",
      "AREA_Ha",
      "NUMERO_VER",
      "UBP_TOTAL",
      "UBP_ACTIVA",
    ],
  },
  {
    entrada: "Veredas_ART_Priorizadas.geojson",
    salida: "veredas.geojson",
    propiedades: [
      "COD_VERE",
      "NOM_VERE",
      "NOM_MPIO",
      "NOM_DPTO",
      "NOM_SUBREG",
      "NOMBRE_UBP",
      "PROYECTO",
      "ESTADO",
      "FOCAL_MGA",
      "FUENTE",
      "AREA_Ha",
    ],
  },
  {
    entrada: "Vias.geojson",
    salida: "vias.geojson",
    propiedades: ["TIPO_VIA", "ESTADO_SUP", "NUMERO_CAR", "ACCESIBILI", "PROYECTO"],
  },
];

const redondear = (c) =>
  typeof c[0] === "number"
    ? [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6]
    : c.map(redondear);

/** Quita textos vacíos y marcadores de "sin dato" para no mostrarlos en el detalle. */
function limpiar(valor) {
  if (typeof valor !== "string") return valor ?? undefined;
  const texto = valor.trim();
  if (!texto || /^sin (valor|dato)$/i.test(texto)) return undefined;
  return texto;
}

for (const capa of CAPAS) {
  const coleccion = JSON.parse(readFileSync(join(ORIGEN, capa.entrada), "utf8"));
  const features = coleccion.features
    .filter((f) => f.geometry)
    .map((f) => {
      const properties = {};
      for (const p of capa.propiedades) {
        const valor = limpiar(f.properties?.[p]);
        if (valor !== undefined) properties[p] = valor;
      }
      return {
        type: "Feature",
        properties,
        geometry: { type: f.geometry.type, coordinates: redondear(f.geometry.coordinates) },
      };
    });
  const texto = JSON.stringify({ type: "FeatureCollection", features });
  writeFileSync(join(DESTINO, capa.salida), texto);
  console.log(`${capa.salida}: ${features.length} elementos, ${(texto.length / 1e6).toFixed(1)} MB`);
}
