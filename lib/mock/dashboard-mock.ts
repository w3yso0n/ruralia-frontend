/**
 * =============================================================================
 * DATOS MOCK — DASHBOARD PRINCIPAL
 * =============================================================================
 *
 * ⚠️  DEMO CORPORATIVA — borrar cuando conectes datos reales:
 *       - lib/mock/dashboard-mock.ts
 *       - docs/DASHBOARD-MOCK-DATA.md
 *
 * Documentación y mapeo al backend → docs/DASHBOARD-MOCK-DATA.md
 *
 * TODAS las métricas aquí están diseñadas para calcularse con el modelo
 * actual (sin campos nuevos obligatorios). Ver comentarios por sección.
 * =============================================================================
 */

import type { EstadoProyecto, KpisDashboard, Proyecto, TipoProyecto } from "@/lib/types";

export const DASHBOARD_USAR_MOCK = true;

// ---------------------------------------------------------------------------
// Tipos alineados al backend actual (ver docs/DASHBOARD-MOCK-DATA.md)
// ---------------------------------------------------------------------------

/**
 * Vereda con proyectos activos para mapa de cobertura.
 * Fuente real: proyecto_veredas + proyectos ACTIVO.
 * Coordenadas: AVG(jornadas.latitud/longitud) por vereda
 *   (igual que GET /reportes/proyecto/:id/mapa-calor).
 * No requiere lat/lng en tabla veredas.
 */
export interface MockVeredaCobertura {
  veredaId: string;
  nombre: string;
  municipio: string;
  departamento: string;
  latitud: number;
  longitud: number;
  proyectosActivos: Array<{
    proyectoId: string;
    nombre: string;
    estado: EstadoProyecto;
    progresoPorcentaje: number;
    beneficiarios: number;
  }>;
}

/**
 * Punto de jornada georreferenciada en mapa de seguimiento.
 * Fuente real: Jornada (latitud, longitud, fecha, estado, observaciones).
 */
export interface MockJornadaGeoref {
  /** → Jornada.id */
  jornadaId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  /** → Jornada.estado mapeado visualmente */
  estado: "COMPLETADA" | "EN_PROGRESO" | "PLANIFICADA";
  fecha?: string;
  descripcion: string;
}

/**
 * Secuencia cronológica de jornadas georreferenciadas de un proyecto.
 * Fuente real: GET /jornadas?proyectoId=X ordenadas por fecha ASC,
 * filtradas donde latitud IS NOT NULL.
 */
export interface MockSeguimientoCampo {
  proyectoId: string;
  nombreProyecto: string;
  jornadas: MockJornadaGeoref[];
  /** % jornadas COMPLETADA / total con geo */
  progresoAvancePorcentaje: number;
}

/** Serie mensual agregada. Fuente: GROUP BY mes sobre jornadas, envios_formulario. */
export interface MockSerieMensual {
  mes: string;
  jornadas: number;
  formularios: number;
  beneficiariosAtendidos: number;
}

/**
 * Progreso por proyecto.
 * Fuente: GET /proyectos → progresoPorcentaje + conteoBeneficiarios.
 */
export interface MockProgresoProyecto {
  proyectoId: string;
  nombre: string;
  tipo: TipoProyecto;
  progresoPorcentaje: number;
  conteoBeneficiarios: number;
}

/** Jornada reciente. Fuente: GET /jornadas?limite=5 (fecha DESC). */
export interface MockJornadaReciente {
  id: string;
  proyectoNombre: string;
  veredaNombre: string;
  tecnico: string;
  estado: "COMPLETADA" | "EN_PROGRESO" | "PLANIFICADA";
  fecha: string;
}

/**
 * Medidores calculables con SQL sobre datos existentes.
 * Futuro: GET /dashboard/cumplimiento (1 servicio, sin schema nuevo).
 */
export interface MockMedidoresCumplimiento {
  /** AVG(proyecto.progresoPorcentaje) WHERE estado = ACTIVO */
  cumplimientoPlan: number;
  /** veredas con ≥1 jornada / veredas en proyectos ACTIVO */
  coberturaTerritorial: number;
  /** jornadas COMPLETADA con evidencia FOTO / jornadas COMPLETADA */
  jornadasConEvidencia: number;
  /** COUNT jornadas WHERE fecha en mes actual */
  jornadasMesActual: number;
}

export interface MockDashboardCompleto {
  kpis: KpisDashboard;
  medidores: MockMedidoresCumplimiento;
  actividadMensual: MockSerieMensual[];
  progresoProyectos: MockProgresoProyecto[];
  veredasCobertura: MockVeredaCobertura[];
  seguimientoDestacado: MockSeguimientoCampo;
  jornadasRecientes: MockJornadaReciente[];
}

