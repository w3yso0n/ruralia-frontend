"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  FolderKanban,
  Layers,
  LoaderCircle,
  MapPin,
  MapPinOff,
  Search,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { listarTerritorioBeneficiarios } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  GOOGLE_MAP_ID,
  CENTRO_COLOMBIA,
  cargarGoogleMapsDashboard,
  crearContenidoMarcadorCircular,
  crearContenidoMarcadorPin,
} from "@/lib/google-maps";
import { separarUbicacionPorRevisar } from "@/lib/territorio/candidatos-ubicacion";
import {
  RevisionUbicaciones,
  type ItemRevision,
} from "@/components/territorio/revision-ubicaciones";
import {
  CAPAS_TERRITORIALES,
  normalizarCodigo,
  type CapaTerritorial,
  type NivelCapaTerritorial,
} from "@/lib/territorio/capas";
import {
  cajaDe,
  puntoEnGeometria,
  type Caja,
  type ColeccionTerritorial,
  type FeatureTerritorial,
} from "@/lib/territorio/geometria";
import { SelectorDesplegable } from "@/components/ui/selector-desplegable";
import type {
  Beneficiario,
  EstadoProyecto,
  ProyectoTerritorio,
  PuntoTerritorioBeneficiario,
} from "@/lib/types";

type TipoMapaBase = "roadmap" | "terrain" | "satellite" | "hybrid";

const TIPOS_MAPA: { valor: TipoMapaBase; etiqueta: string }[] = [
  { valor: "roadmap", etiqueta: "Mapa" },
  { valor: "terrain", etiqueta: "Relieve" },
  { valor: "satellite", etiqueta: "Satélite" },
  { valor: "hybrid", etiqueta: "Híbrido" },
];

const COLOR_SELECCION = "#121C2D";
/** Valor del filtro para beneficiarios que no están activos en ningún proyecto. */
const SIN_PROYECTO = "__sin_proyecto__";

const ETIQUETA_ESTADO_PROYECTO: Record<EstadoProyecto, string> = {
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  COMPLETADO: "Completado",
  BORRADOR: "Borrador",
};
const COLOR_REVISION = "#d97706";
const MAX_LISTA = 100;
/** Precisión de GPS (metros) a partir de la cual la ubicación se marca dudosa. */
const PRECISION_GPS_DUDOSA_M = 100;

/** Por qué una ubicación original no se pudo leer (solo orienta a quien revisa). */
function motivoIlegible(latitud: string | null, longitud: string | null): string {
  if (!latitud || !longitud) return "Falta la latitud o la longitud";
  if ([latitud, longitud].some((t) => /^\s*-?\d{3,}\s*$/.test(t))) {
    return "Número sin separador decimal: no se puede saber dónde va el punto";
  }
  const lat = Number(latitud.replace(",", ".").replace(/[NS\s]/gi, ""));
  if (Number.isFinite(lat) && (lat < -4.3 || lat > 13.6)) {
    return "Latitud imposible para Colombia";
  }
  return "Formato no reconocido";
}

interface PoligonoIndexado {
  codigo: string;
  nombre: string;
  propiedades: Record<string, unknown>;
  feature: FeatureTerritorial;
  caja: Caja;
}

interface Seleccion {
  nivel: NivelCapaTerritorial;
  codigo: string;
}

/** Por beneficiario: código del polígono que lo contiene en cada capa. */
type UbicacionPorCapa = Partial<Record<NivelCapaTerritorial, string | null>>;

function capaPorId(id: NivelCapaTerritorial): CapaTerritorial {
  return CAPAS_TERRITORIALES.find((c) => c.id === id)!;
}

