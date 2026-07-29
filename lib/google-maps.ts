let bootstrapPromise: Promise<void> | null = null;
let placesPromise: Promise<typeof google> | null = null;
let dashboardPromise: Promise<GoogleMapsDashboardLibs> | null = null;

export const GOOGLE_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export interface GoogleMapsDashboardLibs {
  Map: typeof google.maps.Map;
  InfoWindow: typeof google.maps.InfoWindow;
  LatLngBounds: typeof google.maps.LatLngBounds;
  Polyline: typeof google.maps.Polyline;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
}

const SCRIPT_BOOTSTRAP_ID = "google-maps-js-bootstrap";

function obtenerApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no configurada");
  }
  return apiKey;
}

function mapsTieneImportLibrary(): boolean {
  return typeof window.google?.maps?.importLibrary === "function";
}

function reiniciarPromesasMaps(): void {
  bootstrapPromise = null;
  placesPromise = null;
  dashboardPromise = null;
}

/** Quita cargas viejas (sin loading=async) que rompen importLibrary. */
function limpiarScriptsMapsLegacy(): void {
  document
    .querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]')
    .forEach((script) => script.remove());

  for (const id of [
    SCRIPT_BOOTSTRAP_ID,
    "google-maps-js",
    "google-maps-js-base",
  ]) {
    document.getElementById(id)?.remove();
  }

  reiniciarPromesasMaps();
}

function esperarImportLibrary(intentos = 40, intervaloMs = 50): Promise<void> {
  return new Promise((resolve, reject) => {
    let restantes = intentos;

    const verificar = () => {
      if (mapsTieneImportLibrary()) {
        resolve();
        return;
      }

      restantes -= 1;
      if (restantes <= 0) {
        reject(
          new Error(
            "Google Maps cargó sin importLibrary. Recarga la página (Ctrl+Shift+R).",
          ),
        );
        return;
      }

      window.setTimeout(verificar, intervaloMs);
    };

    verificar();
  });
}

function inyectarScriptMaps(libraries: string[] = []): Promise<void> {
  const libsQuery =
    libraries.length > 0 ? `&libraries=${libraries.join(",")}` : "";

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_BOOTSTRAP_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${obtenerApiKey()}&loading=async&v=weekly${libsQuery}&language=es&region=CO`;
    script.onload = () => {
      void esperarImportLibrary()
        .then(resolve)
        .catch(reject);
    };
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps"));
    document.head.appendChild(script);
  });
}

function asegurarGoogleMapsBootstrap(
  librariesExtra: string[] = [],
): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo está disponible en el cliente"));
  }

  if (mapsTieneImportLibrary()) {
    return Promise.resolve();
  }

  // Maps cargado a la antigua (sin importLibrary) → limpiar y volver a cargar
  if (window.google?.maps) {
    limpiarScriptsMapsLegacy();
  }

  if (!bootstrapPromise) {
    bootstrapPromise = inyectarScriptMaps(librariesExtra);
  }

  return bootstrapPromise;
}

async function importarLibreriaMaps(): Promise<google.maps.MapsLibrary> {
  await asegurarGoogleMapsBootstrap(["marker"]);
  if (!mapsTieneImportLibrary()) {
    throw new Error("Google Maps no expuso importLibrary tras la carga");
  }
  return google.maps.importLibrary("maps");
}

async function importarLibreriaMarker(): Promise<google.maps.MarkerLibrary> {
  await asegurarGoogleMapsBootstrap(["marker"]);
  if (!mapsTieneImportLibrary()) {
    throw new Error("Google Maps no expuso importLibrary tras la carga");
  }
  return google.maps.importLibrary("marker");
}

async function importarLibreriaPlaces(): Promise<google.maps.PlacesLibrary> {
  await asegurarGoogleMapsBootstrap();
  if (!mapsTieneImportLibrary()) {
    throw new Error("Google Maps no expuso importLibrary tras la carga");
  }
  return google.maps.importLibrary("places");
}

/** Carga Maps con Places (autocomplete de veredas). */
export function cargarGoogleMaps(): Promise<typeof google> {
  if (typeof window !== "undefined" && window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (!placesPromise) {
    placesPromise = importarLibreriaPlaces().then(() => window.google);
  }

  return placesPromise;
}

/** Mapa del dashboard: Maps + Advanced Markers. */
export function cargarGoogleMapsDashboard(): Promise<GoogleMapsDashboardLibs> {
  if (!dashboardPromise) {
    dashboardPromise = (async () => {
      await asegurarGoogleMapsBootstrap(["marker"]);

      const [mapsLib, markerLib] = await Promise.all([
        importarLibreriaMaps(),
        importarLibreriaMarker(),
      ]);

      const AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
      if (!AdvancedMarkerElement) {
        throw new Error(
          "La librería marker no expuso AdvancedMarkerElement. Verifica Maps JavaScript API y Map ID.",
        );
      }

      return {
        Map: mapsLib.Map,
        InfoWindow: mapsLib.InfoWindow,
        LatLngBounds: google.maps.LatLngBounds,
        Polyline: mapsLib.Polyline,
        AdvancedMarkerElement,
      };
    })();
  }

  return dashboardPromise;
}

/** @deprecated Usa cargarGoogleMapsDashboard. */
export function cargarGoogleMapsBase(): Promise<GoogleMapsDashboardLibs> {
  return cargarGoogleMapsDashboard();
}

export function crearContenidoMarcadorCircular(
  color: string,
  opciones?: { etiqueta?: string; tamano?: number },
): HTMLDivElement {
  const tamano = opciones?.tamano ?? 22;
  const el = document.createElement("div");
  el.style.width = `${tamano}px`;
  el.style.height = `${tamano}px`;
  el.style.borderRadius = "50%";
  el.style.backgroundColor = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.28)";
  el.style.boxSizing = "border-box";

  if (opciones?.etiqueta) {
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.color = "#ffffff";
    el.style.fontSize = "11px";
    el.style.fontWeight = "600";
    el.style.lineHeight = "1";
    el.textContent = opciones.etiqueta;
  }

  return el;
}

/** Pin clásico (punta abajo) para selección exacta en el mapa. */
export function crearContenidoMarcadorPin(
  color = "#42827A",
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "28px";
  el.style.height = "40px";
  el.style.transform = "translateY(-100%)";
  el.style.cursor = "grab";
  el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.35))";
  el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
  </svg>`;
  return el;
}