// ---------------------------------------------------------------------------
// Datos de prueba — Antioquia, Colombia
// ---------------------------------------------------------------------------

const PROYECTOS_MOCK: Proyecto[] = [
  {
    id: "mock-proy-001",
    nombre: "Huertas familiares — Oriente antioqueño",
    tipo: "AGRICOLA",
    estado: "ACTIVO",
    progresoPorcentaje: 72,
    conteoBeneficiarios: 48,
    creadoEn: "2025-11-01T08:00:00Z",
    actualizadoEn: "2026-07-01T10:00:00Z",
  },
  {
    id: "mock-proy-002",
    nombre: "Restauración de cuencas — Nordeste",
    tipo: "AMBIENTAL",
    estado: "ACTIVO",
    progresoPorcentaje: 58,
    conteoBeneficiarios: 120,
    creadoEn: "2026-01-15T08:00:00Z",
    actualizadoEn: "2026-06-28T14:00:00Z",
  },
  {
    id: "mock-proy-003",
    nombre: "Ruta agroecoturística veredal",
    tipo: "TURISMO",
    estado: "ACTIVO",
    progresoPorcentaje: 41,
    conteoBeneficiarios: 32,
    creadoEn: "2026-03-01T08:00:00Z",
    actualizadoEn: "2026-07-05T09:00:00Z",
  },
  {
    id: "mock-proy-004",
    nombre: "Fortalecimiento ASOAGRO Sur",
    tipo: "AGRICOLA",
    estado: "ACTIVO",
    progresoPorcentaje: 85,
    conteoBeneficiarios: 65,
    creadoEn: "2025-08-10T08:00:00Z",
    actualizadoEn: "2026-07-07T11:00:00Z",
  },
];

