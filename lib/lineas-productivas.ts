/** Marcador temporal para proteger la ñ al quitar acentos (área de uso privado). */
const MARCA_ENE = "\uE000";

/** Misma regla que el backend: sin mayúsculas, acentos ni espacios sobrantes; conserva la ñ. */
export function claveLineaProductiva(valor: string | null | undefined): string {
  const limpio = (valor ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!limpio) return "";
  return limpio
    .replace(/ñ/g, MARCA_ENE)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(MARCA_ENE)
    .join("ñ");
}

export function limpiarNombreLinea(valor: string): string {
  return valor.replace(/\s+/g, " ").trim();
}

export function textoBeneficiarios(total: number): string {
  return `${total.toLocaleString("es-CO")} ${total === 1 ? "beneficiario" : "beneficiarios"}`;
}