function tieneCoordenadas(
  p: PuntoTerritorioBeneficiario,
): p is PuntoTerritorioBeneficiario & { latitud: number; longitud: number } {
  return (
    typeof p.latitud === "number" &&
    typeof p.longitud === "number" &&
    Number.isFinite(p.latitud) &&
    Number.isFinite(p.longitud)
  );
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nombreCompleto(p: PuntoTerritorioBeneficiario): string {
  return `${p.nombres} ${p.apellidos}`.trim();
}

interface MapaTerritorioBeneficiariosProps {
  /** Puede corregir o confirmar ubicaciones (contrapartes.editar). */
  puedeGestionar?: boolean;
}

export function MapaTerritorioBeneficiarios({
  puedeGestionar = false,
}: MapaTerritorioBeneficiariosProps) {
  const { token } = useAuth();

  const contenedorRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<google.maps.Map | null>(null);
  const capasDataRef = useRef<Partial<Record<NivelCapaTerritorial, google.maps.Data>>>({});
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const encuadradoRef = useRef(false);
  const marcadorRevisionRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const [mapaListo, setMapaListo] = useState(false);
  const [errorMapa, setErrorMapa] = useState<string | null>(null);

  const [puntos, setPuntos] = useState<PuntoTerritorioBeneficiario[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoTerritorio[]>([]);
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [cargandoPuntos, setCargandoPuntos] = useState(true);
  const [errorPuntos, setErrorPuntos] = useState<string | null>(null);

  const [colecciones, setColecciones] = useState<
    Partial<Record<NivelCapaTerritorial, ColeccionTerritorial>>
  >({});
  const [erroresCapas, setErroresCapas] = useState<
    Partial<Record<NivelCapaTerritorial, string>>
  >({});

  const [visibles, setVisibles] = useState<Record<NivelCapaTerritorial, boolean>>({
    departamento: true,
    municipio: true,
    vereda: true,
  });
  const [mostrarBeneficiarios, setMostrarBeneficiarios] = useState(true);
  const [tipoMapa, setTipoMapa] = useState<TipoMapaBase>("roadmap");
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [busqueda, setBusqueda] = useState("");

  /* ---------- Carga de datos ---------- */

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    listarTerritorioBeneficiarios(token)
      .then((datos) => {
        if (!cancelado) {
          setPuntos(datos.beneficiarios);
          setProyectos(datos.proyectos);
          setErrorPuntos(null);
        }
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorPuntos(
            err instanceof Error ? err.message : "No se pudieron cargar los beneficiarios",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoPuntos(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelado = false;
    for (const capa of CAPAS_TERRITORIALES) {
      if (!capa.archivo) continue;
      fetch(capa.archivo)
        .then((r) => {
          if (!r.ok) throw new Error(`No se encontró ${capa.archivo}`);
          return r.json() as Promise<ColeccionTerritorial>;
        })
        .then((coleccion) => {
          if (!cancelado) setColecciones((prev) => ({ ...prev, [capa.id]: coleccion }));
        })
        .catch((err) => {
          if (!cancelado) {
            setErroresCapas((prev) => ({
              ...prev,
              [capa.id]: err instanceof Error ? err.message : "Error al leer la capa",
            }));
          }
        });
    }
    return () => {
      cancelado = true;
    };
  }, []);

  /* ---------- Índices y cruce beneficiario / capa ---------- */

  const indices = useMemo(() => {
    const resultado: Partial<Record<NivelCapaTerritorial, PoligonoIndexado[]>> = {};
    for (const capa of CAPAS_TERRITORIALES) {
      const coleccion = colecciones[capa.id];
      if (!coleccion) continue;
      resultado[capa.id] = coleccion.features
        .filter((f) => f.geometry)
        .map((f) => {
          const propiedades = f.properties ?? {};
          return {
            codigo:
              normalizarCodigo(propiedades[capa.propiedadCodigo], capa.longitudCodigo) ??
              String(f.id ?? ""),
            nombre: String(propiedades[capa.propiedadNombre] ?? "Sin nombre"),
            propiedades,
            feature: f,
            caja: cajaDe(f.geometry!),
          };
        });
    }
    return resultado;
  }, [colecciones]);

  /** Beneficiarios que pasan el filtro de proyecto; todo lo demás se calcula sobre estos. */
  const puntosFiltrados = useMemo(() => {
    if (!proyectoFiltro) return puntos;
    if (proyectoFiltro === SIN_PROYECTO) {
      return puntos.filter((p) => p.proyectoIds.length === 0);
    }
    return puntos.filter((p) => p.proyectoIds.includes(proyectoFiltro));
  }, [puntos, proyectoFiltro]);

  const opcionesProyecto = useMemo(() => {
    const conteo = new Map<string, number>();
    let sinProyecto = 0;
    for (const p of puntos) {
      if (p.proyectoIds.length === 0) sinProyecto += 1;
      for (const id of p.proyectoIds) conteo.set(id, (conteo.get(id) ?? 0) + 1);
    }
    return [
      ...proyectos.map((pr) => ({
        id: pr.id,
        nombre: pr.nombre,
        subtitulo: `${ETIQUETA_ESTADO_PROYECTO[pr.estado] ?? pr.estado} · ${conteo.get(pr.id) ?? 0} beneficiarios`,
      })),
      ...(sinProyecto > 0
        ? [
            {
              id: SIN_PROYECTO,
              nombre: "Sin proyecto",
              subtitulo: `${sinProyecto} beneficiarios no activos en ningún proyecto`,
            },
          ]
        : []),
    ];
  }, [puntos, proyectos]);

  const conCoordenadas = useMemo(
    () => puntosFiltrados.filter(tieneCoordenadas),
    [puntosFiltrados],
  );

  const ubicaciones = useMemo(() => {
    const mapa = new Map<string, UbicacionPorCapa>();
    for (const p of conCoordenadas) {
      const ubicacion: UbicacionPorCapa = {};
      for (const capa of CAPAS_TERRITORIALES) {
        const poligonos = indices[capa.id];
        if (!poligonos) continue;
        const contenedor = poligonos.find((pol) =>
          puntoEnGeometria(p.longitud, p.latitud, pol.feature.geometry!, pol.caja),
        );
        ubicacion[capa.id] = contenedor?.codigo ?? null;
      }
      mapa.set(p.id, ubicacion);
    }
    return mapa;
  }, [conCoordenadas, indices]);

  const resumenCapas = useMemo(() => {
    return CAPAS_TERRITORIALES.filter((c) => indices[c.id]).map((capa) => {
      const conteo = new Map<string, number>();
      let fuera = 0;
      let discrepancias = 0;
      for (const p of conCoordenadas) {
        const codigo = ubicaciones.get(p.id)?.[capa.id] ?? null;
        if (!codigo) {
          fuera += 1;
          continue;
        }
        conteo.set(codigo, (conteo.get(codigo) ?? 0) + 1);
        const registrado = normalizarCodigo(capa.codigoBeneficiario(p), capa.longitudCodigo);
        if (registrado && registrado !== codigo) discrepancias += 1;
      }
      const poligonos = [...indices[capa.id]!]
        .map((pol) => ({ ...pol, beneficiarios: conteo.get(pol.codigo) ?? 0 }))
        .sort((a, b) => b.beneficiarios - a.beneficiarios || a.nombre.localeCompare(b.nombre));
      return { capa, poligonos, fuera, discrepancias };
    });
  }, [indices, conCoordenadas, ubicaciones]);

  const poligonoSeleccionado = useMemo(() => {
    if (!seleccion) return null;
    return indices[seleccion.nivel]?.find((p) => p.codigo === seleccion.codigo) ?? null;
  }, [seleccion, indices]);

  const beneficiariosSeleccion = useMemo(() => {
    if (!seleccion) return [];
    return conCoordenadas.filter(
      (p) => ubicaciones.get(p.id)?.[seleccion.nivel] === seleccion.codigo,
    );
  }, [seleccion, conCoordenadas, ubicaciones]);

  const beneficiariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return beneficiariosSeleccion;
    return beneficiariosSeleccion.filter((p) =>
      [nombreCompleto(p), p.numeroDocumento, p.veredaNombre, p.lineaProductiva]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termino)),
    );
  }, [beneficiariosSeleccion, busqueda]);

  /* ---------- Revisión de ubicaciones ilegibles o dudosas ---------- */

  const nombrePorCodigo = useMemo(() => {
    const resultado: Partial<Record<NivelCapaTerritorial, Map<string, string>>> = {};
    for (const capa of CAPAS_TERRITORIALES) {
      const poligonos = indices[capa.id];
      if (poligonos) resultado[capa.id] = new Map(poligonos.map((p) => [p.codigo, p.nombre]));
    }
    return resultado;
  }, [indices]);

  const itemsRevision = useMemo<ItemRevision[]>(() => {
    const lista: ItemRevision[] = [];
    for (const p of puntosFiltrados) {
      const original = p.ubicacionPorRevisar
        ? separarUbicacionPorRevisar(p.ubicacionPorRevisar)
        : { latitud: p.latitudOriginal, longitud: p.longitudOriginal };

      if (!tieneCoordenadas(p)) {
        if (original.latitud || original.longitud) {
          lista.push({
            punto: p,
            tipo: "ilegible",
            motivos: [motivoIlegible(original.latitud, original.longitud)],
            latitudTexto: original.latitud,
            longitudTexto: original.longitud,
          });
        }
        continue;
      }
      if (p.ubicacionConfirmada) continue;

      const motivos: string[] = [];
      const ubicacion = ubicaciones.get(p.id);
      if (indices.departamento && !ubicacion?.departamento) {
        motivos.push("Fuera de los límites del equipo: ningún departamento la contiene");
      }
      for (const capa of CAPAS_TERRITORIALES) {
        const contenedor = ubicacion?.[capa.id];
        const registrado = normalizarCodigo(capa.codigoBeneficiario(p), capa.longitudCodigo);
        if (!contenedor || !registrado || contenedor === registrado) continue;
        const nombres = nombrePorCodigo[capa.id];
        const singular = capa.nombre.replace(/s$/, "").toLowerCase();
        motivos.push(
          `Registrado en el ${singular} ${nombres?.get(registrado) ?? registrado}, pero el punto cae en ${nombres?.get(contenedor) ?? contenedor}`,
        );
      }
      if (
        p.ubicacionOrigenGps === "ULTIMA_CONOCIDA" ||
        p.ubicacionOrigenGps === "ULTIMA_REGISTRADA"
      ) {
        motivos.push("El GPS no fue una lectura en vivo (última posición guardada en el teléfono)");
      }
      if (
        p.ubicacionPrecisionMetros != null &&
        p.ubicacionPrecisionMetros > PRECISION_GPS_DUDOSA_M
      ) {
        motivos.push(`GPS con precisión baja (± ${Math.round(p.ubicacionPrecisionMetros)} m)`);
      }
      if (motivos.length) {
        lista.push({
          punto: p,
          tipo: "dudosa",
          motivos,
          latitudTexto: original.latitud,
          longitudTexto: original.longitud,
        });
      }
    }
    return lista;
  }, [puntosFiltrados, ubicaciones, indices, nombrePorCodigo]);

  const describirPunto = useCallback(
    (latitud: number, longitud: number) => {
      const partes: string[] = [];
      for (const capa of CAPAS_TERRITORIALES) {
        const contenedor = indices[capa.id]?.find((pol) =>
          puntoEnGeometria(longitud, latitud, pol.feature.geometry!, pol.caja),
        );
        if (contenedor) partes.push(contenedor.nombre);
      }
      return partes.length ? partes.join(" · ") : null;
    },
    [indices],
  );

  const verEnMapa = useCallback((latitud: number, longitud: number) => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    const posicion = { lat: latitud, lng: longitud };
    if (marcadorRevisionRef.current) {
      marcadorRevisionRef.current.position = posicion;
      marcadorRevisionRef.current.map = mapa;
    } else {
      void cargarGoogleMapsDashboard().then(({ AdvancedMarkerElement }) => {
        marcadorRevisionRef.current = new AdvancedMarkerElement({
          map: mapa,
          position: posicion,
          title: "Punto en revisión",
          zIndex: 50,
          content: crearContenidoMarcadorPin(COLOR_REVISION),
        });
      });
    }
    mapa.panTo(posicion);
    mapa.setZoom(Math.max(mapa.getZoom() ?? 0, 13));
    contenedorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const alActualizarUbicacion = useCallback((id: string, b: Beneficiario) => {
    setPuntos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              latitud: b.latitud ?? null,
              longitud: b.longitud ?? null,
              altitud: b.altitud ?? null,
              ubicacionFuente: b.ubicacionFuente ?? null,
              ubicacionOrigenGps: b.ubicacionOrigenGps ?? null,
              ubicacionPrecisionMetros: b.ubicacionPrecisionMetros ?? null,
              ubicacionConfirmada: Boolean(b.ubicacionConfirmadaEn),
            }
          : p,
      ),
    );
    if (marcadorRevisionRef.current) marcadorRevisionRef.current.map = null;
  }, []);

  /* ---------- Mapa base ---------- */

  useEffect(() => {
    if (!contenedorRef.current) return;
    let cancelado = false;
    const capasData = capasDataRef.current;

    cargarGoogleMapsDashboard()
      .then(({ Map, InfoWindow }) => {
        if (cancelado || !contenedorRef.current) return;
        mapaRef.current = new Map(contenedorRef.current, {
          center: CENTRO_COLOMBIA,
          zoom: 6,
          mapId: GOOGLE_MAP_ID,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoRef.current = new InfoWindow();
        setMapaListo(true);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorMapa(err instanceof Error ? err.message : "No se pudo cargar el mapa");
        }
      });

    return () => {
      cancelado = true;
      infoRef.current?.close();
      Object.values(capasData).forEach((data) => data?.setMap(null));
      if (marcadorRevisionRef.current) marcadorRevisionRef.current.map = null;
    };
  }, []);

  useEffect(() => {
    mapaRef.current?.setMapTypeId(tipoMapa);
  }, [tipoMapa, mapaListo]);

  /* ---------- Capas territoriales (una google.maps.Data por nivel) ---------- */

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapaListo || !mapa) return;

    for (const capa of CAPAS_TERRITORIALES) {
      const coleccion = colecciones[capa.id];
      if (!coleccion || capasDataRef.current[capa.id]) continue;

      const data = new google.maps.Data();
      data.addGeoJson(coleccion);
      data.addListener("click", (evento: google.maps.Data.MouseEvent) => {
        const codigo = normalizarCodigo(
          evento.feature.getProperty(capa.propiedadCodigo),
          capa.longitudCodigo,
        );
        if (codigo) setSeleccion({ nivel: capa.id, codigo });
      });
      capasDataRef.current[capa.id] = data;

      if (capa.id === "departamento" && !encuadradoRef.current) {
        const bounds = new google.maps.LatLngBounds();
        data.forEach((feature) =>
          feature.getGeometry()?.forEachLatLng((ll) => bounds.extend(ll)),
        );
        if (!bounds.isEmpty()) {
          mapa.fitBounds(bounds, 24);
          encuadradoRef.current = true;
        }
      }
    }
  }, [mapaListo, colecciones]);

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapaListo || !mapa) return;

    for (const capa of CAPAS_TERRITORIALES) {
      const data = capasDataRef.current[capa.id];
      if (!data) continue;

      data.setMap(visibles[capa.id] ? mapa : null);
      data.setStyle((feature) => {
        const codigo = normalizarCodigo(
          feature.getProperty(capa.propiedadCodigo),
          capa.longitudCodigo,
        );
        const seleccionado =
          seleccion?.nivel === capa.id && seleccion.codigo === codigo;
        return {
          strokeColor: seleccionado ? COLOR_SELECCION : capa.estilo.borde,
          strokeWeight: seleccionado ? capa.estilo.grosorBorde + 1.5 : capa.estilo.grosorBorde,
          strokeOpacity: 0.9,
          fillColor: seleccionado ? COLOR_SELECCION : capa.estilo.relleno,
          fillOpacity: seleccionado
            ? Math.max(capa.estilo.opacidadRelleno, 0.18)
            : capa.estilo.opacidadRelleno,
          zIndex: capa.zIndex,
          clickable: true,
        };
      });
    }
  }, [mapaListo, colecciones, visibles, seleccion]);

  /* ---------- Beneficiarios (un marcador por ubicación compartida) ---------- */

  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapaListo || !mapa || !mostrarBeneficiarios || conCoordenadas.length === 0) {
      return;
    }

    const grupos = new Map<string, typeof conCoordenadas>();
    for (const p of conCoordenadas) {
      const clave = `${p.latitud.toFixed(6)},${p.longitud.toFixed(6)}`;
      const grupo = grupos.get(clave);
      if (grupo) grupo.push(p);
      else grupos.set(clave, [p]);
    }

    const marcadores: google.maps.marker.AdvancedMarkerElement[] = [];
    let cancelado = false;

    cargarGoogleMapsDashboard().then(({ AdvancedMarkerElement }) => {
      if (cancelado) return;
      for (const grupo of grupos.values()) {
        const primero = grupo[0];
        const total = grupo.length;
        const marcador = new AdvancedMarkerElement({
          map: mapa,
          position: { lat: primero.latitud, lng: primero.longitud },
          title: `Ubicación del predio · ${total} beneficiario(s)`,
          zIndex: 10,
          content: crearContenidoMarcadorCircular("#42827A", {
            etiqueta: total > 1 ? String(total > 99 ? "99+" : total) : undefined,
            tamano: total > 1 ? 26 : 16,
          }),
        });
        marcador.addListener("click", () => {
          const lista = grupo
            .slice(0, 15)
            .map(
              (p) =>
                `<li style="margin-bottom:2px">${escaparHtml(nombreCompleto(p))}<span style="color:#71717a"> · ${escaparHtml(p.numeroDocumento)}</span></li>`,
            )
            .join("");
          const resto = total > 15 ? `<p style="margin:4px 0 0;color:#71717a">y ${total - 15} más</p>` : "";
          const lugar = [primero.veredaNombre, primero.municipioNombre, primero.departamentoNombre]
            .filter(Boolean)
            .map((v) => escaparHtml(String(v)))
            .join(", ");
          infoRef.current?.setContent(`
            <div style="font-family:system-ui;max-width:280px;padding:2px;font-size:12px">
              <p style="font-weight:600;margin:0 0 2px;font-size:13px">${total} beneficiario(s) en este punto</p>
              <p style="color:#71717a;margin:0 0 2px">${primero.latitud.toFixed(5)}, ${primero.longitud.toFixed(5)}${primero.altitud != null ? ` · ${primero.altitud} m s. n. m.` : ""}</p>
              <p style="color:#71717a;margin:0 0 6px">Vereda registrada: ${lugar || "sin vereda"}</p>
              <ul style="margin:0;padding-left:16px">${lista}</ul>${resto}
            </div>`);
          infoRef.current?.open({ map: mapa, anchor: marcador });
        });
        marcadores.push(marcador);
      }
    });

    return () => {
      cancelado = true;
      infoRef.current?.close();
      marcadores.forEach((m) => {
        m.map = null;
      });
    };
  }, [mapaListo, mostrarBeneficiarios, conCoordenadas]);

  const encuadrarSeleccion = useCallback(() => {
    if (!poligonoSeleccionado || !mapaRef.current) return;
    const { caja } = poligonoSeleccionado;
    mapaRef.current.fitBounds(
      {
        north: caja.maxLat,
        south: caja.minLat,
        east: caja.maxLng,
        west: caja.minLng,
      },
      32,
    );
  }, [poligonoSeleccionado]);

  const sinUbicacion = puntosFiltrados.length - conCoordenadas.length;

  /** Al elegir un proyecto, encuadra el mapa en sus beneficiarios. */
  function cambiarProyecto(id: string) {
    setProyectoFiltro(id);
    setSeleccion(null);
    setBusqueda("");
    const mapa = mapaRef.current;
    if (!mapa || !id) return;
    const lista = puntos.filter(
      (p) =>
        tieneCoordenadas(p) &&
        (id === SIN_PROYECTO ? p.proyectoIds.length === 0 : p.proyectoIds.includes(id)),
    ) as Array<PuntoTerritorioBeneficiario & { latitud: number; longitud: number }>;
    if (lista.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of lista) bounds.extend({ lat: p.latitud, lng: p.longitud });
    mapa.fitBounds(bounds, 48);
  }
  const capaSeleccion = seleccion ? capaPorId(seleccion.nivel) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Panel lateral */}
      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-ruralia-teal" />
            <h3 className="text-sm font-semibold text-zinc-900">Proyecto</h3>
          </div>
          <SelectorDesplegable
            value={proyectoFiltro}
            onChange={cambiarProyecto}
            opciones={opcionesProyecto}
            permitirVacio
            etiquetaVacio="Todos los proyectos"
            placeholder="Todos los proyectos"
            disabled={cargandoPuntos}
            mensajeSinOpciones="No hay proyectos con beneficiarios"
          />
          <p className="mt-2 text-[11px] text-zinc-500">
            Cuenta solo a los beneficiarios activos en el proyecto (no los
            reemplazados). Mapa, conteos y revisión se filtran juntos.
          </p>
        </section>

        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-ruralia-teal" />
            <h3 className="text-sm font-semibold text-zinc-900">Capas</h3>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Límites definidos por el equipo con base en PDET. Puedes ver varias
            capas al mismo tiempo.
          </p>

          <ul className="flex flex-col gap-2">
            {CAPAS_TERRITORIALES.map((capa) => {
              const disponible = Boolean(capa.archivo);
              const cargada = Boolean(colecciones[capa.id]);
              const error = erroresCapas[capa.id];
              return (
                <li key={capa.id}>
                  <label
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                      disponible
                        ? "cursor-pointer border-zinc-200 bg-white hover:border-ruralia-teal-border"
                        : "cursor-not-allowed border-dashed border-zinc-200 bg-zinc-50 text-zinc-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-ruralia-teal"
                      disabled={!cargada}
                      checked={cargada && visibles[capa.id]}
                      onChange={(e) =>
                        setVisibles((prev) => ({ ...prev, [capa.id]: e.target.checked }))
                      }
                    />
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm border-2"
                      style={{
                        borderColor: capa.estilo.borde,
                        backgroundColor: disponible ? `${capa.estilo.relleno}33` : "transparent",
                      }}
                    />
                    <span className="flex-1 font-medium">{capa.nombre}</span>
                    {!disponible ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                        Pendiente
                      </span>
                    ) : error ? (
                      <TriangleAlert className="h-4 w-4 text-amber-600" aria-label={error} />
                    ) : !cargada ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-ruralia-teal" />
                    ) : (
                      <span className="text-xs text-zinc-500">
                        {indices[capa.id]?.length ?? 0}
                      </span>
                    )}
                  </label>
                </li>
              );
            })}

            <li className="mt-1 border-t border-zinc-100 pt-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:border-ruralia-teal-border">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-ruralia-teal"
                  checked={mostrarBeneficiarios}
                  onChange={(e) => setMostrarBeneficiarios(e.target.checked)}
                />
                <span className="h-3 w-3 shrink-0 rounded-full bg-ruralia-teal" />
                <span className="flex-1 font-medium">Beneficiarios</span>
                {cargandoPuntos ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-ruralia-teal" />
                ) : (
                  <span className="text-xs text-zinc-500">{conCoordenadas.length}</span>
                )}
              </label>
            </li>
          </ul>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-zinc-500">Mapa base</p>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1">
              {TIPOS_MAPA.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipoMapa(t.valor)}
                  className={`rounded-lg px-1 py-1 text-xs font-medium transition ${
                    tipoMapa === t.valor
                      ? "bg-white text-ruralia-teal-text shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  {t.etiqueta}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-ruralia-teal" />
            <h3 className="text-sm font-semibold text-zinc-900">Ubicación de beneficiarios</h3>
          </div>

          {errorPuntos ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorPuntos}
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-ruralia-teal-soft p-2">
                <dt className="text-[11px] text-ruralia-teal-text">En el mapa</dt>
                <dd className="text-lg font-semibold text-zinc-900">{conCoordenadas.length}</dd>
              </div>
              <div className="rounded-xl bg-zinc-50 p-2">
                <dt className="flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                  <MapPinOff className="h-3 w-3" /> Sin ubicación
                </dt>
                <dd className="text-lg font-semibold text-zinc-900">{sinUbicacion}</dd>
              </div>
            </dl>
          )}
          {itemsRevision.length > 0 ? (
            <a
              href="#revision-ubicaciones"
              className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="h-3.5 w-3.5" />
                Ubicaciones por revisar
              </span>
              <span className="font-semibold">{itemsRevision.length}</span>
            </a>
          ) : null}
          <p className="mt-2 text-[11px] text-zinc-500">
            Cada punto es la ubicación propia del beneficiario (su predio), no la de
            su vereda. Quien no la tiene registrada no aparece en el mapa.
          </p>

          {resumenCapas.map(({ capa, poligonos, fuera, discrepancias }) => (
            <div key={capa.id} className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Por {capa.nombre.toLowerCase()}
              </p>
              <ul className="max-h-56 divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200">
                {poligonos.map((pol) => {
                  const activo =
                    seleccion?.nivel === capa.id && seleccion.codigo === pol.codigo;
                  return (
                    <li key={pol.codigo}>
                      <button
                        type="button"
                        onClick={() => setSeleccion({ nivel: capa.id, codigo: pol.codigo })}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                          activo
                            ? "bg-ruralia-teal-soft text-ruralia-teal-text"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <span className="truncate">{pol.nombre}</span>
                        <span className="shrink-0 text-xs font-semibold">
                          {pol.beneficiarios}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {fuera > 0 || discrepancias > 0 ? (
                <div className="mt-2 flex flex-col gap-1 text-[11px] text-amber-800">
                  {fuera > 0 ? (
                    <p className="flex items-start gap-1">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                      {fuera} fuera de los límites de esta capa.
                    </p>
                  ) : null}
                  {discrepancias > 0 ? (
                    <p className="flex items-start gap-1">
                      <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                      {discrepancias} con código registrado distinto al polígono que
                      los contiene.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      </div>

      {/* Mapa y detalle */}
      <div className="flex min-w-0 flex-col gap-4">
        <section className="relative overflow-hidden rounded-2xl border border-ruralia-teal-border bg-white">
          {!mapaListo && !errorMapa ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-50/80">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-ruralia-teal-border border-t-ruralia-teal" />
            </div>
          ) : null}
          {errorMapa ? (
            <div className="m-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Mapa no disponible</p>
                <p className="mt-0.5 text-xs opacity-90">{errorMapa}</p>
              </div>
            </div>
          ) : null}
          <div
            ref={contenedorRef}
            className="h-130 w-full bg-zinc-100 lg:h-160"
            aria-label="Mapa de territorio de beneficiarios"
          />
        </section>

        {poligonoSeleccionado && capaSeleccion ? (
          <section className="rounded-2xl border border-ruralia-teal-border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ruralia-teal-text">
                  {capaSeleccion.nombre.replace(/s$/, "")}
                </p>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {poligonoSeleccionado.nombre}
                </h3>
                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  {capaSeleccion.propiedadesDetalle.map(({ propiedad, etiqueta }) => {
                    const valor = poligonoSeleccionado.propiedades[propiedad];
                    if (valor === null || valor === undefined || valor === "") return null;
                    return (
                      <div key={propiedad} className="flex gap-1">
                        <dt>{etiqueta}:</dt>
                        <dd className="font-medium text-zinc-700">
                          {typeof valor === "number"
                            ? valor.toLocaleString("es-CO", { maximumFractionDigits: 1 })
                            : String(valor)}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={encuadrarSeleccion}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-ruralia-teal-border hover:text-ruralia-teal-text"
                >
                  <Crosshair className="h-3.5 w-3.5" /> Centrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeleccion(null);
                    setBusqueda("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  <X className="h-3.5 w-3.5" /> Cerrar
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-900">
                {beneficiariosSeleccion.length} beneficiario(s) dentro del límite
              </p>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, documento..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-ruralia-teal focus:ring-2 focus:ring-ruralia-teal/20"
                />
              </div>
            </div>

            {beneficiariosFiltrados.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No hay beneficiarios ubicados en este polígono.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Beneficiario</th>
                      <th className="px-3 py-2 font-medium">Documento</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Vereda</th>
                      <th className="hidden px-3 py-2 font-medium md:table-cell">Línea productiva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {beneficiariosFiltrados.slice(0, MAX_LISTA).map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 text-zinc-900">{nombreCompleto(p)}</td>
                        <td className="px-3 py-2 text-zinc-600">{p.numeroDocumento}</td>
                        <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                          {p.veredaNombre ?? "-"}
                        </td>
                        <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                          {p.lineaProductiva ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {beneficiariosFiltrados.length > MAX_LISTA ? (
                  <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
                    Mostrando {MAX_LISTA} de {beneficiariosFiltrados.length}. Usa la búsqueda
                    para acotar.
                  </p>
                ) : null}
              </div>
            )}
          </section>
        ) : (
          <p className="rounded-2xl border border-dashed border-ruralia-teal-border bg-white px-4 py-3 text-sm text-zinc-500">
            Haz clic en un polígono del mapa o en la lista lateral para ver los
            beneficiarios que quedan dentro de ese límite.
          </p>
        )}

        {!cargandoPuntos && !errorPuntos ? (
          <RevisionUbicaciones
            items={itemsRevision}
            puedeGestionar={puedeGestionar}
            describirPunto={describirPunto}
            onVer={verEnMapa}
            onActualizado={alActualizarUbicacion}
          />
        ) : null}
      </div>
    </div>
  );
}