export const MOCK_DASHBOARD: MockDashboardCompleto = {
  kpis: {
    proyectosActivos: 4,
    totalProyectos: 12,
    jornadasRegistradas: 186,
    indicadoresMonitoreados: 24,
    proyectosRecientes: PROYECTOS_MOCK,
  },

  medidores: {
    cumplimientoPlan: 64,
    coberturaTerritorial: 67,
    jornadasConEvidencia: 87,
    jornadasMesActual: 34,
  },

  actividadMensual: [
    { mes: "Feb", jornadas: 18, formularios: 42, beneficiariosAtendidos: 95 },
    { mes: "Mar", jornadas: 22, formularios: 51, beneficiariosAtendidos: 110 },
    { mes: "Abr", jornadas: 28, formularios: 63, beneficiariosAtendidos: 128 },
    { mes: "May", jornadas: 31, formularios: 70, beneficiariosAtendidos: 142 },
    { mes: "Jun", jornadas: 35, formularios: 78, beneficiariosAtendidos: 156 },
    { mes: "Jul", jornadas: 34, formularios: 74, beneficiariosAtendidos: 149 },
  ],

  progresoProyectos: PROYECTOS_MOCK.map((p) => ({
    proyectoId: p.id,
    nombre: p.nombre.split(" — ")[0] ?? p.nombre,
    tipo: p.tipo,
    progresoPorcentaje: p.progresoPorcentaje ?? 0,
    conteoBeneficiarios: p.conteoBeneficiarios ?? 0,
  })),

  veredasCobertura: [
    {
      veredaId: "mock-vereda-001",
      nombre: "La Clarita",
      municipio: "Marinilla",
      departamento: "Antioquia",
      latitud: 6.1742,
      longitud: -75.3368,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-001",
          nombre: "Huertas familiares",
          estado: "ACTIVO",
          progresoPorcentaje: 72,
          beneficiarios: 22,
        },
      ],
    },
    {
      veredaId: "mock-vereda-002",
      nombre: "El Retiro",
      municipio: "El Retiro",
      departamento: "Antioquia",
      latitud: 6.0586,
      longitud: -75.5031,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-003",
          nombre: "Ruta agroecoturística",
          estado: "ACTIVO",
          progresoPorcentaje: 41,
          beneficiarios: 18,
        },
        {
          proyectoId: "mock-proy-004",
          nombre: "Fortalecimiento ASOAGRO Sur",
          estado: "ACTIVO",
          progresoPorcentaje: 85,
          beneficiarios: 30,
        },
      ],
    },
    {
      veredaId: "mock-vereda-003",
      nombre: "San Antonio de Pereira",
      municipio: "Rionegro",
      departamento: "Antioquia",
      latitud: 6.1412,
      longitud: -75.3721,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-002",
          nombre: "Restauración de cuencas",
          estado: "ACTIVO",
          progresoPorcentaje: 58,
          beneficiarios: 45,
        },
      ],
    },
    {
      veredaId: "mock-vereda-004",
      nombre: "Piedras Blancas",
      municipio: "Guarne",
      departamento: "Antioquia",
      latitud: 6.2814,
      longitud: -75.4489,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-002",
          nombre: "Restauración de cuencas",
          estado: "ACTIVO",
          progresoPorcentaje: 58,
          beneficiarios: 38,
        },
      ],
    },
    {
      veredaId: "mock-vereda-005",
      nombre: "Santa Elena",
      municipio: "Medellín",
      departamento: "Antioquia",
      latitud: 6.2341,
      longitud: -75.5054,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-001",
          nombre: "Huertas familiares",
          estado: "ACTIVO",
          progresoPorcentaje: 72,
          beneficiarios: 26,
        },
      ],
    },
    {
      veredaId: "mock-vereda-006",
      nombre: "La Ceja Alta",
      municipio: "La Ceja",
      departamento: "Antioquia",
      latitud: 6.0308,
      longitud: -75.4312,
      proyectosActivos: [
        {
          proyectoId: "mock-proy-004",
          nombre: "Fortalecimiento ASOAGRO Sur",
          estado: "ACTIVO",
          progresoPorcentaje: 85,
          beneficiarios: 35,
        },
      ],
    },
  ],

  /** Jornadas georreferenciadas del proyecto mock-proy-001, orden cronológico. */
  seguimientoDestacado: {
    proyectoId: "mock-proy-001",
    nombreProyecto: "Huertas familiares — Oriente antioqueño",
    progresoAvancePorcentaje: 60,
    jornadas: [
      {
        jornadaId: "jor-mock-001",
        nombre: "Diagnóstico inicial",
        latitud: 6.1552,
        longitud: -75.3738,
        estado: "COMPLETADA",
        fecha: "2026-05-12",
        descripcion: "Levantamiento con líderes veredales — Rionegro",
      },
      {
        jornadaId: "jor-mock-002",
        nombre: "Entrega de insumos",
        latitud: 6.1621,
        longitud: -75.361,
        estado: "COMPLETADA",
        fecha: "2026-05-28",
        descripcion: "Kits agrícolas y registro fotográfico",
      },
      {
        jornadaId: "jor-mock-003",
        nombre: "Monitoreo de siembra",
        latitud: 6.1685,
        longitud: -75.3492,
        estado: "COMPLETADA",
        fecha: "2026-06-15",
        descripcion: "Georreferenciación de parcelas",
      },
      {
        jornadaId: "jor-mock-004",
        nombre: "Prueba de campo",
        latitud: 6.1718,
        longitud: -75.3425,
        estado: "EN_PROGRESO",
        fecha: "2026-07-08",
        descripcion: "Formularios y evidencia en Vereda La Clarita",
      },
      {
        jornadaId: "jor-mock-005",
        nombre: "Validación final",
        latitud: 6.1742,
        longitud: -75.3368,
        estado: "PLANIFICADA",
        descripcion: "Cierre de indicadores de impacto",
      },
    ],
  },

  jornadasRecientes: [
    {
      id: "jor-001",
      proyectoNombre: "Huertas familiares — Oriente",
      veredaNombre: "La Clarita",
      tecnico: "Ana María López",
      estado: "EN_PROGRESO",
      fecha: "2026-07-08",
    },
    {
      id: "jor-002",
      proyectoNombre: "Restauración de cuencas",
      veredaNombre: "Piedras Blancas",
      tecnico: "Carlos Ruiz",
      estado: "COMPLETADA",
      fecha: "2026-07-07",
    },
    {
      id: "jor-003",
      proyectoNombre: "Ruta agroecoturística",
      veredaNombre: "El Retiro",
      tecnico: "Laura Gómez",
      estado: "COMPLETADA",
      fecha: "2026-07-06",
    },
    {
      id: "jor-004",
      proyectoNombre: "Fortalecimiento ASOAGRO Sur",
      veredaNombre: "La Ceja Alta",
      tecnico: "Diego Herrera",
      estado: "PLANIFICADA",
      fecha: "2026-07-10",
    },
    {
      id: "jor-005",
      proyectoNombre: "Huertas familiares — Oriente",
      veredaNombre: "Santa Elena",
      tecnico: "Ana María López",
      estado: "COMPLETADA",
      fecha: "2026-07-04",
    },
  ],
};