export type DatosLugarGoogle = {
  nombreVereda: string;
  municipio?: string;
  departamento?: string;
  corregimiento?: string;
  placeId?: string;
  latitud?: number;
  longitud?: number;
  direccion?: string;
};

type LugarParseable = {
  address_components?: google.maps.GeocoderAddressComponent[];
  geometry?: {
    location?: google.maps.LatLng | google.maps.LatLngLiteral | null;
  } | null;
  name?: string;
  place_id?: string;
  formatted_address?: string;
};

function latLngDeGeometry(
  location?: google.maps.LatLng | google.maps.LatLngLiteral | null,
): { lat?: number; lng?: number } {
  if (!location) return {};
  if (typeof (location as google.maps.LatLng).lat === "function") {
    const latLng = location as google.maps.LatLng;
    return { lat: latLng.lat(), lng: latLng.lng() };
  }
  const literal = location as google.maps.LatLngLiteral;
  return { lat: literal.lat, lng: literal.lng };
}

export function parseGooglePlace(place: LugarParseable): DatosLugarGoogle {
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
    nombreVereda =
      localidad || corregimiento || place.name || "Localidad rural";
  }
  nombreVereda = nombreVereda.replace(/^vereda\s+/i, "").trim();

  const { lat, lng } = latLngDeGeometry(place.geometry?.location);

  return {
    nombreVereda,
    municipio,
    departamento,
    corregimiento:
      corregimiento && corregimiento !== municipio ? corregimiento : undefined,
    placeId: place.place_id,
    latitud: lat,
    longitud: lng,
    direccion: place.formatted_address,
  };
}

/** Centro aproximado de Colombia para mapas de selección. */
export const CENTRO_COLOMBIA = { lat: 4.570868, lng: -74.297333 } as const;

export async function geocodificarInverso(
  latitud: number,
  longitud: number,
): Promise<DatosLugarGoogle | null> {
  await asegurarGoogleMapsBootstrap();
  if (!mapsTieneImportLibrary()) {
    throw new Error("Google Maps no expuso importLibrary tras la carga");
  }

  const { Geocoder } = (await google.maps.importLibrary(
    "geocoding",
  )) as google.maps.GeocodingLibrary;

  const geocoder = new Geocoder();
  const respuesta = await geocoder.geocode({
    location: { lat: latitud, lng: longitud },
    language: "es",
    region: "CO",
  });

  const resultado = respuesta.results?.[0];
  if (!resultado) return null;

  const datos = parseGooglePlace(resultado);
  return {
    ...datos,
    latitud,
    longitud,
  };
}
