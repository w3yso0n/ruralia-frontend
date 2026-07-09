let mapsPromise: Promise<typeof google> | null = null;
let mapsBasePromise: Promise<typeof google> | null = null;

function crearScriptMaps(
  libraries: string[],
  cacheKey: "places" | "base",
): Promise<typeof google> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no configurada"));
  }

  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google);
  }

  const scriptId =
    cacheKey === "places" ? "google-maps-js" : "google-maps-js-base";
  const existente = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (existente) {
    return new Promise((resolve, reject) => {
      existente.addEventListener("load", () => resolve(window.google));
      existente.addEventListener("error", () =>
        reject(new Error("No se pudo cargar Google Maps")),
      );
    });
  }

  const libsQuery =
    libraries.length > 0 ? `&libraries=${libraries.join(",")}` : "";

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}${libsQuery}&language=es&region=CO`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps"));
    document.head.appendChild(script);
  });
}

/** Carga Maps con Places (autocomplete de veredas). */
export function cargarGoogleMaps(): Promise<typeof google> {
  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!mapsPromise) {
    mapsPromise = crearScriptMaps(["places"], "places");
  }

  return mapsPromise;
}

/** Carga Maps básico para visualización (marcadores, polilíneas). */
export function cargarGoogleMapsBase(): Promise<typeof google> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!mapsBasePromise) {
    mapsBasePromise = crearScriptMaps([], "base");
  }

  return mapsBasePromise;
}

export function parseGooglePlace(
  place: google.maps.places.PlaceResult,
): {
  nombreVereda: string;
  municipio?: string;
  departamento?: string;
  corregimiento?: string;
  placeId?: string;
  latitud?: number;
  longitud?: number;
} {
  const componentes = place.address_components ?? [];
  const obtener = (tipo: string) =>
    componentes.find((c) => c.types.includes(tipo))?.long_name;

  const departamento = obtener("administrative_area_level_1")
    ?.replace(/^Departamento de /i, "")
    .replace(/^Departamento del /i, "")
    .trim();
  const municipio =
    obtener("administrative_area_level_2") ||
    obtener("locality") ||
    obtener("administrative_area_level_3");
  const corregimiento =
    obtener("administrative_area_level_3") ||
    obtener("sublocality_level_1") ||
    obtener("sublocality");
  const localidad =
    obtener("neighborhood") ||
    obtener("sublocality_level_2") ||
    obtener("route");

  let nombreVereda = (place.name ?? "").trim();
  if (!nombreVereda || nombreVereda.toLowerCase() === municipio?.toLowerCase()) {
    nombreVereda = localidad || corregimiento || place.name || "Localidad rural";
  }
  nombreVereda = nombreVereda.replace(/^vereda\s+/i, "").trim();

  return {
    nombreVereda,
    municipio,
    departamento,
    corregimiento:
      corregimiento && corregimiento !== municipio ? corregimiento : undefined,
    placeId: place.place_id,
    latitud: place.geometry?.location?.lat(),
    longitud: place.geometry?.location?.lng(),
  };
}
