"use client";

interface TarjetaKpiProps {
  etiqueta: string;
  valor: number | string;
  descripcion: string;
  destacado?: boolean;
  tendencia?: string;
}

export function TarjetaKpi({
  etiqueta,
  valor,
  descripcion,
  destacado = false,
  tendencia,
}: TarjetaKpiProps) {
  return (
    <div
      className={`rounded-2xl border p-6 transition ${
        destacado
          ? "border-ruralia-teal-border bg-gradient-to-br from-ruralia-teal to-ruralia-teal-hover text-white shadow-lg shadow-ruralia-navy/10"
          : "border-ruralia-teal-border bg-white shadow-sm"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          destacado ? "text-white/85" : "text-ruralia-teal-text"
        }`}
      >
        {etiqueta}
      </p>
      <p
        className={`mt-2 text-4xl font-bold tracking-tight ${
          destacado ? "text-white" : "text-zinc-900"
        }`}
      >
        {valor}
      </p>
      <p
        className={`mt-1 text-xs ${
          destacado ? "text-white/80" : "text-zinc-500"
        }`}
      >
        {descripcion}
      </p>
      {tendencia ? (
        <p
          className={`mt-2 text-xs font-medium ${
            destacado ? "text-white/85" : "text-ruralia-teal"
          }`}
        >
          {tendencia}
        </p>
      ) : null}
    </div>
  );
}

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case "ACTIVO":
      return "Activo";
    case "BORRADOR":
      return "Borrador";
    case "SUSPENDIDO":
      return "Suspendido";
    case "COMPLETADO":
      return "Completado";
    default:
      return estado;
  }
}

interface ListaProyectosRecientesProps {
  proyectos: Array<{
    id: string;
    nombre: string;
    tipo: string;
    estado: string;
    progresoPorcentaje?: number;
  }>;
}

export function ListaProyectosRecientes({
  proyectos,
}: ListaProyectosRecientesProps) {
  if (proyectos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No hay proyectos activos registrados todavía.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {proyectos.map((proyecto) => (
        <li
          key={proyecto.id}
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900">
              {proyecto.nombre}
            </p>
            <p className="text-sm text-zinc-500">
              {proyecto.tipo.replace(/_/g, " ")}
              {proyecto.progresoPorcentaje != null
                ? ` · ${proyecto.progresoPorcentaje}% avance`
                : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-ruralia-teal-soft px-3 py-1 text-xs font-medium text-ruralia-teal-text">
            {etiquetaEstado(proyecto.estado)}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface AvisoDatosMockProps {
  activo: boolean;
}

/** Banner visible mientras se usen datos de demostración. */
export function AvisoDatosMock({ activo }: AvisoDatosMockProps) {
  if (!activo) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Modo demostración — datos mock</p>
      <p className="mt-1 text-xs leading-relaxed opacity-90">
        Los indicadores, gráficas y mapas usan datos de prueba
      </p>
    </div>
  );
}
