/**
 * Utilidades geométricas sobre GeoJSON (lon/lat WGS84) para ubicar puntos
 * dentro de los polígonos del equipo sin depender de servicios externos.
 */

type Posicion = number[];
type Anillo = Posicion[];

export interface GeometriaPoligonal {
  type: "Polygon" | "MultiPolygon";
  coordinates: Anillo[] | Anillo[][];
}

export interface FeatureTerritorial {
  type: "Feature";
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: GeometriaPoligonal | null;
}

export interface ColeccionTerritorial {
  type: "FeatureCollection";
  features: FeatureTerritorial[];
}

export interface Caja {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Polígonos de la feature como lista de [anilloExterior, ...huecos]. */
function poligonosDe(geometria: GeometriaPoligonal): Anillo[][] {
  return geometria.type === "Polygon"
    ? [geometria.coordinates as Anillo[]]
    : (geometria.coordinates as Anillo[][]);
}

export function cajaDe(geometria: GeometriaPoligonal): Caja {
  const caja: Caja = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };
  for (const poligono of poligonosDe(geometria)) {
    for (const [lng, lat] of poligono[0] ?? []) {
      if (lng < caja.minLng) caja.minLng = lng;
      if (lng > caja.maxLng) caja.maxLng = lng;
      if (lat < caja.minLat) caja.minLat = lat;
      if (lat > caja.maxLat) caja.maxLat = lat;
    }
  }
  return caja;
}

/** Ray casting: cruces impares con el anillo = punto adentro. */
function puntoEnAnillo(lng: number, lat: number, anillo: Anillo): boolean {
  let adentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      adentro = !adentro;
    }
  }
  return adentro;
}

export function puntoEnGeometria(
  lng: number,
  lat: number,
  geometria: GeometriaPoligonal,
  caja?: Caja,
): boolean {
  if (
    caja &&
    (lng < caja.minLng ||
      lng > caja.maxLng ||
      lat < caja.minLat ||
      lat > caja.maxLat)
  ) {
    return false;
  }
  for (const [exterior, ...huecos] of poligonosDe(geometria)) {
    if (!exterior || !puntoEnAnillo(lng, lat, exterior)) continue;
    if (huecos.some((hueco) => puntoEnAnillo(lng, lat, hueco))) continue;
    return true;
  }
  return false;
}
