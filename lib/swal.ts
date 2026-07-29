import Swal from "sweetalert2";

const iconoAdvertencia = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 block">
    <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a1 1 0 0 0 .87 1.5h18.62a1 1 0 0 0 .87-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;

const iconoError = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-7 w-7">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
    <path d="M9.5 9.5l5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

const swalRuralia = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  background: "transparent",
  customClass: {
    popup:
      "!rounded-2xl !bg-white !p-6 !shadow-2xl !max-w-md !text-left !font-sans",
    title: "!text-lg !font-semibold !text-zinc-900 !p-0 !mt-1",
    htmlContainer: "!text-sm !text-zinc-600 !mt-2 !mx-0",
    actions: "!mt-6 !gap-2 !w-full",
    confirmButton:
      "!rounded-xl !bg-red-600 !px-4 !py-2 !text-sm !font-semibold !text-white hover:!bg-red-700 focus:!outline-none focus:!ring-2 focus:!ring-red-300",
    denyButton:
      "!rounded-xl !bg-ruralia-teal !px-4 !py-2 !text-sm !font-semibold !text-white hover:!bg-ruralia-teal-hover focus:!outline-none focus:!ring-2 focus:!ring-ruralia-teal-border",
    cancelButton:
      "!rounded-xl !bg-zinc-100 !px-4 !py-2 !text-sm !font-semibold !text-zinc-600 hover:!bg-zinc-200 focus:!outline-none focus:!ring-2 focus:!ring-zinc-300",
  },
});

function iconoHtml(tipo: "advertencia" | "error") {
  const svg = tipo === "advertencia" ? iconoAdvertencia : iconoError;
  const color = tipo === "advertencia" ? "text-amber-500" : "text-red-600";
  const fondo = tipo === "advertencia" ? "bg-amber-50" : "bg-red-50";
  return `<div class="mx-auto mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${fondo} ${color}">${svg}</div>`;
}

export function mostrarErrorApi(
  mensaje: string,
  titulo = "No se pudo completar la acción",
) {
  return swalRuralia.fire({
    title: titulo,
    html: `${iconoHtml("error")}<p>${mensaje}</p>`,
    confirmButtonText: "Entendido",
  });
}

interface OpcionesConfirmarEliminacion {
  titulo: string;
  texto: string;
  textoConfirmar?: string;
}

export async function confirmarEliminacionSimple({
  titulo,
  texto,
  textoConfirmar = "Sí, eliminar",
}: OpcionesConfirmarEliminacion): Promise<boolean> {
  const resultado = await swalRuralia.fire({
    title: titulo,
    html: `${iconoHtml("advertencia")}<p>${texto}</p>`,
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: "Cancelar",
  });
  return resultado.isConfirmed;
}

interface OpcionesBloqueoConForzado {
  mensajeBloqueo: string;
  titulo: string;
  textoEliminarTodosModos?: string;
}

/**
 * Muestra el motivo por el que el backend bloqueó el borrado y ofrece
 * "eliminar de todos modos". Si el usuario acepta, pide una segunda
 * confirmación explícita antes de devolver true.
 */
export async function confirmarEliminacionForzada({
  mensajeBloqueo,
  titulo,
  textoEliminarTodosModos = "Eliminar de todos modos",
}: OpcionesBloqueoConForzado): Promise<boolean> {
  const primerPaso = await swalRuralia.fire({
    title: titulo,
    html: `${iconoHtml("advertencia")}<p>${mensajeBloqueo}</p>`,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: textoEliminarTodosModos,
    denyButtonText: "Cancelar jornada en su lugar",
    cancelButtonText: "Cerrar",
  });

  if (!primerPaso.isConfirmed) {
    return false;
  }

  const segundoPaso = await swalRuralia.fire({
    title: "¿Estás totalmente seguro?",
    html: `${iconoHtml("error")}<p>Se eliminarán todas las evidencias de avances (formularios y unidades) registradas en esta jornada. Esta acción no se puede deshacer.</p>`,
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar todo",
    cancelButtonText: "Cancelar",
    focusCancel: true,
  });

  return segundoPaso.isConfirmed;
}
