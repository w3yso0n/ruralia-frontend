/**
 * Lecturas posibles de una ubicación que llegó ilegible o ambigua (por ejemplo
 * "96991 | 752923"). No decide nada: solo propone opciones para que una
 * persona elija o escriba la correcta en la revisión de Territorio.
 */

type Eje = "latitud" | "longitud";

const LIMITES: Record<Eje, { min: number; max: number }> = {
  latitud: { min: -4.3, max: 13.6 },
  longitud: { min: -82, max: -66.8 },
};

export interface LecturaEje {
  valor: number;
  descripcion: string;
}

export interface CandidatoUbicacion {
  latitud: number;
  longitud: number;
  descripcion: string;
}

function conSigno(valor: number, eje: Eje, hemisferio: string | null, negativo: boolean) {
  const abs = Math.abs(valor);
  if (eje === "latitud") return hemisferio === "S" || negativo ? -abs : abs;
  // En Colombia la longitud siempre es oeste.
  return hemisferio === "E" ? abs : -abs;
}

function enRango(valor: number, eje: Eje) {
  return Number.isFinite(valor) && valor >= LIMITES[eje].min && valor <= LIMITES[eje].max;
}

export function lecturasEje(texto: string | null | undefined, eje: Eje): LecturaEje[] {
  if (!texto) return [];
  let t = texto.trim().toUpperCase();
  if (!t) return [];

  let hemisferio: string | null = null;
  const letra = /([NSEWO])\s*$/.exec(t) ?? /^\s*([NSEWO])/.exec(t);
  if (letra) {
    hemisferio = letra[1];
    t = t.replace(letra[0], "").trim();
  }
  const negativo = t.startsWith("-");
  t = t.replace(/^[-+]/, "").replace(/([.,])\s+(?=\d)/g, "$1");

  const lecturas: LecturaEje[] = [];
  const agregar = (valor: number, descripcion: string) => {
    const v = Math.round(conSigno(valor, eje, hemisferio, negativo) * 1e7) / 1e7;
    if (enRango(v, eje) && !lecturas.some((l) => l.valor === v)) {
      lecturas.push({ valor: v, descripcion });
    }
  };

  if (/^\d+[.,]\d+$/.test(t)) agregar(Number(t.replace(",", ".")), "Tal como está");

  const digitos = t.replace(/\D/g, "");
  if (digitos.length >= 3) {
    for (const k of [1, 2]) {
      if (digitos.length > k) {
        agregar(
          Number(`${digitos.slice(0, k)}.${digitos.slice(k)}`),
          `Punto decimal después del dígito ${k}`,
        );
      }
    }
    // Grados-minutos-segundos sin símbolos: g(g) mm ss
    for (const k of [1, 2]) {
      const resto = digitos.slice(k);
      if (resto.length !== 4) continue;
      const grados = Number(digitos.slice(0, k));
      const minutos = Number(resto.slice(0, 2));
      const segundos = Number(resto.slice(2, 4));
      if (minutos < 60 && segundos < 60) {
        agregar(
          grados + minutos / 60 + segundos / 3600,
          `Grados, minutos y segundos (${grados}° ${minutos}' ${segundos}")`,
        );
      }
    }
  }
  return lecturas;
}

/** Combina las lecturas de cada eje. Máximo 8 opciones. */
export function candidatosUbicacion(
  latitudTexto: string | null | undefined,
  longitudTexto: string | null | undefined,
): CandidatoUbicacion[] {
  const lats = lecturasEje(latitudTexto, "latitud");
  const lngs = lecturasEje(longitudTexto, "longitud");
  const resultado: CandidatoUbicacion[] = [];
  for (const lat of lats) {
    for (const lng of lngs) {
      resultado.push({
        latitud: lat.valor,
        longitud: lng.valor,
        descripcion:
          lat.descripcion === lng.descripcion
            ? lat.descripcion
            : `Latitud: ${lat.descripcion.toLowerCase()} · Longitud: ${lng.descripcion.toLowerCase()}`,
      });
    }
  }
  return resultado.slice(0, 8);
}

/** Separa "lat | lng" (texto guardado de una carga que no se pudo leer). */
export function separarUbicacionPorRevisar(
  texto: string | null | undefined,
): { latitud: string | null; longitud: string | null } {
  if (!texto) return { latitud: null, longitud: null };
  const [lat, lng] = texto.split("|").map((p) => p.trim());
  const limpiar = (v?: string) => (v && v !== "(vacía)" ? v : null);
  return { latitud: limpiar(lat), longitud: limpiar(lng) };
}
