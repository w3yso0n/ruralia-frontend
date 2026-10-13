import type { EstadoJornada } from "@/lib/types";

const ESTILOS_ESTADO: Record<EstadoJornada, string> = {
  PLANIFICADA: "bg-zinc-100 text-zinc-600",
  EN_PROGRESO: "bg-amber-50 text-amber-800",
  COMPLETADA: "bg-ruralia-teal-soft text-ruralia-teal-text",
  CANCELADA: "bg-red-50 text-red-700",
};

export function etiquetaEstadoJornada(estado: EstadoJornada): string {
  const texto = estado.replace(/_/g, " ").toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function EstadoJornadaPill({
  estado,
  sobreTeal = false,
}: {
  estado: EstadoJornada;
  sobreTeal?: boolean;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        sobreTeal ? "bg-white/20 text-white" : ESTILOS_ESTADO[estado]
      }`}
    >
      {etiquetaEstadoJornada(estado)}
    </span>
  );
}

export function formatearFechaJornada(
  fecha: string,
  formato: "corta" | "larga" = "corta",
): string {
  return new Date(fecha).toLocaleDateString(
    "es-CO",
    formato === "corta"
      ? { day: "numeric", month: "short", year: "numeric" }
      : { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
}
